"""outline as cover

Whether a listing's surveyed outline may stand in for its cover photograph
while it has none.

Revision ID: c41d7e2a9b10
Revises: 789aa1baa608
Create Date: 2026-09-21 14:30:00.000000+00:00
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = 'c41d7e2a9b10'
down_revision: str | None = '789aa1baa608'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        'properties',
        sa.Column('outline_as_cover', sa.Boolean(), server_default=sa.text('true'), nullable=False),
    )


def downgrade() -> None:
    op.drop_column('properties', 'outline_as_cover')
