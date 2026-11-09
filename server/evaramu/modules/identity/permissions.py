"""Permission catalogue and the built-in roles.

The catalogue is the single source of truth; ``evaramu.cli sync-permissions``
(run by every deployment after migrations) inserts any new permission and keeps
the built-in Administrator role holding all of them.
"""

from __future__ import annotations

PERMISSIONS: dict[str, tuple[str, str]] = {
    # code: (group, description)
    "dashboard.view": ("Overview", "View the management dashboard"),
    "properties.view": ("Property Management", "View properties, buildings and rental units"),
    "properties.manage": ("Property Management", "Create and edit properties, units, photos and availability"),
    "tenants.view": ("People", "View tenant records"),
    "tenants.view_sensitive": ("People", "View tenant identification documents"),
    "tenants.manage": ("People", "Register and edit tenants"),
    "agreements.view": ("People", "View rental agreements"),
    "agreements.manage": ("People", "Create, activate, renew and terminate rental agreements"),
    "inquiries.manage": ("People", "View and handle viewing requests from the public website"),
    "invoices.view": ("Financial Management", "View invoices and balances"),
    "invoices.manage": ("Financial Management", "Generate invoices, record adjustments and voids"),
    "payments.view": ("Financial Management", "View payments"),
    "payments.record": ("Financial Management", "Record payments received (as pending)"),
    "payments.approve": ("Financial Management", "Approve, reject and reverse payments"),
    "deposits.manage": ("Financial Management", "Record security deposits received and refunded"),
    "reports.view": ("Financial Management", "View financial reports"),
    "users.manage": ("Administration", "Manage staff accounts"),
    "roles.manage": ("Administration", "Manage roles and permissions"),
    "settings.manage": ("Administration", "Change system settings"),
    "audit.view": ("Administration", "View the audit log"),
}

ADMIN_ROLE = "Administrator"

BUILTIN_ROLES: dict[str, tuple[str, list[str]]] = {
    ADMIN_ROLE: ("Full access to every part of the platform", list(PERMISSIONS)),
    "Property Manager": (
        "Runs properties, tenants and agreements; records payments for approval",
        [
            "dashboard.view", "properties.view", "properties.manage", "tenants.view",
            "tenants.manage", "agreements.view", "agreements.manage", "inquiries.manage",
            "invoices.view", "payments.view", "payments.record",
        ],
    ),
    "Accountant": (
        "Handles invoicing, payment approval and financial reporting",
        [
            "dashboard.view", "properties.view", "tenants.view", "agreements.view",
            "invoices.view", "invoices.manage", "payments.view", "payments.record",
            "payments.approve", "deposits.manage", "reports.view",
        ],
    ),
    "Viewer": (
        "Read-only access to operational data",
        [
            "dashboard.view", "properties.view", "tenants.view", "agreements.view",
            "invoices.view", "payments.view", "reports.view",
        ],
    ),
}
