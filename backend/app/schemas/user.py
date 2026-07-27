"""
Pydantic shapes for user data -- both the "who am I" response used by
/auth/me and the admin-facing shapes used by /users/*.
"""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import UserRole


class UserOut(BaseModel):
    """What comes back for a single user, everywhere a user is returned
    (GET/POST /users, PATCH /users/{id}/*, and /auth/me)."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime
    # SRS M00-FR-12/M00-AC-04 (lockout) and M00-FR-13 (last login, in
    # spirit -- the audit log itself lives in /users/login-events).
    # is_locked reads User.is_locked, a Python property (locked_at is not
    # None) -- from_attributes=True is fine with that, it's just getattr.
    failed_login_attempts: int
    is_locked: bool
    last_login_at: datetime | None


class UserCreate(BaseModel):
    """POST /users body -- admin-only. There's no self-registration
    endpoint (per SRS M00-FR-01: only the System Administrator creates
    accounts), so this is the only way a user gets created outside of
    scripts/seed_demo_users.py and scripts/create_user.py."""

    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1, max_length=255)
    role: UserRole


class UserUpdate(BaseModel):
    """PATCH /users/{id} body -- admin-only. Deliberately just the two
    editable identity fields (full name, email); role and active/locked
    status each have their own dedicated endpoint (change_role,
    (de)activate_user, unlock_user) so those stay independently auditable
    actions rather than fields that can be silently changed alongside a
    name edit. Both fields optional so the admin can update just one."""

    email: EmailStr | None = None
    full_name: str | None = Field(default=None, min_length=1, max_length=255)


class UserRoleUpdate(BaseModel):
    """PATCH /users/{id}/role body. A dedicated single-field schema rather
    than a generic partial-update shape -- role changes are a distinct,
    audit-worthy action (SRS M00-FR-06), not just another field edit."""

    role: UserRole
