"""Scheduled maintenance, run once a day (``python -m evaramu.cli run-daily``).

Every step is idempotent, so running it twice — or after a missed day — is safe.
"""

from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from evaramu.modules.agreements.models import AgreementStatus, RentalAgreement
from evaramu.modules.agreements.service import expire_due
from evaramu.modules.billing import ledger
from evaramu.modules.billing.models import Invoice, InvoiceStatus
from evaramu.modules.billing.service import generate_rent_invoices
from evaramu.modules.system.models import AppSetting
from evaramu.modules.system.services import notify


def _setting(db: Session, key: str, default):
    s = db.get(AppSetting, key)
    return s.value if s is not None else default


def run_daily(db: Session, today: date | None = None) -> dict:
    today = today or date.today()
    expired = expire_due(db, today)
    generated = {"created": [], "skipped": 0}
    if _setting(db, "billing.auto_generate_invoices", True):
        generated = generate_rent_invoices(db, today.year, today.month, actor=None, today=today)
    overdue_flagged = ledger.refresh_overdue(db, today)

    overdue_notes = 0
    for inv in db.execute(select(Invoice).where(Invoice.status == InvoiceStatus.OVERDUE.value)).unique().scalars():
        overdue_notes += notify(
            db, permission="invoices.view", kind="invoice_overdue",
            title=f"Overdue rent: {inv.tenant.full_name} ({inv.unit.code})",
            body=f"{inv.invoice_number} · {inv.balance_due:,} {inv.currency} due {inv.due_date:%d %b %Y}",
            link=f"/admin/finance/invoices/{inv.id}", dedupe_key=f"invoice-overdue-{inv.id}",
        )

    window = int(_setting(db, "billing.expiry_alert_days", 60))
    expiring_notes = 0
    for ag in db.execute(select(RentalAgreement).where(
        RentalAgreement.status == AgreementStatus.ACTIVE.value, RentalAgreement.end_date.is_not(None),
        RentalAgreement.end_date <= today + timedelta(days=window), RentalAgreement.end_date >= today,
    )).unique().scalars():
        expiring_notes += notify(
            db, permission="agreements.manage", kind="agreement_expiring",
            title=f"Agreement ending {ag.end_date:%d %b %Y}: {ag.tenant.full_name}",
            body=f"{ag.agreement_number} · unit {ag.unit.code}",
            link=f"/admin/agreements/{ag.id}", dedupe_key=f"agreement-expiring-{ag.id}-{ag.end_date}",
        )
    return {
        "agreements_expired": len(expired),
        "invoices_created": len(generated["created"]),
        "invoices_flagged_overdue": overdue_flagged,
        "overdue_notifications": overdue_notes,
        "expiry_notifications": expiring_notes,
    }
