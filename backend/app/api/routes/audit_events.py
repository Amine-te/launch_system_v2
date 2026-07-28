"""
/audit-events -- System Administrator only, for now.

This is a plain viewer (same shape as /users/login-events), not the real
M12 (Audit and Traceability) surface -- M12 (roadmap Step 11) is what
actually assembles a project audit *document* from this table plus every
other module's records. This endpoint exists now so audit_events has a
way to be inspected/tested as soon as anything writes to it (starting with
this step's project create/update/delete), rather than being a write-only
table until Step 11.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.db.session import get_db
from app.models.audit_event import AuditEvent
from app.models.user import UserRole
from app.schemas.audit_event import AuditEventOut

router = APIRouter(dependencies=[Depends(require_role(UserRole.admin))])


@router.get("", response_model=list[AuditEventOut])
def list_audit_events(db: Session = Depends(get_db)) -> list[AuditEvent]:
    return list(db.scalars(select(AuditEvent).order_by(AuditEvent.created_at.desc()).limit(500)))
