"""Dashboard metrics and financial reports, always grouped by currency."""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import Select, distinct, func, select
from sqlalchemy.orm import Session

from evaramu.modules.agreements.models import AgreementStatus, RentalAgreement
from evaramu.modules.agreements.service import pending_move_outs_query
from evaramu.modules.billing import ledger
from evaramu.modules.billing.models import (
    Invoice,
    InvoiceStatus,
    Payment,
    PaymentStatus,
)
from evaramu.modules.properties import availability
from evaramu.modules.properties.models import Property, RentalUnit, UnitStatus

ZERO = Decimal("0")


def _ca(d: dict[str, Decimal]) -> list[dict]:
    return [{"currency": c, "amount": format(a or ZERO, "f")} for c, a in sorted(d.items())]


def month_start(d: date) -> date:
    return d.replace(day=1)


def add_months(d: date, n: int) -> date:
    y, m = divmod(d.month - 1 + n, 12)
    return date(d.year + y, m + 1, 1)


def portfolio(db: Session) -> dict:
    total_props = db.execute(select(func.count()).select_from(Property).where(Property.is_archived.is_(False))).scalar_one()
    counts = dict(db.execute(
        select(RentalUnit.status, func.count()).where(RentalUnit.is_archived.is_(False)).group_by(RentalUnit.status)
    ).all())
    units = sum(counts.values())
    occupied = counts.get(UnitStatus.OCCUPIED.value, 0)
    listed = db.execute(select(func.count()).select_from(RentalUnit).where(availability.public_listing_clause())).scalar_one()
    active_tenants = db.execute(select(func.count(distinct(RentalAgreement.tenant_id))).where(
        RentalAgreement.status == AgreementStatus.ACTIVE.value)).scalar_one()
    return {
        "properties": total_props,
        "units": units,
        "unit_status": {s.value: counts.get(s.value, 0) for s in UnitStatus},
        "available_units": counts.get(UnitStatus.AVAILABLE.value, 0),
        "occupied_units": occupied,
        # Occupancy rate = occupied units / all active (non-archived) units.
        "occupancy_rate": round(occupied / units * 100, 1) if units else 0.0,
        "publicly_listed": listed,
        "active_tenants": active_tenants,
        "awaiting_move_out": db.execute(select(func.count()).select_from(pending_move_outs_query().subquery())).scalar_one(),
    }


def finance(db: Session, today: date) -> dict:
    ledger.refresh_overdue(db, today)
    expected = ledger.sum_by_currency(db.execute(
        select(RentalAgreement.currency, func.sum(RentalAgreement.monthly_rent))
        .where(RentalAgreement.status == AgreementStatus.ACTIVE.value).group_by(RentalAgreement.currency)).all())
    m0 = month_start(today)
    collected_month = ledger.sum_by_currency(db.execute(
        select(Payment.currency, func.sum(Payment.amount))
        .where(Payment.status == PaymentStatus.APPROVED.value, Payment.payment_date >= m0,
               Payment.payment_date <= today).group_by(Payment.currency)).all())
    collected_total = ledger.sum_by_currency(db.execute(
        select(Payment.currency, func.sum(Payment.amount))
        .where(Payment.status == PaymentStatus.APPROVED.value).group_by(Payment.currency)).all())
    pending_rows = db.execute(
        select(Payment.currency, func.sum(Payment.amount), func.count())
        .where(Payment.status == PaymentStatus.PENDING.value).group_by(Payment.currency)).all()
    outstanding = ledger.sum_by_currency(db.execute(
        select(Invoice.currency, func.sum(ledger.BALANCE))
        .where(Invoice.status.in_(ledger.OPEN_STATUSES)).group_by(Invoice.currency)).all())
    overdue_rows = db.execute(
        select(Invoice.currency, func.sum(ledger.BALANCE), func.count())
        .where(Invoice.status == InvoiceStatus.OVERDUE.value).group_by(Invoice.currency)).all()
    billed_month = ledger.sum_by_currency(db.execute(
        select(Invoice.currency, func.sum(Invoice.amount_charged - Invoice.amount_credited))
        .where(Invoice.status != InvoiceStatus.VOID.value, Invoice.issue_date >= m0,
               Invoice.issue_date <= add_months(m0, 1) - timedelta(days=1))
        .group_by(Invoice.currency)).all())
    return {
        "expected_monthly_rent": _ca(expected),
        "collected_this_month": _ca(collected_month),
        "billed_this_month": _ca(billed_month),
        "collected_all_time": _ca(collected_total),
        "pending_approvals": {
            "count": sum(r[2] for r in pending_rows),
            "amounts": _ca({r[0]: r[1] for r in pending_rows}),
        },
        "outstanding": _ca(outstanding),
        "overdue": {
            "count": sum(r[2] for r in overdue_rows),
            "amounts": _ca({r[0]: r[1] for r in overdue_rows}),
        },
    }


