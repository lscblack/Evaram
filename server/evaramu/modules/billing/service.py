"""Invoicing and the manual payment-approval workflow.

Payment workflow
----------------
1. ``record_payment`` stores the payment as **pending** with the requested
   invoice allocation. Nothing about any balance changes.
2. Pending payments appear in the approval queue; approvers are notified.
3. ``approve_payment`` (payments.approve) locks the payment and the affected
   invoices, re-validates the allocation against *current* balances, applies
   any remainder oldest-invoice-first, marks the payment approved and
   recomputes every affected invoice — all in one transaction.
4. ``reject_payment`` requires a reason and never touches balances.
5. ``reverse_payment`` undoes an approved payment by status change (the row
   and its allocations are kept for the audit trail) and recomputes balances.
Approved payments are never deleted or edited.
"""

from __future__ import annotations

import calendar
from datetime import UTC, date, datetime
from decimal import Decimal

from fastapi import Request
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from evaramu.core.errors import Conflict, DomainError, NotFound
from evaramu.core.money import quantize, validate_amount
from evaramu.modules.agreements.models import AgreementStatus, RentalAgreement
from evaramu.modules.billing import ledger
from evaramu.modules.billing.models import (
    AdjustmentKind,
    FinancialAdjustment,
    Invoice,
    InvoiceItem,
    InvoiceItemKind,
    InvoiceKind,
    InvoiceStatus,
    Payment,
    PaymentAllocation,
    PaymentMethod,
    PaymentStatus,
)
from evaramu.modules.identity.models import User
from evaramu.modules.system.services import audit, next_number, notify

ZERO = Decimal("0")


def _amount(value: Decimal, currency: str) -> Decimal:
    try:
        return validate_amount(value, currency)
    except ValueError as exc:
        raise DomainError(str(exc)) from exc


def get_invoice(db: Session, invoice_id: int, *, for_update: bool = False) -> Invoice:
    stmt = select(Invoice).where(Invoice.id == invoice_id)
    if for_update:
        stmt = stmt.with_for_update(of=Invoice)
    inv = db.execute(stmt).unique().scalar_one_or_none()
    if inv is None:
        raise NotFound("Invoice not found")
    return inv


def get_payment(db: Session, payment_id: int, *, for_update: bool = False) -> Payment:
    stmt = select(Payment).where(Payment.id == payment_id)
    if for_update:
        stmt = stmt.with_for_update(of=Payment)
    p = db.execute(stmt).unique().scalar_one_or_none()
    if p is None:
        raise NotFound("Payment not found")
    return p


# ------------------------------------------------------------ invoicing ----


def month_bounds(year: int, month: int) -> tuple[date, date]:
    last = calendar.monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last)


def rent_for_period(ag: RentalAgreement, year: int, month: int) -> tuple[date, date, Decimal] | None:
    """Covered dates and (prorated) rent for one calendar month, or None."""
    first, last = month_bounds(year, month)
    start = max(first, ag.start_date)
    end_limit = ag.end_date
    if ag.terminated_on and (end_limit is None or ag.terminated_on < end_limit):
        end_limit = ag.terminated_on
    end = min(last, end_limit) if end_limit else last
    if end < start:
        return None
    days_in_month = (last - first).days + 1
    covered = (end - start).days + 1
    if covered == days_in_month:
        amount = ag.monthly_rent
    else:
        amount = quantize(ag.monthly_rent * Decimal(covered) / Decimal(days_in_month), ag.currency)
    return start, end, amount


