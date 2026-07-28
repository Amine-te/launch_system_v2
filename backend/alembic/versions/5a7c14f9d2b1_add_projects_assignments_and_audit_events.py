"""add projects, project_assignments, and audit_events tables

Revision ID: 5a7c14f9d2b1
Revises: 99dfdc4e6e63
Create Date: 2026-07-27 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5a7c14f9d2b1'
down_revision: Union[str, None] = '99dfdc4e6e63'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Matches app.models.project.ProjectStatus / AssignmentRole.
# Same BUGFIX pattern as 2e84584260e8/99dfdc4e6e63: no explicit .create()
# call, no create_type override -- create_table() creates each type
# itself; the explicit .drop() calls in downgrade() are the only place
# either type is handled outside create_table's own default behavior.
project_status_enum = sa.Enum("Draft", "On Track", "At Risk", "Blocked", name="project_status")
assignment_role_enum = sa.Enum("engineer", "manager", name="assignment_role")


def upgrade() -> None:
    op.create_table(
        "projects",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("customer", sa.String(length=255), nullable=False),
        sa.Column("customer_ref", sa.String(length=255), nullable=True),
        sa.Column("owner_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("site", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", project_status_enum, nullable=False, server_default="Draft"),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("target_date", sa.Date(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False,
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False,
        ),
    )
    op.create_index("ix_projects_name", "projects", ["name"], unique=True)

    op.create_table(
        "project_assignments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "project_id", sa.Integer(),
            sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False,
        ),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("role", assignment_role_enum, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False,
        ),
        sa.UniqueConstraint("project_id", "user_id", "role", name="uq_project_assignment"),
    )
    op.create_index("ix_project_assignments_project_id", "project_assignments", ["project_id"])
    op.create_index("ix_project_assignments_user_id", "project_assignments", ["user_id"])

    op.create_table(
        "audit_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("actor_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("actor_name", sa.String(length=255), nullable=False),
        sa.Column("module", sa.String(length=100), nullable=False),
        sa.Column("action", sa.String(length=255), nullable=False),
        sa.Column("entity_type", sa.String(length=100), nullable=True),
        sa.Column("entity_id", sa.String(length=100), nullable=True),
        sa.Column("project", sa.String(length=255), nullable=True),
        sa.Column("po", sa.String(length=100), nullable=True),
        sa.Column("details", sa.Text(), nullable=False, server_default=""),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False,
        ),
    )
    op.create_index("ix_audit_events_module", "audit_events", ["module"])
    op.create_index("ix_audit_events_project", "audit_events", ["project"])
    op.create_index("ix_audit_events_created_at", "audit_events", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_audit_events_created_at", table_name="audit_events")
    op.drop_index("ix_audit_events_project", table_name="audit_events")
    op.drop_index("ix_audit_events_module", table_name="audit_events")
    op.drop_table("audit_events")

    op.drop_index("ix_project_assignments_user_id", table_name="project_assignments")
    op.drop_index("ix_project_assignments_project_id", table_name="project_assignments")
    op.drop_table("project_assignments")
    assignment_role_enum.drop(op.get_bind(), checkfirst=True)

    op.drop_index("ix_projects_name", table_name="projects")
    op.drop_table("projects")
    project_status_enum.drop(op.get_bind(), checkfirst=True)
