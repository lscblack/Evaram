"""website currency switch: landlord's own USD -> RWF rate (0 = live rate)

Revision ID: 0006
Revises: 0005
Create Date: 2026-11-09 14:00:00+00:00

Data-safety: only inserts one settings row (skipped if it already exists).
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import insert as pg_insert

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    settings = sa.table("app_settings", sa.column("key", sa.String), sa.column("value", JSONB),
                        sa.column("label", sa.String), sa.column("group", sa.String),
                        sa.column("is_public", sa.Boolean))
    op.execute(pg_insert(settings).values([{
        "key": "currency.usd_rwf_rate", "value": 0,
        "label": "USD to RWF rate for the website (0 = use the live rate)", "group": "currency", "is_public": False,
    }]).on_conflict_do_nothing(index_elements=["key"]))


def downgrade() -> None:
    op.execute(sa.text("DELETE FROM app_settings WHERE key IN ('currency.usd_rwf_rate', 'currency.usd_rwf_last')"))