def _create_invoice(db: Session, ag: RentalAgreement, *, kind: str, period: tuple[date, date] | None,
                    issue_date: date, due_date: date, items: list[tuple[str, str, Decimal]],
                    notes: str, actor: User | None, today: date) -> Invoice:
    inv = Invoice(
        invoice_number=next_number(db, "INV", period=issue_date),
        kind=kind, agreement_id=ag.id, tenant_id=ag.tenant_id, unit_id=ag.unit_id,
        period_start=period[0] if period else None, period_end=period[1] if period else None,
        issue_date=issue_date, due_date=max(due_date, issue_date), currency=ag.currency,
        previous_balance=ledger.outstanding_for_agreement(db, ag.id, ag.currency),
        status=InvoiceStatus.UNPAID.value, notes=notes, void_reason="",
        created_by_id=actor.id if actor else None,
        amount_charged=ZERO, amount_credited=ZERO, amount_paid=ZERO,
    )
    for item_kind, desc, amount in items:
        inv.items.append(InvoiceItem(kind=item_kind, description=desc[:255], amount=amount))
    db.add(inv)
    ledger.recompute_invoice(db, inv, today)
    return inv


def _rent_invoice_for(db: Session, ag: RentalAgreement, year: int, month: int) -> Invoice | None:
    first, last = month_bounds(year, month)
    return db.execute(select(Invoice).where(
        Invoice.agreement_id == ag.id, Invoice.kind == InvoiceKind.RENT.value,
        Invoice.period_start >= first, Invoice.period_start <= last, Invoice.status != InvoiceStatus.VOID.value,
    ).order_by(Invoice.id)).unique().scalars().first()


def _ensure_rent_invoice(db: Session, ag: RentalAgreement, year: int, month: int, *, actor: User | None,
                         today: date) -> tuple[Invoice | None, bool]:
    """The month's rent invoice for one agreement, created if missing.
    Returns (invoice or None when the agreement does not cover the month, created)."""
    covered = rent_for_period(ag, year, month)
    if covered is None:
        return None, False
    start, end, amount = covered
    existing = _rent_invoice_for(db, ag, year, month)
    if existing:
        return existing, False
    first, last = month_bounds(year, month)
    due = date(year, month, min(ag.due_day, calendar.monthrange(year, month)[1]))
    label = f"Rent {first.strftime('%B %Y')} — {ag.unit.code}"
    if (start, end) != (first, last):
        label += f" ({start.day}–{end.day} {first.strftime('%b')}, prorated)"
    try:
        with db.begin_nested():
            inv = _create_invoice(
                db, ag, kind=InvoiceKind.RENT.value, period=(start, end), issue_date=start,
                due_date=due, items=[(InvoiceItemKind.RENT.value, label, amount)], notes="",
                actor=actor, today=today,
            )
    except IntegrityError:
        return _rent_invoice_for(db, ag, year, month), False  # created concurrently
    return inv, True


def generate_rent_invoices(db: Session, year: int, month: int, *, actor: User | None,
                           today: date | None = None, agreement_id: int | None = None) -> dict:
    """Create the month's rent invoice for every active agreement that does not
    have one yet. Safe to run repeatedly (idempotent)."""
    today = today or date.today()
    first, last = month_bounds(year, month)
    stmt = select(RentalAgreement).where(
        RentalAgreement.status == AgreementStatus.ACTIVE.value,
        RentalAgreement.start_date <= last,
        (RentalAgreement.end_date.is_(None)) | (RentalAgreement.end_date >= first),
    )
    if agreement_id:
        stmt = stmt.where(RentalAgreement.id == agreement_id)
    created: list[Invoice] = []
    skipped = 0
    for ag in db.execute(stmt.order_by(RentalAgreement.id)).unique().scalars():
        inv, made = _ensure_rent_invoice(db, ag, year, month, actor=actor, today=today)
        if made and inv is not None:
            created.append(inv)
        else:
            skipped += 1
    if created:
        audit(db, actor=actor, action="invoices.generated", entity_type="invoice", entity_id=None,
              summary=f"Generated {len(created)} rent invoice(s) for {first.strftime('%B %Y')}")
    return {"created": created, "skipped": skipped, "period": first.strftime("%Y-%m")}


# ---------------------------------------------------------- months ahead ----

MAX_MONTHS = 24


