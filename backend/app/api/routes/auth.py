"""
/auth/* endpoints.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.security import create_access_token, verify_password
from app.db.session import get_db
from app.models.login_event import LoginEvent, LoginResult
from app.models.user import MAX_FAILED_LOGIN_ATTEMPTS, User
from app.schemas.auth import LoginRequest, Token
from app.schemas.user import UserOut

router = APIRouter()


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else ""


def _log(db: Session, *, username: str, result: LoginResult, reason: str, ip: str) -> None:
    """SRS M00-FR-13: every login attempt, successful or failed, gets an
    entry. Called right before the commit that goes with it so a logged
    event and its outcome are never out of sync."""
    db.add(LoginEvent(username=username, result=result, reason=reason, source_ip=ip))


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> Token:
    ip = _client_ip(request)
    user = db.scalar(select(User).where(User.email == payload.email))

    # Unknown email: same generic error as a wrong password (don't reveal
    # whether the address exists), and nothing to log against a real
    # account -- there's no user row to attach an attempt count to.
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    # SRS M00-FR-12/M00-AC-04: once locked, further attempts are rejected
    # outright -- correct password or not -- until the System Administrator
    # unlocks the account. Checked before verifying the password so a
    # locked account never "almost" succeeds.
    if user.is_locked:
        _log(db, username=user.email, result=LoginResult.failed, reason="Account locked", ip=ip)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is locked after too many failed attempts. Contact your System Administrator.",
        )

    if not verify_password(payload.password, user.hashed_password):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= MAX_FAILED_LOGIN_ATTEMPTS:
            user.locked_at = datetime.now(timezone.utc)
            _log(
                db, username=user.email, result=LoginResult.failed,
                reason=f"Account locked after {MAX_FAILED_LOGIN_ATTEMPTS} failed attempts", ip=ip,
            )
        else:
            _log(
                db, username=user.email, result=LoginResult.failed,
                reason=f"Incorrect password -- attempt {user.failed_login_attempts} of {MAX_FAILED_LOGIN_ATTEMPTS}",
                ip=ip,
            )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    # SRS M00-AC-02: deactivated accounts get a clear access-denied message,
    # not the generic wrong-password one -- the credentials are correct,
    # the account just isn't allowed to authenticate anymore. Not counted
    # as a failed attempt (it's not a bad-credentials guess).
    if not user.is_active:
        _log(db, username=user.email, result=LoginResult.failed, reason="Account deactivated", ip=ip)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Contact your System Administrator.",
        )

    user.failed_login_attempts = 0
    user.last_login_at = datetime.now(timezone.utc)
    _log(db, username=user.email, result=LoginResult.success, reason="Authenticated", ip=ip)
    db.commit()

    token = create_access_token(subject=str(user.id))
    return Token(access_token=token)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
