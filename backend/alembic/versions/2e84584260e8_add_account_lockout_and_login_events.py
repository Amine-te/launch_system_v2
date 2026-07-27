"""add account lockout fields and login_events table

Revision ID: 2e84584260e8
Revises: b3d4a7f10c2e
Create Date: 2026-07-26 16:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2e84584260e8'
down_revision: Union[str, None] = 'b3d4a7f10c2e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Matches app.models.login_event.LoginResult.
# BUGFIX (round 3): no explicit .create() call, and no create_type
# override -- both previous rounds tried to create this type explicitly
# ahead of create_table() (once with plain create_type default, once
# with create_type=False on sa.Enum/postgresql.ENUM), and both still hit
# "type login_result already exists" when create_table() went to create
# its own column type. create_type=False is documented to prevent that,
# but empirically didn't take effect in this environment/SQLAlchemy
# version. The one pattern proven to work here is the one already used,
# untouched, by e6e8dbfb6844_create_users_table.py in this same
# migration chain: don't call .create() at all, let create_table() be
# the single place the type gets created (its default create_type=True
# behavior), and only handle the type explicitly in downgrade()'s
# .drop() call, mirroring that file exactly.
login_result_enum = sa.Enum("success", "failed", name="login_result")


def upgrade() -> None:
    # SRS M00-FR-12/M00-AC-04 (lockout) + last_login_at for the admin UI's
    # "Last Login" column. server_default=0/NULL backfills existing rows
    # (nobody pre-dating this column has failed attempts on record or is
    # locked out).
    op.add_column(
        "users",
        sa.Column("failed_login_attempts", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "users",
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
    )

    # SRS M00-FR-13: login audit log. create_table() creates the
    # login_result type itself -- see the module comment above.
    op.create_table(
        "login_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("username", sa.String(length=255), nullable=False),
        sa.Column("result", login_result_enum, nullable=False),
        sa.Column("reason", sa.String(length=255), nullable=False),
        sa.Column("source_ip", sa.String(length=64), nullable=False, server_default=""),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_login_events_username", "login_events", ["username"])


def downgrade() -> None:
    op.drop_index("ix_login_events_username", table_name="login_events")
    op.drop_table("login_events")
    login_result_enum.drop(op.get_bind(), checkfirst=True)

    op.drop_column("users", "last_login_at")
    op.drop_column("users", "locked_at")
    op.drop_column("users", "failed_login_attempts")