def _next_month(y: int, m: int) -> tuple[int, int]:
    return (y + 1, 1) if m == 12 else (y, m + 1)


def coverage_plan(db: Session, ag: RentalAgreement, months: int, *, today: date | None = None) -> list[dict]:
    """The next ``months`` unpaid months of rent, oldest first.

    Starts at the oldest open rent invoice; without one, at the month after the
    last rent invoice (or this month / the agreement's first month). Fully paid
    months are skipped; months after the agreement ends are never included.
    Each entry: year, month, invoice (or None: not created yet), amount_due."""
    today = today or date.today()
    rent = select(Invoice).where(Invoice.agreement_id == ag.id, Invoice.kind == InvoiceKind.RENT.value,
                                 Invoice.status != InvoiceStatus.VOID.value)
    oldest_open = db.execute(rent.where(Invoice.status.in_(ledger.OPEN_STATUSES), ledger.BALANCE > 0)
                             .order_by(Invoice.period_start)).unique().scalars().first()
    if oldest_open and oldest_open.period_start:
        y, m = oldest_open.period_start.year, oldest_open.period_start.month
    else:
        latest = db.execute(rent.order_by(Invoice.period_start.desc())).unique().scalars().first()
        if latest and latest.period_start:
            y, m = _next_month(latest.period_start.year, latest.period_start.month)
        else:
            begin = max(ag.start_date, today.replace(day=1))
            y, m = begin.year, begin.month
    plan: list[dict] = []
    for _ in range(months + 36):  # bounded walk past already-paid months
        if len(plan) >= months:
            break
        covered = rent_for_period(ag, y, m)
        if covered is None:
            if date(y, m, 1) > ag.start_date:
                break  # past the end of the agreement
            y, m = _next_month(y, m)
            continue
        inv = _rent_invoice_for(db, ag, y, m)
        due = inv.balance_due if inv else covered[2]
        if due > 0:
            plan.append({"year": y, "month": m, "invoice": inv, "amount_due": due})
        y, m = _next_month(y, m)
    return plan


def create_manual_invoice(db: Session, ag: RentalAgreement, *, issue_date: date, due_date: date,
                          items: list[dict], notes: str, actor: User, request: Request | None,
                          today: date | None = None) -> Invoice:
    if ag.status == AgreementStatus.DRAFT.value:
        raise Conflict("Invoices can only be raised on activated agreements")
    if due_date < issue_date:
        raise DomainError("Due date cannot be before the issue date")
    if not items:
        raise DomainError("Add at least one line item")
    lines = [(InvoiceItemKind.CHARGE.value, i["description"], _amount(i["amount"], ag.currency)) for i in items]
    inv = _create_invoice(db, ag, kind=InvoiceKind.OTHER.value, period=None, issue_date=issue_date,
                          due_date=due_date, items=lines, notes=notes, actor=actor, today=today or date.today())
    audit(db, actor=actor, action="invoice.created", entity_type="invoice", entity_id=inv.id,
          summary=f"Raised invoice {inv.invoice_number} for {inv.amount_charged} {inv.currency}", request=request)
    return inv


def add_adjustment(db: Session, inv: Invoice, *, kind: str, amount: Decimal, reason: str, actor: User,
                   request: Request | None, today: date | None = None) -> FinancialAdjustment:
    today = today or date.today()
    if inv.status == InvoiceStatus.VOID.value:
        raise Conflict("Void invoices cannot be adjusted")
    if not reason.strip():
        raise DomainError("A reason is required for every adjustment")
    amount = _amount(amount, inv.currency)
    if kind == AdjustmentKind.CREDIT.value and amount > inv.balance_due:
        raise Conflict(f"A credit cannot exceed the outstanding balance ({inv.balance_due} {inv.currency})")
    adj = FinancialAdjustment(invoice_id=inv.id, tenant_id=inv.tenant_id, kind=kind, amount=amount,
                              currency=inv.currency, reason=reason, created_by_id=actor.id)
    db.add(adj)
    if kind == AdjustmentKind.DEBIT.value:
        inv.items.append(InvoiceItem(kind=InvoiceItemKind.ADJUSTMENT.value,
                                     description=f"Adjustment: {reason}"[:255], amount=amount))
    ledger.recompute_invoice(db, inv, today)
    audit(db, actor=actor, action=f"invoice.{kind}", entity_type="invoice", entity_id=inv.id,
          summary=f"{kind.title()} of {amount} {inv.currency} on {inv.invoice_number}: {reason}", request=request)
    return adj


