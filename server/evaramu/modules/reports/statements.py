"""Data behind the downloadable PDF reports.

Every money figure stays in its own currency (RWF and USD are never added
together). "Taken" means a unit that is occupied or has an active agreement,
the same rule as the website's neighbourhood counts.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from evaramu.modules.agreements.models import AgreementStatus, RentalAgreement
from evaramu.modules.billing import ledger
from evaramu.modules.billing.models import (
    Invoice,
    InvoiceKind,
    InvoiceStatus,
    Payment,
    PaymentAllocation,
    PaymentMethod,
    PaymentStatus,
)
from evaramu.modules.properties.models import Property, RentalUnit, UnitStatus

ZERO = Decimal("0")

#: Plural labels for the "units taken" summary, in display order.
UNIT_TYPES = [("room", "Rooms"), ("house", "Houses"), ("apartment", "Apartments"), ("studio", "Studios"),
              ("commercial", "Shop rooms")]
STATUS_LABEL = {
    UnitStatus.AVAILABLE.value: "Available", UnitStatus.RESERVED.value: "Reserved",
    UnitStatus.OCCUPIED.value: "Occupied", UnitStatus.TURNOVER.value: "Turnover",
    UnitStatus.MAINTENANCE.value: "Maintenance", UnitStatus.OFF_MARKET.value: "Off market",
}


def _active_agreements(db: Session, property_id: int | None) -> dict[int, RentalAgreement]:
    stmt = select(RentalAgreement).where(RentalAgreement.status == AgreementStatus.ACTIVE.value)
    if property_id:
        stmt = stmt.where(RentalAgreement.unit_id.in_(select(RentalUnit.id).where(RentalUnit.property_id == property_id)))
    return {a.unit_id: a for a in db.execute(stmt).unique().scalars()}


def _units(db: Session, property_id: int | None) -> list[RentalUnit]:
    stmt = (select(RentalUnit).join(Property, Property.id == RentalUnit.property_id)
            .where(RentalUnit.is_archived.is_(False), Property.is_archived.is_(False))
            .order_by(Property.code, RentalUnit.code))
    if property_id:
        stmt = stmt.where(RentalUnit.property_id == property_id)
    return list(db.execute(stmt).unique().scalars())


def units_taken(db: Session, property_id: int | None = None) -> dict:
    """Per unit type: how many units exist and how many are taken."""
    active = _active_agreements(db, property_id)
    rows = {k: {"type": k, "label": label, "total": 0, "taken": 0} for k, label in UNIT_TYPES}
    for u in _units(db, property_id):
        r = rows.setdefault(u.unit_type, {"type": u.unit_type, "label": u.unit_type.title(), "total": 0, "taken": 0})
        r["total"] += 1
        if u.status == UnitStatus.OCCUPIED.value or u.id in active:
            r["taken"] += 1
    by_type = [r for r in rows.values() if r["total"]]
    total = sum(r["total"] for r in by_type)
    taken = sum(r["taken"] for r in by_type)
    return {"by_type": by_type, "total": total, "taken": taken, "free": total - taken,
            "occupancy_rate": round(taken / total * 100, 1) if total else 0.0}


def _latest_method(db: Session, agreement_ids: set[int]) -> dict[int, str]:
    """Payment method of the latest approved payment, per agreement."""
    if not agreement_ids:
        return {}
    rows = db.execute(
        select(Payment.agreement_id, PaymentMethod.label)
        .join(PaymentMethod, PaymentMethod.code == Payment.method_code)
        .where(Payment.agreement_id.in_(agreement_ids), Payment.status == PaymentStatus.APPROVED.value)
        .order_by(Payment.payment_date, Payment.id)).all()
    return {agreement_id: label for agreement_id, label in rows}  # later rows win


def payments_received(db: Session, *, date_from: date | None, date_to: date | None,
                      property_id: int | None = None, currency: str | None = None) -> dict:
    """Approved payments in the period, one row per tenant and currency."""
    stmt = select(Payment).where(Payment.status == PaymentStatus.APPROVED.value)
    if date_from:
        stmt = stmt.where(Payment.payment_date >= date_from)
    if date_to:
        stmt = stmt.where(Payment.payment_date <= date_to)
    if property_id:
        stmt = stmt.where(Payment.unit_id.in_(select(RentalUnit.id).where(RentalUnit.property_id == property_id)))
    if currency:
        stmt = stmt.where(Payment.currency == currency)
    payments = list(db.execute(stmt.order_by(Payment.payment_date, Payment.id)).unique().scalars())

    # Rent months these payments went to: fully paid months count as whole, the rest as part-paid.
    months: dict[tuple[int, str], dict[int, str]] = defaultdict(dict)
    if payments:
        allocs = db.execute(
            select(Payment.tenant_id, Payment.currency, Invoice.id, Invoice.status)
            .join(PaymentAllocation, PaymentAllocation.payment_id == Payment.id)
            .join(Invoice, Invoice.id == PaymentAllocation.invoice_id)
            .where(Payment.id.in_([p.id for p in payments]), Invoice.kind == InvoiceKind.RENT.value,
                   PaymentAllocation.amount > 0)).all()
        for tid, cur, inv_id, status in allocs:
            months[(tid, cur)][inv_id] = status

    rows: dict[tuple[int, str], dict] = {}
    for p in payments:
        key = (p.tenant_id, p.currency)
        r = rows.setdefault(key, {
            "tenant": p.tenant.full_name, "phone": p.tenant.phone, "units": set(), "currency": p.currency,
            "payments": 0, "amount": ZERO, "last_payment": p.payment_date, "methods": Counter(),
        })
        r["units"].add(p.unit.code)
        r["payments"] += 1
        r["amount"] += p.amount
        r["last_payment"] = max(r["last_payment"], p.payment_date)
        r["methods"][p.method.label] += 1
    for key, r in rows.items():
        statuses = months.get(key, {}).values()
        r["months_full"] = sum(1 for s in statuses if s == InvoiceStatus.PAID.value)
        r["months_part"] = sum(1 for s in statuses if s != InvoiceStatus.PAID.value)
        # Most-used method first; ties keep the order they were first used in.
        r["methods"] = [label for label, _ in r["methods"].most_common()]
        r["units"] = sorted(r["units"])

    totals: dict[str, Decimal] = defaultdict(lambda: ZERO)
    for r in rows.values():
        totals[r["currency"]] += r["amount"]
    return {
        "rows": sorted(rows.values(), key=lambda r: (r["currency"], -r["amount"], r["tenant"])),
        "totals": dict(sorted(totals.items())),
        "payment_count": len(payments),
        "tenant_count": len({k[0] for k in rows}),
        "months_paid": sum(r["months_full"] for r in rows.values()),
        "units": units_taken(db, property_id),
    }


def overdue_tenants(db: Session, today: date, *, property_id: int | None = None, currency: str | None = None) -> dict:
    """Overdue balances as of `today`, one row per tenant, unit and currency."""
    ledger.refresh_overdue(db, today)
    stmt = select(Invoice).where(Invoice.status == InvoiceStatus.OVERDUE.value, ledger.BALANCE > 0)
    if property_id:
        stmt = stmt.where(Invoice.unit_id.in_(select(RentalUnit.id).where(RentalUnit.property_id == property_id)))
    if currency:
        stmt = stmt.where(Invoice.currency == currency)
    rows: dict[tuple[int, int, str], dict] = {}
    buckets: dict[str, dict[str, Decimal]] = defaultdict(lambda: defaultdict(lambda: ZERO))
    for inv in db.execute(stmt.order_by(Invoice.due_date)).unique().scalars():
        key = (inv.tenant_id, inv.unit_id, inv.currency)
        r = rows.setdefault(key, {
            "tenant": inv.tenant.full_name, "phone": inv.tenant.phone, "unit": inv.unit.code,
            "property": inv.unit.property.name, "currency": inv.currency, "months": 0, "other": 0,
            "amount": ZERO, "oldest_due": inv.due_date,
        })
        if inv.kind == InvoiceKind.RENT.value:
            r["months"] += 1
        else:
            r["other"] += 1
        bal = inv.balance_due
        r["amount"] += bal
        r["oldest_due"] = min(r["oldest_due"], inv.due_date)
        days = (today - inv.due_date).days
        buckets[inv.currency]["1-30" if days <= 30 else "31-60" if days <= 60 else "61-90" if days <= 90 else "90+"] += bal
    for r in rows.values():
        r["days_late"] = (today - r["oldest_due"]).days
    totals: dict[str, Decimal] = defaultdict(lambda: ZERO)
    for r in rows.values():
        totals[r["currency"]] += r["amount"]
    return {
        "rows": sorted(rows.values(), key=lambda r: (-r["days_late"], r["tenant"])),
        "totals": dict(sorted(totals.items())),
        "ageing": {c: {k: b.get(k, ZERO) for k in ("1-30", "31-60", "61-90", "90+")} for c, b in sorted(buckets.items())},
        "tenant_count": len({k[0] for k in rows}),
        "months_overdue": sum(r["months"] for r in rows.values()),
        "units": units_taken(db, property_id),
    }


def occupancy(db: Session, *, property_id: int | None = None) -> dict:
    """Every unit with its status, tenant, rent, latest payment method and balance."""
    active = _active_agreements(db, property_id)
    methods = _latest_method(db, {a.id for a in active.values()})
    balances: dict[int, dict[str, Decimal]] = defaultdict(lambda: defaultdict(lambda: ZERO))
    if active:
        for unit_id, cur, bal in db.execute(
                select(Invoice.unit_id, Invoice.currency, ledger.BALANCE)
                .where(Invoice.unit_id.in_(list(active)), Invoice.status.in_(ledger.OPEN_STATUSES))).all():
            balances[unit_id][cur] += bal
    rows = []
    expected: dict[str, Decimal] = defaultdict(lambda: ZERO)
    for u in _units(db, property_id):
        a = active.get(u.id)
        taken = u.status == UnitStatus.OCCUPIED.value or a is not None
        if a is not None:
            expected[a.currency] += a.monthly_rent
        rows.append({
            "property": u.property.name, "unit": u.code, "type": u.unit_type,
            "status": "Taken" if taken else STATUS_LABEL.get(u.status, u.status),
            "taken": taken, "tenant": a.tenant.full_name if a else "", "phone": a.tenant.phone if a else "",
            "rent": a.monthly_rent if a else u.monthly_rent, "currency": a.currency if a else u.currency,
            "method": methods.get(a.id) if a else None,
            "balance": balances[u.id].get(a.currency, ZERO) if a else ZERO,
        })
    return {"rows": rows, "expected_rent": dict(sorted(expected.items())), "units": units_taken(db, property_id)}