def monthly_series(db: Session, start: date, end: date) -> list[dict]:
    """Per month: approved collections (by payment date) and amounts billed
    (by issue date), each split by currency."""
    collected = db.execute(
        select(func.date_trunc("month", Payment.payment_date).label("m"), Payment.currency, func.sum(Payment.amount))
        .where(Payment.status == PaymentStatus.APPROVED.value, Payment.payment_date >= start, Payment.payment_date <= end)
        .group_by("m", Payment.currency)).all()
    billed = db.execute(
        select(func.date_trunc("month", Invoice.issue_date).label("m"), Invoice.currency,
               func.sum(Invoice.amount_charged - Invoice.amount_credited))
        .where(Invoice.status != InvoiceStatus.VOID.value, Invoice.issue_date >= start, Invoice.issue_date <= end)
        .group_by("m", Invoice.currency)).all()
    months: dict[str, dict] = {}
    cur = month_start(start)
    while cur <= end:
        key = cur.strftime("%Y-%m")
        months[key] = {"month": key, "collected": {}, "billed": {}}
        cur = add_months(cur, 1)
    for m, c, a in collected:
        months.setdefault(m.strftime("%Y-%m"), {"month": m.strftime("%Y-%m"), "collected": {}, "billed": {}})["collected"][c] = format(a, "f")
    for m, c, a in billed:
        months.setdefault(m.strftime("%Y-%m"), {"month": m.strftime("%Y-%m"), "collected": {}, "billed": {}})["billed"][c] = format(a, "f")
    return list(months.values())


def occupancy_by_property(db: Session) -> list[dict]:
    rows = db.execute(
        select(Property.id, Property.code, Property.name, RentalUnit.status, func.count())
        .join(RentalUnit, RentalUnit.property_id == Property.id)
        .where(Property.is_archived.is_(False), RentalUnit.is_archived.is_(False))
        .group_by(Property.id, Property.code, Property.name, RentalUnit.status)).all()
    out: dict[int, dict] = {}
    for pid, code, name, status, n in rows:
        r = out.setdefault(pid, {"property_id": pid, "code": code, "name": name, "units": 0, "occupied": 0, "available": 0})
        r["units"] += n
        if status == UnitStatus.OCCUPIED.value:
            r["occupied"] += n
        if status == UnitStatus.AVAILABLE.value:
            r["available"] += n
    for r in out.values():
        r["occupancy_rate"] = round(r["occupied"] / r["units"] * 100, 1) if r["units"] else 0.0
    return sorted(out.values(), key=lambda r: r["code"])


def apply_payment_filters(stmt: Select, f: dict) -> Select:
    if f.get("date_from"):
        stmt = stmt.where(Payment.payment_date >= f["date_from"])
    if f.get("date_to"):
        stmt = stmt.where(Payment.payment_date <= f["date_to"])
    if f.get("property_id"):
        stmt = stmt.where(Payment.unit_id.in_(select(RentalUnit.id).where(RentalUnit.property_id == f["property_id"])))
    if f.get("tenant_id"):
        stmt = stmt.where(Payment.tenant_id == f["tenant_id"])
    if f.get("method_code"):
        stmt = stmt.where(Payment.method_code == f["method_code"])
    if f.get("currency"):
        stmt = stmt.where(Payment.currency == f["currency"])
    if f.get("status"):
        stmt = stmt.where(Payment.status == f["status"])
    return stmt


def payment_report(db: Session, f: dict) -> dict:
    totals = db.execute(apply_payment_filters(
        select(Payment.currency, Payment.status, func.sum(Payment.amount), func.count())
        .group_by(Payment.currency, Payment.status), f)).all()
    by_method = db.execute(apply_payment_filters(
        select(Payment.method_code, Payment.currency, func.sum(Payment.amount), func.count())
        .where(Payment.status == PaymentStatus.APPROVED.value)
        .group_by(Payment.method_code, Payment.currency), f)).all()
    by_property = db.execute(apply_payment_filters(
        select(Property.code, Property.name, Payment.currency, func.sum(Payment.amount), func.count())
        .join(RentalUnit, RentalUnit.id == Payment.unit_id).join(Property, Property.id == RentalUnit.property_id)
        .where(Payment.status == PaymentStatus.APPROVED.value)
        .group_by(Property.code, Property.name, Payment.currency), f)).all()
    return {
        "totals": [{"currency": c, "status": s, "amount": format(a, "f"), "count": n} for c, s, a, n in totals],
        "by_method": [{"method_code": m, "currency": c, "amount": format(a, "f"), "count": n} for m, c, a, n in by_method],
        "by_property": [{"code": code, "name": name, "currency": c, "amount": format(a, "f"), "count": n}
                        for code, name, c, a, n in by_property],
    }