def void_invoice(db: Session, inv: Invoice, *, reason: str, actor: User, request: Request | None) -> None:
    if inv.status == InvoiceStatus.VOID.value:
        raise Conflict("Invoice is already void")
    if not reason.strip():
        raise DomainError("A reason is required to void an invoice")
    live = db.execute(
        select(func.count()).select_from(PaymentAllocation)
        .join(Payment, Payment.id == PaymentAllocation.payment_id)
        .where(PaymentAllocation.invoice_id == inv.id,
               Payment.status.in_([PaymentStatus.APPROVED.value, PaymentStatus.PENDING.value]))
    ).scalar_one()
    if live:
        raise Conflict("This invoice has pending or approved payments. Reverse/reject them, "
                       "or use a credit adjustment instead.")
    if inv.amount_credited > 0:
        raise Conflict("This invoice has credit adjustments; it cannot be voided")
    inv.status = InvoiceStatus.VOID.value
    inv.void_reason = reason
    inv.voided_at = datetime.now(UTC)
    inv.voided_by_id = actor.id
    audit(db, actor=actor, action="invoice.voided", entity_type="invoice", entity_id=inv.id,
          summary=f"Voided {inv.invoice_number}: {reason}", request=request)


# -------------------------------------------------------------- payments ----


def _check_method(db: Session, code: str) -> None:
    m = db.execute(select(PaymentMethod).where(PaymentMethod.code == code)).scalar_one_or_none()
    if m is None or not m.is_active:
        raise DomainError("Choose an active payment method")


