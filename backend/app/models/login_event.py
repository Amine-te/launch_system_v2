"""
Login audit log -- SRS M00-FR-13: "The system shall maintain a log of all
login events (successful and failed) including timestamp and username."

Deliberately its own table, not a column on User: a user can be deleted-
in-spirit (deactivated) but the log has to keep entries for attempts made
against emails that may not even correspond to a real account anymore
(e.g. a series of failed guesses), so it stores the attempted username as
plain text rather than a foreign key.
"""
import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class LoginResult(str, enum.Enum):
    success = "success"
    failed = "failed"


class LoginEvent(Base):
    __tablename__ = "login_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    # The email/username as typed at the login form -- stored even when it
    # doesn't match any account, since a run of attempts against an unknown
    # address is itself worth auditing.
    username: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    result: Mapped[LoginResult] = mapped_column(
        Enum(LoginResult, name="login_result"), nullable=False
    )
    # Short human-readable reason: "Authenticated", "Incorrect password --
    # attempt 3 of 5", "Account locked after 5 failed attempts", "Account
    # deactivated", etc. Free text rather than another enum -- the reasons
    # are for a human reading the audit log, not for the app to branch on.
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
    source_ip: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
