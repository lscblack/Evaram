"""rental units

The flats, rooms or shops let inside one rental listing, with each one's own
size, rent and availability.

Revision ID: d4e8f0a2b913
Revises: b7c2d4e6f801
Create Date: 2026-09-22 11:30:00.000000+00:00
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'd4e8f0a2b913'
down_revision: str | None = 'b7c2d4e6f801'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        'properties',
        sa.Column('rental_units', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('properties', 'rental_units')