def record_payment(db: Session, data: dict, *, actor: User, request: Request | None,
                   notify_approvers: bool = True) -> Payment:
    ag = db.execute(select(RentalAgreement).where(RentalAgreement.id == data["agreement_id"])).unique().scalar_one_or_none()
    if ag is None:
        raise NotFound("Rental agreement not found")
    if ag.status == AgreementStatus.DRAFT.value:
        raise Conflict("Payments can only be recorded against activated agreements")
    currency = data.get("currency") or ag.currency
    if currency != ag.currency:
        raise DomainError(f"This agreement is billed in {ag.currency}; record the payment in {ag.currency}")
    amount = _amount(data["amount"], currency)
    _check_method(db, data["method_code"])
    if data["payment_date"] > date.today():
        raise DomainError("Payment date cannot be in the future")
    reference = (data.get("transaction_reference") or "").strip()
    if reference:
        dup = db.execute(select(Payment.payment_number).where(
            Payment.method_code == data["method_code"],
            func.lower(Payment.transaction_reference) == reference.lower(),
            Payment.status.in_([PaymentStatus.PENDING.value, PaymentStatus.APPROVED.value]),
        )).scalar_one_or_none()
        if dup:
            raise Conflict(f"Transaction reference {reference} is already recorded on payment {dup}",
                           code="duplicate_reference")
    payment = Payment(
        payment_number=next_number(db, "PAY", period=data["payment_date"]),
        tenant_id=ag.tenant_id, agreement_id=ag.id, unit_id=ag.unit_id, amount=amount, currency=currency,
        payment_date=data["payment_date"], method_code=data["method_code"], transaction_reference=reference,
        notes=data.get("notes") or "", status=PaymentStatus.PENDING.value, recorded_by_id=actor.id,
        evidence_key=data.get("evidence_key"), evidence_name=data.get("evidence_name"),
        rejection_reason="", reversal_reason="", months_covered=data.get("months_covered") or None,
    )
    requested = data.get("allocations") or []
    if payment.months_covered:
        if requested:
            raise DomainError("Choose either the months this payment covers or the invoices to apply it to, not both")
        if not 1 <= payment.months_covered <= MAX_MONTHS:
            raise DomainError(f"A payment can cover 1 to {MAX_MONTHS} months")
        if ag.status != AgreementStatus.ACTIVE.value:
            raise Conflict("Months ahead can only be paid on an active agreement")
        available = len(coverage_plan(db, ag, payment.months_covered))
        if available < payment.months_covered:
            raise DomainError(f"Only {available} unpaid month(s) of rent remain on this agreement", code="months_unavailable")
    total = ZERO
    seen: set[int] = set()
    for alloc in requested:
        inv = get_invoice(db, alloc["invoice_id"])
        if inv.id in seen:
            raise DomainError("Each invoice can appear only once in the allocation")
        seen.add(inv.id)
        if inv.tenant_id != ag.tenant_id or inv.currency != currency:
            raise DomainError(f"Invoice {inv.invoice_number} belongs to another tenant or currency")
        if inv.status in (InvoiceStatus.VOID.value, InvoiceStatus.PAID.value):
            raise DomainError(f"Invoice {inv.invoice_number} is {inv.status}")
        a = _amount(alloc["amount"], currency)
        if a > inv.balance_due:
            raise DomainError(f"Allocation to {inv.invoice_number} exceeds its balance ({inv.balance_due})")
        total += a
        payment.allocations.append(PaymentAllocation(invoice_id=inv.id, amount=a))
    if total > amount:
        raise DomainError("Allocations add up to more than the amount received")
    db.add(payment)
    try:
        db.flush()
    except IntegrityError as exc:
        raise Conflict("This transaction reference is already recorded", code="duplicate_reference") from exc
    audit(db, actor=actor, action="payment.recorded", entity_type="payment", entity_id=payment.id,
          summary=f"Recorded pending payment {payment.payment_number}: {amount} {currency} via "
                  f"{data['method_code']} from {ag.tenant.full_name}", request=request)
    if notify_approvers:
        notify_pending(db, payment)
    return payment


EDITABLE = ("amount", "payment_date", "method_code", "transaction_reference", "notes", "months_covered")


