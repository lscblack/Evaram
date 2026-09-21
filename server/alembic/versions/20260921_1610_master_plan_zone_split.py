"""master plan zone split

How the Master Plan divides a parcel that straddles zones: a list of
`{"zone", "area_sqm"}` shares beside the single main zone.

Revision ID: 9e3f5a1c7d22
Revises: c41d7e2a9b10
Create Date: 2026-09-21 16:10:00.000000+00:00
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '9e3f5a1c7d22'
down_revision: str | None = 'c41d7e2a9b10'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        'properties',
        sa.Column('master_plan_zones', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column('properties', 'master_plan_zones')
