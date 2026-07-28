"""
/projects/* endpoints -- SRS M01 (Project Management).

Role rules (SRS M01.5 + M01-FR-05/06/07):
  - Launch Engineer: read + write only projects they're assigned to
    (M01-FR-06/M01-AC-01) -- their GET /projects list is simply smaller,
    not a 403; a single project outside their assignment 404s (not 403)
    so a Launch Engineer can't even confirm a given project id exists
    outside their scope.
  - Launch Manager: read all, write only projects assigned to them
    (M01-FR-07).
  - Plant Manager: read all, no write at all (M01-FR-05).
  - Every other role (System Administrator, Warehouse Team Leader,
    Warehouse Personnel, Production & Packing Coordinator) isn't in
    M01.5's table at all. We still grant them read access here: several
    already-shipped pages (materials-stock.js, po-intake.js,
    purchase-orders.js, simulation.js, manufacturing-delivery.js,
    customer-delivery.js, parts-bom.js, dashboards.js, breadcrumb.js,
    nav-render.js) resolve a project by name/id for basic navigation and
    still run on mock PO/BOM/stock/delivery data regardless of role --
    M01.5's table was about restricting the *project list/write* actions
    specifically, not about hiding project *names* from every other
    module in the app. Write access for these roles is still flatly
    denied below (require_role on every mutating endpoint). See db.md for
    this reasoning written out in full.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_role
from app.core.audit import log_audit_event
from app.db.session import get_db
from app.models.project import AssignmentRole, Project, ProjectAssignment
from app.models.user import User, UserRole
from app.schemas.project import (
    AssignableEngineerOut,
    ProjectCreate,
    ProjectOut,
    ProjectUpdate,
)

router = APIRouter()


# ---- shared helpers --------------------------------------------------------

def _can_write(user: User, project: Project, db: Session) -> bool:
    """SRS M01-FR-02/06/07: write access is exactly "does this user have a
    project_assignments row for this project, in the role matching their
    own account role". Plant Manager, System Administrator, and every
    other role never gets a row of either kind, so this is always False
    for them -- no special-case needed."""
    if user.role not in (UserRole.engineer, UserRole.manager):
        return False
    assignment_role = AssignmentRole.engineer if user.role == UserRole.engineer else AssignmentRole.manager
    return (
        db.scalar(
            select(ProjectAssignment).where(
                ProjectAssignment.project_id == project.id,
                ProjectAssignment.user_id == user.id,
                ProjectAssignment.role == assignment_role,
            )
        )
        is not None
    )


def _decorate(project: Project, user: User, db: Session) -> Project:
    """Sets the two response fields that aren't real columns (see
    ProjectOut's docstring) directly onto the ORM instance before
    from_attributes reads them back out."""
    project.can_write = _can_write(user, project, db)
    project.owner_name = project.owner.full_name if project.owner else ""
    return project


def _get_project_or_404(project_id: int, db: Session) -> Project:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    return project


def _assert_read_access(user: User, project: Project, db: Session) -> None:
    """M01-FR-06/M01-AC-01: a Launch Engineer only ever sees projects
    they're assigned to -- 404, not 403, so a direct GET by id can't be
    used to confirm a project outside their assignment even exists."""
    if user.role != UserRole.engineer:
        return
    assigned = db.scalar(
        select(ProjectAssignment).where(
            ProjectAssignment.project_id == project.id,
            ProjectAssignment.user_id == user.id,
            ProjectAssignment.role == AssignmentRole.engineer,
        )
    )
    if assigned is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")


def _assert_write_access(user: User, project: Project, db: Session) -> None:
    if not _can_write(user, project, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have write access to this project.",
        )


def _project_has_purchase_orders(project_id: int, db: Session) -> bool:
    """SRS M01-AC-05: 'Given a project that has associated purchase
    orders ... the system prevents deletion and displays an explanatory
    message.' There is no `purchase_orders` table yet -- that's SRS M03,
    Step 3 of the roadmap -- so this always returns False today. This is
    the same honest simplification as reference_entries' delete endpoint
    (routes/reference_entries.py's delete_reference_entry docstring):
    once purchase_orders exists, replace the `return False` below with a
    real `select(func.count()).select_from(PurchaseOrder).where(
    PurchaseOrder.project_id == project_id)` check."""
    return False


# ---- routes -----------------------------------------------------------------

@router.get("", response_model=list[ProjectOut])
def list_projects(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
) -> list[Project]:
    """SRS M01-FR-04: the project monitoring view. M01-AC-01 for Launch
    Engineers: only their assigned projects come back at all."""
    query = select(Project)
    if current_user.role == UserRole.engineer:
        query = query.join(
            ProjectAssignment, ProjectAssignment.project_id == Project.id
        ).where(
            ProjectAssignment.user_id == current_user.id,
            ProjectAssignment.role == AssignmentRole.engineer,
        )
    projects = list(db.scalars(query.order_by(Project.created_at)))
    return [_decorate(project, current_user, db) for project in projects]


@router.get("/assignable-engineers", response_model=list[AssignableEngineerOut])
def list_assignable_engineers(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.manager, UserRole.admin)),
) -> list[User]:
    """Backs the project form's Launch Engineer picker. Only a Launch
    Manager can actually edit that field on the form (see
    pages/projects.js's engineerLocked) -- System Administrator is also
    allowed to call this since Admin's Project Assignments page
    (pages/admin.js) needs the same eligible-engineer list. Deliberately
    NOT the full /users list (admin-only, and returns far more than a
    name+id) -- a Launch Manager isn't an administrator."""
    return list(
        db.scalars(
            select(User)
            .where(User.role == UserRole.engineer, User.is_active == True)  # noqa: E712
            .order_by(User.full_name)
        )
    )


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(
    project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
) -> Project:
    project = _get_project_or_404(project_id, db)
    _assert_read_access(current_user, project, db)
    return _decorate(project, current_user, db)


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.engineer, UserRole.manager)),
) -> Project:
    """SRS M01-FR-01: only a Launch Engineer or Launch Manager can create a
    project (M01.5's Create row), and it's automatically "their own"
    (M01-FR-02/07) -- the creator is assigned immediately, not left to a
    separate follow-up admin action."""
    owner = db.get(User, payload.owner_user_id)
    if owner is None or owner.role != UserRole.engineer:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="owner_user_id must be an existing Launch Engineer.",
        )
    if db.scalar(select(Project).where(func.lower(Project.name) == payload.name.strip().lower())):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A project named {payload.name} already exists.",
        )

    project = Project(
        name=payload.name.strip(),
        customer=payload.customer.strip(),
        customer_ref=payload.customer_ref,
        owner_user_id=owner.id,
        site=payload.site,
        description=payload.description,
        status=payload.status,
        start_date=payload.start_date,
        target_date=payload.target_date,
    )
    db.add(project)
    db.flush()  # project.id is needed below, before commit

    db.add(ProjectAssignment(project_id=project.id, user_id=owner.id, role=AssignmentRole.engineer))
    if current_user.role == UserRole.manager:
        db.add(
            ProjectAssignment(project_id=project.id, user_id=current_user.id, role=AssignmentRole.manager)
        )

    log_audit_event(
        db, actor=current_user, module="Projects", action="Project created",
        entity_type="project", entity_id=str(project.id), project=project.name,
        details=f"New project created for {project.customer}; assigned Launch Engineer {owner.full_name}.",
    )
    db.commit()
    db.refresh(project)
    return _decorate(project, current_user, db)


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.engineer, UserRole.manager)),
) -> Project:
    project = _get_project_or_404(project_id, db)
    _assert_write_access(current_user, project, db)
    data = payload.model_dump(exclude_unset=True)

    # Mirrors the frontend's identityLocked rule (pages/projects.js):
    # name/customer become read-only once a purchase order references the
    # project. Enforced here too, not just hidden in the UI -- see the
    # "always False today" note on _project_has_purchase_orders.
    identity_locked = _project_has_purchase_orders(project_id, db)

    changes: list[str] = []
    plain_fields = ("customer_ref", "site", "description", "status", "start_date", "target_date")
    locked_fields = ("name", "customer")
    for field in locked_fields + plain_fields:
        if field not in data:
            continue
        if field in locked_fields and identity_locked:
            continue
        old_value = getattr(project, field)
        new_value = data[field]
        if str(old_value or "") != str(new_value or ""):
            changes.append(f"{field}: {old_value or '\u2014'} \u2192 {new_value or '\u2014'}")
        setattr(project, field, new_value)

    # SRS M01-FR-07 in spirit: only a Launch Manager reassigns the
    # engineer -- mirrors the frontend's engineerLocked (only role
    # 'manager' can edit that select), re-checked here so an Engineer
    # can't just send owner_user_id in the PATCH body to hand the project
    # to someone else.
    if "owner_user_id" in data and current_user.role == UserRole.manager:
        new_owner = db.get(User, data["owner_user_id"])
        if new_owner is None or new_owner.role != UserRole.engineer:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="owner_user_id must be an existing Launch Engineer.",
            )
        if new_owner.id != project.owner_user_id:
            old_owner_name = project.owner.full_name if project.owner else "\u2014"
            changes.append(f"engineer: {old_owner_name} \u2192 {new_owner.full_name}")
            old_assignment = db.scalar(
                select(ProjectAssignment).where(
                    ProjectAssignment.project_id == project.id,
                    ProjectAssignment.user_id == project.owner_user_id,
                    ProjectAssignment.role == AssignmentRole.engineer,
                )
            )
            if old_assignment is not None:
                db.delete(old_assignment)
            project.owner_user_id = new_owner.id
            db.flush()
            existing_new_assignment = db.scalar(
                select(ProjectAssignment).where(
                    ProjectAssignment.project_id == project.id,
                    ProjectAssignment.user_id == new_owner.id,
                    ProjectAssignment.role == AssignmentRole.engineer,
                )
            )
            if existing_new_assignment is None:
                db.add(
                    ProjectAssignment(project_id=project.id, user_id=new_owner.id, role=AssignmentRole.engineer)
                )

    log_audit_event(
        db, actor=current_user, module="Projects", action="Project updated",
        entity_type="project", entity_id=str(project.id), project=project.name,
        details=f"Project record updated. {'; '.join(changes) if changes else 'No field value changed.'}",
    )
    db.commit()
    db.refresh(project)
    return _decorate(project, current_user, db)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.engineer, UserRole.manager)),
) -> None:
    project = _get_project_or_404(project_id, db)
    _assert_write_access(current_user, project, db)
    if _project_has_purchase_orders(project_id, db):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"{project.name} has purchase orders linked to it and cannot be deleted. "
                    "Archive or reassign them first (SRS M01-AC-05).",
        )
    log_audit_event(
        db, actor=current_user, module="Projects", action="Project deleted",
        entity_type="project", entity_id=str(project.id), project=project.name,
        details=f"{project.code} ({project.name}) deleted; it had no linked purchase orders.",
    )
    db.delete(project)  # cascades to project_assignments (ondelete=CASCADE)
    db.commit()
