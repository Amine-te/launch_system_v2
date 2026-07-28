from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AuditEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    actor_name: str
    module: str
    action: str
    entity_type: str | None
    entity_id: str | None
    project: str | None
    po: str | None
    details: str
    created_at: datetime
