"""demo data flags on properties and tenants

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-08

Sample records loaded from Settings → Demo data are flagged so they can be
removed again without touching real records.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: Union[str, Sequence[str], None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    for table in ("properties", "tenants"):
        op.add_column(table, sa.Column("is_demo", sa.Boolean(), nullable=False, server_default=sa.false()))
        op.create_index(f"ix_{table}_is_demo", table, ["is_demo"], postgresql_where=sa.text("is_demo"))


def downgrade() -> None:
    for table in ("properties", "tenants"):
        op.drop_index(f"ix_{table}_is_demo", table_name=table)
        op.drop_column(table, "is_demo")