def update_payment(db: Session, p: Payment, data: dict, *, actor: User, request: Request | None,
                   today: date | None = None) -> Payment:
    """Correct a pending or approved payment.

    Details (date, method, reference, notes) change in place. When an approved
    payment's amount or months change, its money is taken off its invoices and
    applied again (chosen months first, then oldest open invoices), so balances
    always match the corrected payment."""
    today = today or date.today()
    if p.status not in (PaymentStatus.PENDING.value, PaymentStatus.APPROVED.value):
        raise Conflict(f"A {p.status} payment cannot be edited", code="not_editable")
    changes: dict = {}
    if "amount" in data and data["amount"] is not None:
        amount = _amount(data["amount"], p.currency)
        if amount != p.amount:
            changes["amount"] = (str(p.amount), str(amount))
    if data.get("payment_date") and data["payment_date"] != p.payment_date:
        if data["payment_date"] > today:
            raise DomainError("Payment date cannot be in the future")
        changes["payment_date"] = (p.payment_date.isoformat(), data["payment_date"].isoformat())
    if data.get("method_code") and data["method_code"] != p.method_code:
        _check_method(db, data["method_code"])
        changes["method_code"] = (p.method_code, data["method_code"])
    if "transaction_reference" in data and data["transaction_reference"] is not None:
        ref = data["transaction_reference"].strip()
        if ref != p.transaction_reference:
            changes["transaction_reference"] = (p.transaction_reference, ref)
    if "notes" in data and data["notes"] is not None and data["notes"] != p.notes:
        changes["notes"] = ("…", "…")
    if "months_covered" in data:
        m = data["months_covered"] or None
        if m is not None and not 1 <= m <= MAX_MONTHS:
            raise DomainError(f"A payment can cover 1 to {MAX_MONTHS} months")
        if m != p.months_covered:
            changes["months_covered"] = (p.months_covered, m)
    if not changes:
        return p

    method = changes.get("method_code", (None, p.method_code))[1]
    ref = changes.get("transaction_reference", (None, p.transaction_reference))[1]
    if ref and ("transaction_reference" in changes or "method_code" in changes):
        dup = db.execute(select(Payment.payment_number).where(
            Payment.id != p.id, Payment.method_code == method, func.lower(Payment.transaction_reference) == ref.lower(),
            Payment.status.in_([PaymentStatus.PENDING.value, PaymentStatus.APPROVED.value]),
        )).scalar_one_or_none()
        if dup:
            raise Conflict(f"Transaction reference {ref} is already recorded on payment {dup}", code="duplicate_reference")

    reapply = p.status == PaymentStatus.APPROVED.value and ("amount" in changes or "months_covered" in changes)
    old_invoices: set[int] = set()
    if reapply:
        old_invoices = {a.invoice_id for a in p.allocations}
        if old_invoices:
            db.execute(select(Invoice.id).where(Invoice.id.in_(old_invoices)).order_by(Invoice.id).with_for_update())
        p.allocations.clear()
        db.flush()
        for inv_id in sorted(old_invoices):
            ledger.recompute_invoice(db, get_invoice(db, inv_id), today)
        db.flush()
    elif p.status == PaymentStatus.PENDING.value and "amount" in changes:
        # Requested allocations larger than the new amount are trimmed on approval; drop them if they no longer fit.
        if sum((a.amount for a in p.allocations), ZERO) > _amount(data["amount"], p.currency):
            p.allocations.clear()

    if "amount" in changes:
        p.amount = _amount(data["amount"], p.currency)
    if "payment_date" in changes:
        p.payment_date = data["payment_date"]
    if "method_code" in changes:
        p.method_code = data["method_code"]
    if "transaction_reference" in changes:
        p.transaction_reference = ref
    if "notes" in changes:
        p.notes = data["notes"]
    if "months_covered" in changes:
        p.months_covered = changes["months_covered"][1]
        if p.months_covered and p.status == PaymentStatus.PENDING.value:
            p.allocations.clear()
    try:
        db.flush()
    except IntegrityError as exc:
        raise Conflict("This transaction reference is already recorded", code="duplicate_reference") from exc

    if reapply:
        touched = _allocate(db, p, today=today, auto=True)
        db.flush()
        for inv_id in sorted(touched - old_invoices):
            ledger.recompute_invoice(db, get_invoice(db, inv_id), today)
        for inv_id in sorted(touched & old_invoices):
            ledger.recompute_invoice(db, get_invoice(db, inv_id), today)
    db.expire(p)
    audit(db, actor=actor, action="payment.edited", entity_type="payment", entity_id=p.id,
          summary=f"Edited {p.payment_number}: " + ", ".join(
              f"{k.replace('_', ' ')} {a} → {b}" if k != "notes" else "notes" for k, (a, b) in changes.items()),
          changes={k: {"from": a, "to": b} for k, (a, b) in changes.items() if k != "notes"}, request=request)
    return p


def notify_pending(db: Session, payment: Payment) -> None:
    notify(db, permission="payments.approve", kind="payment_pending",
           title=f"Payment awaiting approval: {payment.amount:,} {payment.currency}",
           body=f"{payment.tenant.full_name} · {payment.unit.code} · {payment.payment_number}",
           link="/admin/finance/approvals", dedupe_key=f"payment-pending-{payment.id}")


