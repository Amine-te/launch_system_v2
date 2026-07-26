"""create users table

Revision ID: e6e8dbfb6844
Revises: 7c22b59ed111
Create Date: 2026-07-26 14:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e6e8dbfb6844'
down_revision: Union[str, None] = '7c22b59ed111'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Matches app.models.user.UserRole -- keep these in sync if that enum changes.
user_role_enum = sa.Enum(
    "engineer",
    "manager",
    "plant",
    "wh_lead",
    "wh_staff",
    "prod_coord",
    "admin",
    name="user_role",
)


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("role", user_role_enum, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
    user_role_enum.drop(op.get_bind(), checkfirst=True)