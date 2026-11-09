"""property usage (residential / commercial / mixed), unit toilets, default location

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-09 09:00:00+00:00

Data-safety checklist for every migration (deployments run them against live
financial data):
  * never drop or truncate tables/columns holding tenants, agreements,
    invoices, payments or allocations without migrating the data first;
  * add NOT NULL columns with a server_default or a backfill step;
  * keep downgrade() working where practical.

Property types become just "house" or "building"; what a property is let for
moves to the new ``usage`` column. Existing rows are converted, never dropped:
  * commercial property -> building, usage from its units (commercial or mixed)
  * compound            -> building (several units on one plot)
Shop rooms (unit type "commercial") have no bedrooms or bathrooms.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import insert as pg_insert

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Defaults taken from the landlord's own agreement; editable in Settings.
DEFAULT_LOCATION = [
    ("landlord.default_village", "Bisambu", "Default village (Umudugudu)", "landlord", False),
    ("landlord.default_cell", "Nyarurama", "Default cell (Akagari)", "landlord", False),
    ("landlord.default_sector", "Gatenga", "Default sector (Umurenge)", "landlord", False),
    ("landlord.default_district", "Kicukiro", "Default district (Akarere)", "landlord", False),
]


def upgrade() -> None:
    op.add_column("properties", sa.Column("usage", sa.String(length=16), server_default="residential", nullable=False))
    op.add_column("rental_units", sa.Column("toilet", sa.String(length=16), server_default="private", nullable=False))

    # Usage follows the units a property already has.
    op.execute(sa.text("""
        UPDATE properties p SET usage = CASE
            WHEN NOT EXISTS (SELECT 1 FROM rental_units u WHERE u.property_id = p.id AND u.unit_type = 'commercial')
                THEN CASE WHEN p.property_type = 'commercial' THEN 'commercial' ELSE 'residential' END
            WHEN EXISTS (SELECT 1 FROM rental_units u WHERE u.property_id = p.id AND u.unit_type <> 'commercial')
                THEN 'mixed'
            ELSE 'commercial'
        END
    """))
    op.execute(sa.text("UPDATE properties SET property_type = 'building' WHERE property_type IN ('commercial', 'compound')"))
    op.execute(sa.text("UPDATE rental_units SET bedrooms = 0, bathrooms = 0 WHERE unit_type = 'commercial'"))

    op.drop_constraint(op.f("ck_properties_property_type_valid"), "properties", type_="check")
    op.create_check_constraint("property_type_valid", "properties", "property_type IN ('building', 'house')")
    op.create_check_constraint("usage_valid", "properties", "usage IN ('residential', 'commercial', 'mixed')")
    op.create_check_constraint("toilet_valid", "rental_units", "toilet IN ('private', 'shared')")

    settings = sa.table("app_settings", sa.column("key", sa.String), sa.column("value", JSONB),
                        sa.column("label", sa.String), sa.column("group", sa.String),
                        sa.column("is_public", sa.Boolean))
    op.execute(pg_insert(settings).values([
        {"key": k, "value": v, "label": label, "group": group, "is_public": public}
        for k, v, label, group, public in DEFAULT_LOCATION
    ]).on_conflict_do_nothing(index_elements=["key"]))


def downgrade() -> None:
    op.execute(sa.text("DELETE FROM app_settings WHERE key LIKE 'landlord.default_%'"))
    op.drop_constraint(op.f("ck_rental_units_toilet_valid"), "rental_units", type_="check")
    op.drop_constraint(op.f("ck_properties_usage_valid"), "properties", type_="check")
    op.drop_constraint(op.f("ck_properties_property_type_valid"), "properties", type_="check")
    op.execute(sa.text("UPDATE properties SET property_type = 'commercial' WHERE usage = 'commercial'"))
    op.create_check_constraint(
        "property_type_valid", "properties", "property_type IN ('building', 'house', 'compound', 'commercial')"
    )
    op.drop_column("rental_units", "toilet")
    op.drop_column("properties", "usage")
