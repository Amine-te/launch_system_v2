"""
Single place that writes to audit_events, so every module's routes call
one small helper instead of constructing an AuditEvent row by hand
(keeping the column list and the "snapshot the actor's name" rule in sync
automatically). Mirrors why core/security.py exists for password/JWT
handling -- one seam, not one copy-pasted per module.

Callers are responsible for committing (same convention as routes/auth.py's
_log() helper for login_events) -- this only stages the row via db.add(),
so it can be written in the same transaction as the change it's describing.
"""
from sqlalchemy.orm import Session

from app.models.audit_event import AuditEvent
from app.models.user import User


def log_audit_event(
    db: Session,
    *,
    actor: User,
    module: str,
    action: str,
    entity_type: str | None = None,
    entity_id: str | None = None,
    project: str | None = None,
    po: str | None = None,
    details: str = "",
) -> None:
    db.add(
        AuditEvent(
            actor_id=actor.id,
            actor_name=actor.full_name,
            module=module,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            project=project,
            po=po,
            details=details,
        )
    )
