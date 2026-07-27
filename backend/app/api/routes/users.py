"""
/users/* endpoints -- account management (SRS M00), System Administrator
only. Every route here is gated by require_role(UserRole.admin) at the
router level, so no individual endpoint can accidentally be left
unprotected.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.core.security import get_password_hash
from app.db.session import get_db
from app.models.login_event import LoginEvent
from app.models.user import User, UserRole
from app.schemas.login_event import LoginEventOut
from app.schemas.user import UserCreate, UserOut, UserRoleUpdate, UserUpdate

router = APIRouter(dependencies=[Depends(require_role(UserRole.admin))])


@router.get("/login-events", response_model=list[LoginEventOut])
def list_login_events(db: Session = Depends(get_db)) -> list[LoginEvent]:
    """SRS M00-FR-13: the login audit log, admin-only per M00.9. Newest
    first, capped at 500 -- this backs the frontend's System Activity page
    and is a viewer, not an export, so an unbounded scan isn't needed."""
    return list(
        db.scalars(select(LoginEvent).order_by(LoginEvent.created_at.desc()).limit(500))
    )


@router.get("", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db)) -> list[User]:
    """All accounts, active and deactivated alike -- deactivated accounts
    are never deleted (SRS M00-FR-04/M00.7), so they still need to show up
    here for the admin to review or reactivate."""
    return list(db.scalars(select(User).order_by(User.created_at)))


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(get_db)) -> User:
    """SRS M00-FR-01/02/03: create an account with a role and (implicitly,
    via the model default) active status. There's no self-registration
    endpoint -- this is the only way an account gets created through the
    API; scripts/create_user.py and scripts/seed_demo_users.py remain the
    CLI equivalents for local dev."""
    user = User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name,
        role=payload.role,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A user with email {payload.email} already exists.",
        )
    db.refresh(user)
    return user


def _get_user_or_404(user_id: int, db: Session) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found."
        )
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(user_id: int, payload: UserUpdate, db: Session = Depends(get_db)) -> User:
    """Edit the two identity fields the create form also collects (full
    name, email). Role, active status, and lock status each stay on their
    own dedicated endpoint below -- see UserUpdate's docstring."""
    user = _get_user_or_404(user_id, db)
    data = payload.model_dump(exclude_unset=True)
    if "full_name" in data:
        user.full_name = data["full_name"]
    if "email" in data:
        user.email = data["email"]
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A user with email {data.get('email')} already exists.",
        )
    db.refresh(user)
    return user


@router.patch("/{user_id}/role", response_model=UserOut)
def change_role(user_id: int, payload: UserRoleUpdate, db: Session = Depends(get_db)) -> User:
    """SRS M00-FR-06 + M00.6 BP: a role change replaces the old role
    outright -- there's a single `role` column, not an additive set, so
    old permissions are never inherited alongside the new ones."""
    user = _get_user_or_404(user_id, db)
    user.role = payload.role
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}/deactivate", response_model=UserOut)
def deactivate_user(
    user_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.admin))
) -> User:
    """SRS M00-FR-04: deactivate, never delete -- preserves the audit
    trail of past actions under this account. Blocks self-deactivation as
    a safety rail (not in the SRS, but a locked-out-admin-with-no-admin-
    left-to-unlock-them scenario is worth avoiding regardless)."""
    user = _get_user_or_404(user_id, db)
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account.",
        )
    user.is_active = False
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}/reactivate", response_model=UserOut)
def reactivate_user(user_id: int, db: Session = Depends(get_db)) -> User:
    """SRS M00-FR-05: the other half of deactivate -- kept as a separate,
    explicit endpoint (not a generic PATCH /users/{id} with is_active in
    the body) so both actions stay independently auditable and neither
    one doubles as a backdoor for changing other fields."""
    user = _get_user_or_404(user_id, db)
    user.is_active = True
    db.commit()
    db.refresh(user)
    return user


@router.patch("/{user_id}/unlock", response_model=UserOut)
def unlock_user(user_id: int, db: Session = Depends(get_db)) -> User:
    """SRS M00-FR-12/M00-AC-04: 'Only the System Administrator shall be
    able to unlock it.' The router-level require_role(admin) dependency
    already guarantees that; this just clears the lock and resets the
    counter so the next login attempt starts a fresh count of 5."""
    user = _get_user_or_404(user_id, db)
    user.failed_login_attempts = 0
    user.locked_at = None
    db.commit()
    db.refresh(user)
    return user
