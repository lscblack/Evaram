"""Alembic behaviour on a clean database and on a populated one.

Uses its own scratch database (<test db>_mig) so the main test schema is untouched.
"""

from decimal import Decimal

import pytest
from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from alembic.script import ScriptDirectory
from conftest import SETTINGS, TEST_DB, alembic_config
from sqlalchemy import create_engine, text

from evaramu.db.registry import metadata

MIG_DB = f"{TEST_DB[:-5]}_mig_test"


@pytest.fixture
def scratch():
    admin = create_engine(SETTINGS.database_url("postgres"), isolation_level="AUTOCOMMIT")
    with admin.connect() as c:
        c.execute(text(f'DROP DATABASE IF EXISTS "{MIG_DB}" WITH (FORCE)'))
        c.execute(text(f'CREATE DATABASE "{MIG_DB}" TEMPLATE template0'))
    url = SETTINGS.database_url(MIG_DB)
    engine = create_engine(url)
    yield url, engine
    engine.dispose()
    with admin.connect() as c:
        c.execute(text(f'DROP DATABASE IF EXISTS "{MIG_DB}" WITH (FORCE)'))
    admin.dispose()


def head():
    return ScriptDirectory.from_config(alembic_config()).get_current_head()


def test_clean_install_reaches_head_without_drift(scratch):
    url, engine = scratch
    command.upgrade(alembic_config(url), "head")
    with engine.connect() as c:
        assert c.execute(text("SELECT version_num FROM alembic_version")).scalar() == head()
        diffs = compare_metadata(MigrationContext.configure(c), metadata)
    assert diffs == [], f"models and migrations differ: {diffs}"


def test_downgrade_to_base_and_back(scratch):
    url, engine = scratch
    cfg = alembic_config(url)
    command.upgrade(cfg, "head")
    command.downgrade(cfg, "base")
    with engine.connect() as c:
        assert c.execute(text("SELECT count(*) FROM pg_tables WHERE schemaname='public' AND tablename <> 'alembic_version'")).scalar() == 0
    command.upgrade(cfg, "head")


def test_upgrade_preserves_existing_financial_data(scratch):
    url, engine = scratch
    cfg = alembic_config(url)
    command.upgrade(cfg, "0001")  # an "older deployed version"
    with engine.begin() as c:
        c.execute(text("INSERT INTO roles (name, description, is_system) VALUES ('Administrator', 'x', true)"))
        c.execute(text("""
            INSERT INTO users (email, full_name, password_hash, role_id, is_active, token_version, failed_login_count)
            VALUES ('o@example.com', 'Owner', 'x', (SELECT id FROM roles LIMIT 1), true, 0, 0);
            INSERT INTO properties (code, name, property_type, description, city, district, sector, address, amenities, is_archived)
            VALUES ('B01', 'Block', 'building', '', 'Kigali', 'Gasabo', '', '', '[]', false);
            INSERT INTO rental_units (property_id, code, name, unit_type, bedrooms, bathrooms, floor, furnished,
                monthly_rent, currency, description, amenities, status, is_published, is_featured, is_archived)
            VALUES (1, 'R101', 'Room', 'room', 1, 1, '', false, 150000, 'RWF', '', '[]', 'occupied', true, false, false);
            INSERT INTO tenants (full_name, phone, nationality, occupation, emergency_contact_name,
                emergency_contact_phone, emergency_contact_relationship, notes, is_archived)
            VALUES ('Tenant One', '+250788000001', '', '', '', '', '', '', false);
            INSERT INTO rental_agreements (agreement_number, tenant_id, unit_id, status, start_date, monthly_rent,
                currency, due_day, deposit_required, special_conditions, termination_reason)
            VALUES ('AGR-1', 1, 1, 'active', '2026-01-01', 150000, 'RWF', 5, 0, '', '');
            INSERT INTO invoices (invoice_number, kind, agreement_id, tenant_id, unit_id, issue_date, due_date,
                currency, amount_charged, amount_credited, amount_paid, previous_balance, status, notes, void_reason)
            VALUES ('INV-1', 'rent', 1, 1, 1, '2026-01-01', '2026-01-05', 'RWF', 150000, 0, 100000, 0,
                'partially_paid', '', '');
        """))
        c.execute(text("INSERT INTO payment_methods (code, label, is_active, sort_order) VALUES ('cash', 'Cash', true, 1)"))
        c.execute(text("""
            INSERT INTO payments (payment_number, tenant_id, agreement_id, unit_id, amount, currency, payment_date,
                method_code, transaction_reference, notes, status, rejection_reason, reversal_reason)
            VALUES ('PAY-1', 1, 1, 1, 100000, 'RWF', '2026-01-03', 'cash', '', '', 'approved', '', '');
            INSERT INTO payment_allocations (payment_id, invoice_id, amount) VALUES (1, 1, 100000);
        """))
    # Deploy the new version.
    command.upgrade(cfg, "head")
    command.upgrade(cfg, "head")  # running it again is a no-op
    with engine.connect() as c:
        assert c.execute(text("SELECT version_num FROM alembic_version")).scalar() == head()
        assert c.execute(text("SELECT amount_paid FROM invoices WHERE invoice_number='INV-1'")).scalar() == Decimal("100000.00")
        assert c.execute(text("SELECT count(*) FROM payment_allocations")).scalar() == 1
        assert c.execute(text("SELECT status FROM rental_agreements")).scalar() == "active"
        assert c.execute(text("SELECT count(*) FROM payment_methods WHERE code='cash'")).scalar() == 1
        assert c.execute(text("SELECT count(*) FROM permissions")).scalar() >= 20
    # A step back and forward again keeps the data too.
    command.downgrade(cfg, "0001")
    command.upgrade(cfg, "head")
    with engine.connect() as c:
        assert c.execute(text("SELECT count(*) FROM invoices")).scalar() == 1
        assert c.execute(text("SELECT count(*) FROM users")).scalar() == 1
