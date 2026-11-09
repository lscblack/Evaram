"""reference data: permissions, built-in roles, payment methods, settings

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-08

Self-contained on purpose: migrations must keep producing the same result even
after the application code evolves. Later permission additions are applied by
``python -m evaramu.cli sync-permissions`` (run by every deployment).
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import insert as pg_insert

revision: str = "0002"
down_revision: Union[str, Sequence[str], None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

PERMISSIONS = [
    ("dashboard.view", "Overview", "View the management dashboard"),
    ("properties.view", "Property Management", "View properties, buildings and rental units"),
    ("properties.manage", "Property Management", "Create and edit properties, units, photos and availability"),
    ("tenants.view", "People", "View tenant records"),
    ("tenants.view_sensitive", "People", "View tenant identification documents"),
    ("tenants.manage", "People", "Register and edit tenants"),
    ("agreements.view", "People", "View rental agreements"),
    ("agreements.manage", "People", "Create, activate, renew and terminate rental agreements"),
    ("inquiries.manage", "People", "View and handle viewing requests from the public website"),
    ("invoices.view", "Financial Management", "View invoices and balances"),
    ("invoices.manage", "Financial Management", "Generate invoices, record adjustments and voids"),
    ("payments.view", "Financial Management", "View payments"),
    ("payments.record", "Financial Management", "Record payments received (as pending)"),
    ("payments.approve", "Financial Management", "Approve, reject and reverse payments"),
    ("deposits.manage", "Financial Management", "Record security deposits received and refunded"),
    ("reports.view", "Financial Management", "View financial reports"),
    ("users.manage", "Administration", "Manage staff accounts"),
    ("roles.manage", "Administration", "Manage roles and permissions"),
    ("settings.manage", "Administration", "Change system settings"),
    ("audit.view", "Administration", "View the audit log"),
]

ROLES = {
    "Administrator": ("Full access to every part of the platform", [p[0] for p in PERMISSIONS]),
    "Property Manager": (
        "Runs properties, tenants and agreements; records payments for approval",
        ["dashboard.view", "properties.view", "properties.manage", "tenants.view", "tenants.manage",
         "agreements.view", "agreements.manage", "inquiries.manage", "invoices.view",
         "payments.view", "payments.record"],
    ),
    "Accountant": (
        "Handles invoicing, payment approval and financial reporting",
        ["dashboard.view", "properties.view", "tenants.view", "agreements.view", "invoices.view",
         "invoices.manage", "payments.view", "payments.record", "payments.approve",
         "deposits.manage", "reports.view"],
    ),
    "Viewer": (
        "Read-only access to operational data",
        ["dashboard.view", "properties.view", "tenants.view", "agreements.view", "invoices.view",
         "payments.view", "reports.view"],
    ),
}

PAYMENT_METHODS = [
    ("mtn_momo", "MTN MoMo", 1),
    ("airtel_money", "Airtel Money", 2),
    ("bank_transfer", "Bank transfer", 3),
    ("cash", "Cash", 4),
    ("other", "Other", 5),
]

# Company details carried over from the previous website's settings.
SETTINGS = [
    ("company.name", "Evaramu Group Ltd", "Company name", "company", True),
    ("company.tagline", "Quality homes and rooms for rent in Kigali", "Tagline", "company", True),
    ("company.about", (
        "Evaramu Group Ltd is a Kigali-based real estate, construction and property "
        "management company. We source, build, improve and manage residential property, "
        "and we let well-kept houses, apartments and rooms to tenants who want a "
        "reliable landlord."
    ), "About text", "company", True),
    ("contact.email", "hello@evaramu.rw", "Public email", "contact", True),
    ("contact.phone", "+250 792 879 777", "Phone", "contact", True),
    ("contact.whatsapp", "250792879777", "WhatsApp number (international, digits only)", "contact", True),
    ("contact.address", "KG 11 Ave, Kimihurura, Gasabo District, Kigali, Rwanda", "Office address", "contact", True),
    ("contact.hours", "Monday – Friday · 08:00 – 18:00, Saturday · 09:00 – 14:00", "Office hours", "contact", True),
    ("social.instagram", "https://instagram.com/evaramu_group", "Instagram", "social", True),
    ("social.facebook", "https://facebook.com/evaramu_group", "Facebook", "social", True),
    ("social.linkedin", "https://linkedin.com/company/evaramu_group", "LinkedIn", "social", True),
    ("billing.default_due_day", 5, "Default rent due day of month", "billing", False),
    ("billing.auto_generate_invoices", True, "Generate the month's rent invoices automatically (daily job)", "billing", False),
    ("billing.expiry_alert_days", 60, "Warn about agreements ending within (days)", "billing", False),
]


def upgrade() -> None:
    conn = op.get_bind()
    permissions = sa.table("permissions", sa.column("id", sa.Integer), sa.column("code", sa.String),
                           sa.column("group", sa.String), sa.column("description", sa.String))
    roles = sa.table("roles", sa.column("id", sa.Integer), sa.column("name", sa.String),
                     sa.column("description", sa.String), sa.column("is_system", sa.Boolean))
    role_permissions = sa.table("role_permissions", sa.column("role_id", sa.Integer),
                                sa.column("permission_id", sa.Integer))
    methods = sa.table("payment_methods", sa.column("code", sa.String), sa.column("label", sa.String),
                       sa.column("is_active", sa.Boolean), sa.column("sort_order", sa.Integer))
    settings = sa.table("app_settings", sa.column("key", sa.String), sa.column("value", JSONB),
                        sa.column("label", sa.String), sa.column("group", sa.String),
                        sa.column("is_public", sa.Boolean))

    # ON CONFLICT DO NOTHING keeps the migration re-runnable after a partial
    # downgrade on a populated database (rows still in use are kept there).
    def put(table, rows):
        if rows:
            conn.execute(pg_insert(table).values(rows).on_conflict_do_nothing())

    put(permissions, [{"code": c, "group": g, "description": d} for c, g, d in PERMISSIONS])
    put(roles, [{"name": n, "description": d, "is_system": True} for n, (d, _) in ROLES.items()])
    perm_ids = dict(conn.execute(sa.select(permissions.c.code, permissions.c.id)).all())
    role_ids = dict(conn.execute(sa.select(roles.c.name, roles.c.id)).all())
    put(role_permissions, [
        {"role_id": role_ids[name], "permission_id": perm_ids[code]}
        for name, (_, codes) in ROLES.items() for code in codes
    ])
    put(methods, [{"code": c, "label": lbl, "is_active": True, "sort_order": o} for c, lbl, o in PAYMENT_METHODS])
    put(settings, [{"key": k, "value": v, "label": lbl, "group": g, "is_public": p}
                   for k, v, lbl, g, p in SETTINGS])


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("DELETE FROM app_settings WHERE key = ANY(:k)"), {"k": [s[0] for s in SETTINGS]})
    conn.execute(sa.text(
        "DELETE FROM payment_methods WHERE code = ANY(:c) "
        "AND code NOT IN (SELECT DISTINCT method_code FROM payments)"
    ), {"c": [m[0] for m in PAYMENT_METHODS]})
    conn.execute(sa.text(
        "DELETE FROM role_permissions WHERE role_id IN (SELECT id FROM roles WHERE is_system)"
    ))
    conn.execute(sa.text(
        "DELETE FROM roles WHERE is_system AND id NOT IN (SELECT DISTINCT role_id FROM users)"
    ))
    conn.execute(sa.text(
        "DELETE FROM permissions WHERE id NOT IN (SELECT permission_id FROM role_permissions)"
    ))
