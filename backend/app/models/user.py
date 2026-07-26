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

from sqlalchemy import DateTime, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


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
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="user_role"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
