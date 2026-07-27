"""add user full_name and is_active

Revision ID: b3d4a7f10c2e
Revises: e6e8dbfb6844
Create Date: 2026-07-26 15:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b3d4a7f10c2e'
down_revision: Union[str, None] = 'e6e8dbfb6844'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # server_default on both so this backfills existing rows (the 7 seeded
    # demo users) without a separate data migration -- full_name defaults to
    # '' (the app should require a real value going forward; this column
    # just can't be NULL on rows that predate it) and is_active defaults to
    # true (nobody existing was deactivated before this column existed).
    op.add_column(
        "users",
        sa.Column("full_name", sa.String(length=255), nullable=False, server_default=""),
    )
    op.add_column(
        "users",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )


def downgrade() -> None:
    op.drop_column("users", "is_active")
    op.drop_column("users", "full_name")
