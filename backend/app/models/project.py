"""
Project Management (SRS M01).

Two tables:
- `projects`: the project master record itself.
- `project_assignments`: who has write access to a project, and in what
  capacity (engineer vs manager). This is the "assignment relationship"
  the roadmap asked us to pick a design for -- see db.md for the reasoning.
  It replaces the frontend's local-only ADMIN_ASSIGNMENTS mock (see
  data/mock-data.js / pages/admin.js's project-assignments section)
  everywhere that mock was used for *real* access control; ADMIN_ASSIGNMENTS
  itself is removed once pages/admin.js is wired to the new
  /project-assignments endpoints.

Deliberately NOT a single `engineer` string column with no backing user, the
way the old frontend mock stored it (`engineer: 'A. Rahal'` as free text) --
that can't be checked server-side for M01-FR-06's access restriction.
`Project.owner_user_id` is a real FK to the assigned Launch Engineer (the
project's single "owner", matching M01-FR-02's "the Launch Engineer assigned
to a project"), and every owner automatically gets a matching row in
`project_assignments` (role='engineer') at creation time -- so
`project_assignments` is the *only* place write-access is ever checked,
never a comparison against `owner_user_id` directly. A Launch Manager who
also needs "own" write access (M01-FR-07) gets a second row with
role='manager', added either at project-creation time (if a manager created
it) or later through the admin-only /project-assignments endpoints (the
same page that used to manage ADMIN_ASSIGNMENTS).
"""
import enum
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ProjectStatus(str, enum.Enum):
    # Values match the frontend's project.status strings (see
    # projectStatusType() in pages/projects.js) exactly, so no translation
    # layer is needed between the API and the UI -- same pattern as
    # ReferenceListType.
    draft = "Draft"
    on_track = "On Track"
    at_risk = "At Risk"
    blocked = "Blocked"


class AssignmentRole(str, enum.Enum):
    engineer = "engineer"
    manager = "manager"


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Unique, case-sensitively -- create_project/update_project both do a
    # case-insensitive duplicate check (func.lower comparison) before
    # writing, matching the frontend's old client-side duplicate check in
    # validateProjectForm(). The DB-level unique constraint is still on the
    # raw column as a backstop, not the primary defense (case-insensitive
    # uniqueness isn't expressible as a plain column constraint without a
    # functional index, which felt like overkill for this step).
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    customer: Mapped[str] = mapped_column(String(255), nullable=False)
    # Snapshot of the customer's reference codes (from reference_entries)
    # at the time the customer was selected on the form -- see
    # projectCustomerReference()/setProjectFormCustomer() in
    # pages/projects.js. Deliberately not re-derived live from
    # reference_entries on every read: a project's own record of "what the
    # customer ref was when we picked this customer" shouldn't silently
    # change if an admin edits the reference list entry later.
    customer_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)
    owner_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    site: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[ProjectStatus] = mapped_column(
        Enum(
            ProjectStatus, name="project_status",
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        ),
        nullable=False, default=ProjectStatus.draft,
    )
    # Deliberately NOT storing `progress`/`health` columns here -- the old
    # frontend mock had them as hand-picked numbers with no real source
    # (PROJECTS[0].progress = 72, .health = 88, etc). Per the roadmap
    # ("don't fake fields with no real source"), and since the modules that
    # would make a *real* progress/health figure meaningful (POs, BOM,
    # simulation) don't exist as real tables yet, this step leaves them out
    # entirely rather than persist a fake number. The frontend now computes
    # an honest, derivable stand-in instead (schedule progress from
    # start_date/target_date) -- see data/projects-store.js.
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    target_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    owner = relationship("User", foreign_keys=[owner_user_id])

    @property
    def code(self) -> str:
        """Display-facing id, e.g. 'PRJ-004' -- generated from the real
        primary key instead of the old frontend's client-side
        nextProjectId() (which scanned the in-memory PROJECTS array for the
        highest existing number). Never stored -- always derived, so it can
        never drift out of sync with `id`."""
        return f"PRJ-{self.id:03d}"


class ProjectAssignment(Base):
    __tablename__ = "project_assignments"
    __table_args__ = (
        UniqueConstraint("project_id", "user_id", "role", name="uq_project_assignment"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    role: Mapped[AssignmentRole] = mapped_column(
        Enum(
            AssignmentRole, name="assignment_role",
            values_callable=lambda enum_cls: [member.value for member in enum_cls],
        ),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    project = relationship("Project")
    user = relationship("User")
