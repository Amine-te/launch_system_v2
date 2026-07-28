"""
General-purpose audit log (roadmap Step 0, folded into Step 1).

Mirrors login_events' reasoning: an append-only table every future module
writes to, so a growing action history doesn't need a new logging
mechanism invented per-module. Replaces the frontend's AUDIT_LOGS mock
(data/mock-data.js) for whatever this step actually writes to it (project
create/update/delete) -- AUDIT_LOGS itself stays in place for every other
module that still writes to it locally (POs, BOM, deliveries, etc. --
none of those are backed by a real table yet), and gets fully retired in
Step 11 (M12) once every module that feeds it is real.

Deliberately generic (module/action/entity/project/po/details) rather than
a rigid per-module shape, since the fields it needs to hold are defined by
each *caller* (app/core/audit.py's log_audit_event), not by this table --
new modules just pass more/different `details` text, they never need a
schema change here.
"""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Nullable in principle (a future system-triggered event might have no
    # human actor), but every caller today always has a real current_user
    # to pass. FK, not cascade-deleted -- users are deactivated, never
    # deleted (see User's docstring), so this FK never dangles in practice.
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    # Snapshot of the actor's name at the time of the event, same reasoning
    # as LoginEvent.username: a later name change shouldn't rewrite history.
    actor_name: Mapped[str] = mapped_column(String(255), nullable=False)
    module: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(255), nullable=False)
    entity_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    entity_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    project: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    po: Mapped[str | None] = mapped_column(String(100), nullable=True)
    details: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