def possible_duplicates(db: Session, p: Payment) -> list[Payment]:
    """Approved payments that look like the same money recorded twice."""
    return list(db.execute(select(Payment).where(
        Payment.id != p.id, Payment.status == PaymentStatus.APPROVED.value,
        Payment.tenant_id == p.tenant_id, Payment.amount == p.amount, Payment.currency == p.currency,
        Payment.payment_date == p.payment_date, Payment.method_code == p.method_code,
    )).unique().scalars())


def _allocate(db: Session, p: Payment, *, today: date, auto: bool) -> set[int]:
    """Cap requested allocations at current balances, then auto-apply the rest
    oldest-first. Returns ids of every invoice to recompute."""
    touched: set[int] = set()
    remaining = p.amount
    invoice_ids = sorted(a.invoice_id for a in p.allocations)
    locked = {i.id: i for i in db.execute(
        select(Invoice).where(Invoice.id.in_(invoice_ids)).order_by(Invoice.id).with_for_update(of=Invoice)
    ).unique().scalars()} if invoice_ids else {}
    for alloc in list(p.allocations):
        inv = locked[alloc.invoice_id]
        cap = min(alloc.amount, inv.balance_due if inv.status != InvoiceStatus.VOID.value else ZERO, remaining)
        if cap <= 0:
            p.allocations.remove(alloc)
            continue
        alloc.amount = cap
        remaining -= cap
        touched.add(inv.id)
    db.flush()
    if p.months_covered and remaining > 0:
        ag = p.agreement
        for entry in coverage_plan(db, ag, p.months_covered, today=today):
            if remaining <= 0:
                break
            inv, _made = _ensure_rent_invoice(db, ag, entry["year"], entry["month"], actor=None, today=today)
            if inv is None:
                continue
            db.flush()
            db.execute(select(Invoice.id).where(Invoice.id == inv.id).with_for_update())
            existing = next((a for a in p.allocations if a.invoice_id == inv.id), None)
            room = inv.balance_due - (existing.amount if existing else ZERO)
            take = min(room, remaining)
            if take <= 0:
                continue
            if existing:
                existing.amount += take
            else:
                p.allocations.append(PaymentAllocation(invoice_id=inv.id, amount=take))
            remaining -= take
            touched.add(inv.id)
        db.flush()
    if auto and remaining > 0:
        for inv in ledger.open_invoices(db, tenant_id=p.tenant_id, currency=p.currency,
                                        agreement_id=p.agreement_id, lock=True):
            if remaining <= 0:
                break
            existing = next((a for a in p.allocations if a.invoice_id == inv.id), None)
            room = inv.balance_due - (existing.amount if existing else ZERO)
            if room <= 0:
                continue
            take = min(room, remaining)
            if existing:
                existing.amount += take
            else:
                p.allocations.append(PaymentAllocation(invoice_id=inv.id, amount=take))
            remaining -= take
            touched.add(inv.id)
    return touched


def approve_payment(db: Session, p: Payment, *, actor: User, confirm_duplicate: bool, auto_allocate: bool,
                    note: str, request: Request | None, today: date | None = None) -> Payment:
    today = today or date.today()
    if p.status != PaymentStatus.PENDING.value:
        raise Conflict(f"Only pending payments can be approved (this one is {p.status})", code="not_pending")
    dups = possible_duplicates(db, p)
    if dups and not confirm_duplicate:
        raise Conflict(
            "An approved payment with the same tenant, amount, date and method already exists. "
            "Confirm that this is a separate payment to approve it.",
            code="possible_duplicate",
            details={"payments": [d.payment_number for d in dups]},
        )
    touched = _allocate(db, p, today=today, auto=auto_allocate)
    p.status = PaymentStatus.APPROVED.value
    p.reviewed_by_id = actor.id
    p.reviewed_at = datetime.now(UTC)
    if note.strip():
        p.notes = (p.notes + "\n" if p.notes else "") + f"Approval note: {note.strip()}"
    db.flush()
    for inv_id in touched:
        ledger.recompute_invoice(db, get_invoice(db, inv_id), today)
    audit(db, actor=actor, action="payment.approved", entity_type="payment", entity_id=p.id,
          summary=f"Approved {p.payment_number}: {p.amount} {p.currency}"
                  + (f" (confirmed not a duplicate of {', '.join(d.payment_number for d in dups)})" if dups else ""),
          changes={"allocations": [{"invoice_id": a.invoice_id, "amount": str(a.amount)} for a in p.allocations]},
          request=request)
    return p


