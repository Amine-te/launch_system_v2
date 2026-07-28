"""
/project-assignments/* -- System Administrator only.

Replaces the frontend's local-only ADMIN_ASSIGNMENTS mock (see
pages/admin.js's project-assignments section, previously documented there
as "not persisted server-side, resets on page reload" -- it now is real).
This is the admin-facing management surface for the same
project_assignments table that app/api/routes/projects.py reads to decide
write access; a row created here is the exact same row that makes a
Launch Engineer/Manager's project writable.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.core.audit import log_audit_event
from app.db.session import get_db
from app.models.project import AssignmentRole, Project, ProjectAssignment
from app.models.user import User, UserRole
from app.schemas.project import ProjectAssignmentCreate, ProjectAssignmentOut

router = APIRouter(dependencies=[Depends(require_role(UserRole.admin))])


def _decorate(assignment: ProjectAssignment) -> ProjectAssignment:
    assignment.project_name = assignment.project.name
    assignment.project_code = assignment.project.code
    assignment.user_full_name = assignment.user.full_name
    assignment.user_email = assignment.user.email
    return assignment


@router.get("", response_model=list[ProjectAssignmentOut])
def list_project_assignments(db: Session = Depends(get_db)) -> list[ProjectAssignment]:
    """Every assignment, across every project -- the frontend groups them
    by project client-side (see data/projects-store.js), the same way
    reference_entries' one-endpoint-for-all-lists pattern works."""
    rows = list(db.scalars(select(ProjectAssignment).order_by(ProjectAssignment.created_at)))
    return [_decorate(row) for row in rows]


@router.post("", response_model=ProjectAssignmentOut, status_code=status.HTTP_201_CREATED)
def create_project_assignment(
    payload: ProjectAssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
) -> ProjectAssignment:
    project = db.get(Project, payload.project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    user = db.get(User, payload.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    expected_role = UserRole.engineer if payload.role == AssignmentRole.engineer else UserRole.manager
    if user.role != expected_role:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{user.full_name} is a {user.role.value}, not a {expected_role.value} -- "
                    "select a user with a matching role for this assignment type.",
        )
    if not user.is_active or user.is_locked:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Select an active, unlocked Launch Engineer or Launch Manager.",
        )
    existing = db.scalar(
        select(ProjectAssignment).where(
            ProjectAssignment.project_id == payload.project_id,
            ProjectAssignment.user_id == payload.user_id,
            ProjectAssignment.role == payload.role,
        )
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"{user.full_name} already has access to {project.name}.",
        )

    assignment = ProjectAssignment(project_id=payload.project_id, user_id=payload.user_id, role=payload.role)
    db.add(assignment)
    log_audit_event(
        db, actor=current_user, module="Administration", action="Project access assigned",
        entity_type="project_assignment", project=project.name,
        details=f"{user.full_name} assigned to {project.name} as {user.role.value}.",
    )
    db.commit()
    db.refresh(assignment)
    return _decorate(assignment)


@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
) -> None:
    assignment = db.get(ProjectAssignment, assignment_id)
    if assignment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found.")
    project_name = assignment.project.name
    user_full_name = assignment.user.full_name
    log_audit_event(
        db, actor=current_user, module="Administration", action="Project access removed",
        entity_type="project_assignment", project=project_name,
        details=f"{user_full_name} immediately lost access to {project_name}; historical actions were retained.",
    )
    db.delete(assignment)
    db.commit()
