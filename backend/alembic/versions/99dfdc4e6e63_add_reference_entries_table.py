"""add reference_entries table

Revision ID: 99dfdc4e6e63
Revises: 2e84584260e8
Create Date: 2026-07-27 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '99dfdc4e6e63'
down_revision: Union[str, None] = '2e84584260e8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Matches app.models.reference_entry.ReferenceListType.
# BUGFIX (round 3) -- see the identical comment in
# 2e84584260e8_add_account_lockout_and_login_events.py: no explicit
# .create() call, no create_type override. create_table() creates this
# type itself; the explicit .drop() call in downgrade() is the only
# place the type is handled outside create_table's own default behavior.
reference_list_type_enum = sa.Enum(
    "customers", "contacts", "fgpn", "receivers", "methods", "materialTypes",
    name="reference_list_type",
)


def upgrade() -> None:
    op.create_table(
        "reference_entries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("list_type", reference_list_type_enum, nullable=False),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.Column("project", sa.String(length=255), nullable=True),
        sa.Column("reference_codes", sa.JSON(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_reference_entries_list_type", "reference_entries", ["list_type"])


def downgrade() -> None:
    op.drop_index("ix_reference_entries_list_type", table_name="reference_entries")
    op.drop_table("reference_entries")
    reference_list_type_enum.drop(op.get_bind(), checkfirst=True)