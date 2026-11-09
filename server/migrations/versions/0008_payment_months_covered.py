"""payments: how many months of rent a payment covers; records.delete permission

Revision ID: 0008
Revises: 0007
Create Date: 2026-11-09 18:00:00+00:00

Data-safety: adds one nullable column and one permission (granted to Administrator);
existing rows are unchanged.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("payments", sa.Column("months_covered", sa.Integer(), nullable=True))
    op.create_check_constraint("ck_payments_months_covered_range", "payments",
                               "months_covered IS NULL OR months_covered BETWEEN 1 AND 24")
    op.execute(sa.text(
        "INSERT INTO permissions (code, \"group\", description) VALUES ('records.delete', 'Administration', "
        "'Permanently delete records and everything linked to them') ON CONFLICT (code) DO NOTHING"))
    op.execute(sa.text(
        "INSERT INTO role_permissions (role_id, permission_id) "
        "SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'Administrator' AND p.code = 'records.delete' "
        "ON CONFLICT DO NOTHING"))


def downgrade() -> None:
    op.execute(sa.text("DELETE FROM role_permissions WHERE permission_id IN "
                       "(SELECT id FROM permissions WHERE code = 'records.delete')"))
    op.execute(sa.text("DELETE FROM permissions WHERE code = 'records.delete'"))
    op.drop_constraint("ck_payments_months_covered_range", "payments", type_="check")
    op.drop_column("payments", "months_covered")