def apply_invoice_filters(stmt: Select, f: dict) -> Select:
    if f.get("date_from"):
        stmt = stmt.where(Invoice.issue_date >= f["date_from"])
    if f.get("date_to"):
        stmt = stmt.where(Invoice.issue_date <= f["date_to"])
    if f.get("property_id"):
        stmt = stmt.where(Invoice.unit_id.in_(select(RentalUnit.id).where(RentalUnit.property_id == f["property_id"])))
    if f.get("tenant_id"):
        stmt = stmt.where(Invoice.tenant_id == f["tenant_id"])
    if f.get("currency"):
        stmt = stmt.where(Invoice.currency == f["currency"])
    if f.get("status"):
        stmt = stmt.where(Invoice.status == f["status"])
    return stmt


def invoice_report(db: Session, f: dict) -> dict:
    rows = db.execute(apply_invoice_filters(
        select(Invoice.currency, Invoice.status, func.count(), func.sum(Invoice.amount_charged),
               func.sum(Invoice.amount_credited), func.sum(Invoice.amount_paid), func.sum(ledger.BALANCE))
        .where(Invoice.status != InvoiceStatus.VOID.value)
        .group_by(Invoice.currency, Invoice.status), f)).all()
    by_currency: dict[str, dict] = {}
    for cur, status, n, charged, credited, paid, bal in rows:
        t = by_currency.setdefault(cur, {"currency": cur, "count": 0, "charged": ZERO, "credited": ZERO,
                                         "paid": ZERO, "outstanding": ZERO, "by_status": {}})
        t["count"] += n
        t["charged"] += charged
        t["credited"] += credited
        t["paid"] += paid
        t["outstanding"] += bal
        t["by_status"][status] = n
    for t in by_currency.values():
        for k in ("charged", "credited", "paid", "outstanding"):
            t[k] = format(t[k], "f")
        charged = Decimal(t["charged"]) - Decimal(t["credited"])
        t["collection_rate"] = round(float(Decimal(t["paid"]) / charged * 100), 1) if charged else 0.0
    return {"by_currency": sorted(by_currency.values(), key=lambda t: t["currency"])}


def outstanding_report(db: Session, today: date, f: dict | None = None) -> list[dict]:
    """Per tenant and currency, with ageing buckets by days past due."""
    f = f or {}
    stmt = apply_invoice_filters(
        select(Invoice).where(Invoice.status.in_(ledger.OPEN_STATUSES), ledger.BALANCE > 0), f)
    buckets: dict[tuple[int, str], dict] = {}
    for inv in db.execute(stmt).unique().scalars():
        key = (inv.tenant_id, inv.currency)
        r = buckets.setdefault(key, {
            "tenant_id": inv.tenant_id, "tenant_name": inv.tenant.full_name, "phone": inv.tenant.phone,
            "currency": inv.currency, "invoices": 0, "total": ZERO, "current": ZERO,
            "d1_30": ZERO, "d31_60": ZERO, "d61_90": ZERO, "d90_plus": ZERO, "oldest_due": inv.due_date,
            "units": set(),
        })
        bal = inv.balance_due
        days = (today - inv.due_date).days
        bucket = ("current" if days <= 0 else "d1_30" if days <= 30 else "d31_60" if days <= 60
                  else "d61_90" if days <= 90 else "d90_plus")
        r[bucket] += bal
        r["total"] += bal
        r["invoices"] += 1
        r["units"].add(inv.unit.code)
        r["oldest_due"] = min(r["oldest_due"], inv.due_date)
    out = []
    for r in buckets.values():
        r["units"] = sorted(r["units"])
        for k in ("total", "current", "d1_30", "d31_60", "d61_90", "d90_plus"):
            r[k] = format(r[k], "f")
        out.append(r)
    return sorted(out, key=lambda r: (r["currency"], -float(r["total"])))

