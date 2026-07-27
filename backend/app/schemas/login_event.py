from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.login_event import LoginResult


class LoginEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    result: LoginResult
    reason: str
    source_ip: str
    created_at: datetime
