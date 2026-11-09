"""construction manager role and construction projects

A role for the construction side of the business, and the table its work is
recorded in — from a land survey to a finished build — with a history of
updates per job.

Revision ID: b7c2d4e6f801
Revises: 9e3f5a1c7d22
Create Date: 2026-09-22 09:00:00.000000+00:00
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'b7c2d4e6f801'
down_revision: str | None = '9e3f5a1c7d22'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

KINDS = (
    'land_survey', 'architectural_drawing', 'structural_design', 'bill_of_quantities',
    'permit', 'construction', 'renovation', 'supervision', 'interior', 'other',
)
STATUSES = ('enquiry', 'quoted', 'approved', 'in_progress', 'on_hold', 'completed', 'cancelled')


def upgrade() -> None:
    # A new value on an existing enum. Postgres allows this inside a
    # transaction but will not let the value be *used* in the same one, which
    # is fine: nothing below writes a user row.
    op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'construction_manager'")

    kind = postgresql.ENUM(*KINDS, name='construction_kind', create_type=False)
    kind.create(op.get_bind(), checkfirst=True)
    status = postgresql.ENUM(*STATUSES, name='construction_status', create_type=False)
    status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        'construction_projects',
        sa.Column('reference', sa.String(length=32), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('kind', kind, nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', status, nullable=False),
        sa.Column('client_name', sa.String(length=160), nullable=True),
        sa.Column('client_phone', sa.String(length=48), nullable=True),
        sa.Column('client_email', sa.String(length=255), nullable=True),
        sa.Column('client_id', sa.UUID(), nullable=True),
        sa.Column('district', sa.String(length=80), nullable=True),
        sa.Column('sector', sa.String(length=80), nullable=True),
        sa.Column('address', sa.String(length=240), nullable=True),
        sa.Column('property_id', sa.UUID(), nullable=True),
        sa.Column('engineer_id', sa.UUID(), nullable=True),
        sa.Column('engineer_name', sa.String(length=160), nullable=True),
        sa.Column('currency', sa.String(length=3), nullable=False),
        sa.Column('quote_amount', sa.Numeric(precision=16, scale=2), nullable=True),
        sa.Column('amount_paid', sa.Numeric(precision=16, scale=2), nullable=True),
        sa.Column('started_on', sa.Date(), nullable=True),
        sa.Column('due_on', sa.Date(), nullable=True),
        sa.Column('completed_on', sa.Date(), nullable=True),
        sa.Column('progress_percent', sa.Integer(), nullable=False),
        sa.Column('is_showcased', sa.Boolean(), server_default=sa.text('false'), nullable=False),
        sa.Column('showcase_summary', sa.Text(), nullable=True),
        sa.Column('photos', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('source', sa.String(length=32), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by_id', sa.UUID(), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['engineer_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['property_id'], ['properties.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_construction_projects_created_at', 'construction_projects', ['created_at'])
    op.create_index('ix_construction_projects_reference', 'construction_projects', ['reference'], unique=True)
    op.create_index('ix_construction_projects_status', 'construction_projects', ['status'])
    op.create_index('ix_construction_projects_client_id', 'construction_projects', ['client_id'])
    op.create_index('ix_construction_projects_property_id', 'construction_projects', ['property_id'])
    op.create_index('ix_construction_projects_engineer_id', 'construction_projects', ['engineer_id'])
    op.create_index('ix_construction_status_kind', 'construction_projects', ['status', 'kind'])
    op.create_index('ix_construction_showcase', 'construction_projects', ['is_showcased', 'completed_on'])

    op.create_table(
        'construction_updates',
        sa.Column('project_id', sa.UUID(), nullable=False),
        sa.Column('author_id', sa.UUID(), nullable=True),
        sa.Column('author_name', sa.String(length=160), nullable=True),
        sa.Column('note', sa.Text(), nullable=False),
        sa.Column('status', status, nullable=True),
        sa.Column('progress_percent', sa.Integer(), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['author_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['project_id'], ['construction_projects.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_construction_updates_created_at', 'construction_updates', ['created_at'])
    op.create_index('ix_construction_update_project', 'construction_updates', ['project_id', 'created_at'])


def downgrade() -> None:
    op.drop_table('construction_updates')
    op.drop_table('construction_projects')
    op.execute('DROP TYPE IF EXISTS construction_status')
    op.execute('DROP TYPE IF EXISTS construction_kind')
    # Postgres cannot remove a value from an enum; the role value stays.
