"""
User table -- the first real model.

Deliberately minimal per the current step (id, email, hashed_password,
role, created_at). The richer draft schema in db_draft/db_draft.dbml has a
fuller IAM design (UUID keys, a separate roles/permissions table, session
tracking, etc.) -- this can grow toward that later; for now it's exactly
what the login endpoint needs.
"""
import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

# SRS M00-FR-12 / M00-AC-04: 5 consecutive failed login attempts locks the
# account. Kept here (not buried in routes/auth.py) so the model and the
# route that enforces it can't drift apart.
MAX_FAILED_LOGIN_ATTEMPTS = 5


class UserRole(str, enum.Enum):
    """Mirrors the roles already used by the frontend's account switcher
    (frontend/js/components/account-switcher.js), so a real user's role
    maps straight onto the existing UI with no translation layer."""

    engineer = "engineer"
    manager = "manager"
    plant = "plant"
    wh_lead = "wh_lead"
    wh_staff = "wh_staff"
    prod_coord = "prod_coord"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    # SRS M00-FR-02: every account has at minimum a full name, username
    # (email, here), role, and active/inactive status.
    full_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role"), nullable=False)
    # SRS M00-FR-04/05: deactivating/reactivating an account, not deleting
    # it -- past actions under this account must stay attributable, so the
    # row is never removed, just locked out of authenticating (see
    # api/deps.get_current_user and routes/auth.login, both of which check
    # this on every request/login, not just at token-issue time).
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # SRS M00-FR-12/M00-AC-04: consecutive failed attempts since the last
    # successful login (or since the account was last unlocked). Reset to 0
    # on a successful login -- see routes/auth.py:login. Not reset when the
    # correct password is entered on a deactivated account, since that's a
    # different failure mode (see M00-AC-02), not a bad-credentials attempt.
    failed_login_attempts: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    # NULL == not locked. Set the instant failed_login_attempts reaches
    # MAX_FAILED_LOGIN_ATTEMPTS; only routes/users.py's unlock_user (System
    # Administrator only, per FR-12) clears it.
    locked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )

    @property
    def is_locked(self) -> bool:
        return self.locked_at is not None