def reject_payment(db: Session, p: Payment, *, actor: User, reason: str, request: Request | None) -> Payment:
    if p.status != PaymentStatus.PENDING.value:
        raise Conflict(f"Only pending payments can be rejected (this one is {p.status})", code="not_pending")
    if len(reason.strip()) < 3:
        raise DomainError("A rejection reason is required")
    p.status = PaymentStatus.REJECTED.value
    p.rejection_reason = reason.strip()
    p.reviewed_by_id = actor.id
    p.reviewed_at = datetime.now(UTC)
    audit(db, actor=actor, action="payment.rejected", entity_type="payment", entity_id=p.id,
          summary=f"Rejected {p.payment_number}: {reason.strip()}", request=request)
    return p


def reverse_payment(db: Session, p: Payment, *, actor: User, reason: str, request: Request | None,
                    today: date | None = None) -> Payment:
    today = today or date.today()
    if p.status != PaymentStatus.APPROVED.value:
        raise Conflict("Only approved payments can be reversed", code="not_approved")
    if len(reason.strip()) < 3:
        raise DomainError("A reversal reason is required")
    invoice_ids = sorted({a.invoice_id for a in p.allocations})
    if invoice_ids:
        db.execute(select(Invoice.id).where(Invoice.id.in_(invoice_ids)).order_by(Invoice.id).with_for_update())
    p.status = PaymentStatus.REVERSED.value
    p.reversal_reason = reason.strip()
    p.reversed_by_id = actor.id
    p.reversed_at = datetime.now(UTC)
    db.flush()
    for inv_id in invoice_ids:
        ledger.recompute_invoice(db, get_invoice(db, inv_id), today)
    audit(db, actor=actor, action="payment.reversed", entity_type="payment", entity_id=p.id,
          summary=f"Reversed {p.payment_number} ({p.amount} {p.currency}): {reason.strip()}", request=request)
    return p


def apply_credit(db: Session, p: Payment, *, actor: User, request: Request | None, today: date | None = None) -> Payment:
    """Apply the unallocated part of an approved payment to open invoices."""
    today = today or date.today()
    if p.status != PaymentStatus.APPROVED.value:
        raise Conflict("Only approved payments carry credit")
    if p.unapplied_amount <= 0:
        raise Conflict("This payment is fully allocated")
    remaining = p.unapplied_amount
    touched: set[int] = set()
    for inv in ledger.open_invoices(db, tenant_id=p.tenant_id, currency=p.currency,
                                    agreement_id=p.agreement_id, lock=True):
        if remaining <= 0:
            break
        take = min(inv.balance_due, remaining)
        existing = next((a for a in p.allocations if a.invoice_id == inv.id), None)
        if existing:
            existing.amount += take
        else:
            p.allocations.append(PaymentAllocation(invoice_id=inv.id, amount=take))
        remaining -= take
        touched.add(inv.id)
    if not touched:
        raise Conflict("There are no open invoices in this currency to apply the credit to")
    db.flush()
    for inv_id in touched:
        ledger.recompute_invoice(db, get_invoice(db, inv_id), today)
    audit(db, actor=actor, action="payment.credit_applied", entity_type="payment", entity_id=p.id,
          summary=f"Applied credit from {p.payment_number} to {len(touched)} invoice(s)", request=request)
    return p
