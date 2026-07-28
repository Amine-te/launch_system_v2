from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.project import AssignmentRole, ProjectStatus


class ProjectOut(BaseModel):
    """What comes back for a project everywhere one is returned. `code`,
    `owner_name`, and `can_write` are not real columns -- see Project.code
    (a computed property, always in sync with `id`) and the route layer's
    _decorate() helper, which sets `owner_name` (from the owner relationship)
    and `can_write` (computed per the *requesting* user, via
    project_assignments) onto the ORM instance right before it's serialized.
    from_attributes reads them the same as any other attribute either way.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    customer: str
    customer_ref: str | None
    owner_user_id: int
    owner_name: str
    site: str
    description: str
    status: ProjectStatus
    start_date: date | None
    target_date: date | None
    created_at: datetime
    updated_at: datetime
    # Per-request, per-user: whether *this* caller has write access (SRS
    # M01-FR-02/06/07). Computed server-side from project_assignments so
    # the frontend never has to reconstruct the access-control rule
    # itself (see canWriteProject() in components/shared-tables.js, now a
    # thin reader of this flag instead of its own logic).
    can_write: bool


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    customer: str = Field(min_length=1, max_length=255)
    customer_ref: str | None = None
    # The assigned Launch Engineer (SRS M01-FR-02) -- always required, even
    # when a Launch Engineer creates their own project (in that case the
    # frontend just locks the field to themselves and sends their own id;
    # see pages/projects.js's engineerLocked).
    owner_user_id: int
    site: str = ""
    description: str = ""
    status: ProjectStatus = ProjectStatus.draft
    start_date: date | None = None
    target_date: date | None = None


class ProjectUpdate(BaseModel):
    """PATCH body -- every field optional so a save only has to send what
    changed. `owner_user_id` (reassigning the Launch Engineer) is only
    honored when the caller is a Launch Manager -- mirrors the frontend's
    engineerLocked rule, but enforced again server-side in the route
    itself, not just accepted here and silently ignored."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    customer: str | None = Field(default=None, min_length=1, max_length=255)
    customer_ref: str | None = None
    owner_user_id: int | None = None
    site: str | None = None
    description: str | None = None
    status: ProjectStatus | None = None
    start_date: date | None = None
    target_date: date | None = None


class AssignableEngineerOut(BaseModel):
    """Minimal shape for the project form's Launch Engineer picker --
    deliberately not the full UserOut (id/email/role/lock-state/etc) that
    /users returns, since that endpoint is admin-only and this one isn't."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str


class ProjectAssignmentOut(BaseModel):
    """Backs the Admin > Project Assignments page -- replaces the frontend's
    ADMIN_ASSIGNMENTS mock array. project_name/user_full_name/user_email are
    set onto the ORM instance by the route layer from the project/user
    relationships, the same _decorate() pattern as ProjectOut.owner_name."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    project_name: str
    project_code: str
    user_id: int
    user_full_name: str
    user_email: str
    role: AssignmentRole
    created_at: datetime


class ProjectAssignmentCreate(BaseModel):
    project_id: int
    user_id: int
    role: AssignmentRole
