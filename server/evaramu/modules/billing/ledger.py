"""Ledger calculations shared by invoices, payments, tenants and reports.

Every figure here is computed per currency. Nothing ever adds RWF to USD.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import date
from decimal import Decimal

from sqlalchemy import case, func, select, update
from sqlalchemy.orm import Session

from evaramu.modules.billing.models import (
    AdjustmentKind,
    FinancialAdjustment,
    Invoice,
    InvoiceItem,
    InvoiceStatus,
    Payment,
    PaymentAllocation,
    PaymentStatus,
)

ZERO = Decimal("0")
OPEN_STATUSES = (InvoiceStatus.UNPAID.value, InvoiceStatus.PARTIALLY_PAID.value, InvoiceStatus.OVERDUE.value)

BALANCE = Invoice.amount_charged - Invoice.amount_credited - Invoice.amount_paid


def status_for(invoice: Invoice, today: date) -> str:
    if invoice.status == InvoiceStatus.VOID.value:
        return InvoiceStatus.VOID.value
    balance = invoice.amount_charged - invoice.amount_credited - invoice.amount_paid
    if balance <= 0:
        return InvoiceStatus.PAID.value
    if invoice.due_date < today:
        return InvoiceStatus.OVERDUE.value
    if invoice.amount_paid > 0 or invoice.amount_credited > 0:
        return InvoiceStatus.PARTIALLY_PAID.value
    return InvoiceStatus.UNPAID.value


def recompute_invoice(db: Session, invoice: Invoice, today: date) -> None:
    """Re-derive an invoice's totals from its items, adjustments and approved
    payment allocations, then its status. Call inside the transaction that
    changed any of them."""
    db.flush()
    invoice.amount_charged = db.execute(
        select(func.coalesce(func.sum(InvoiceItem.amount), 0)).where(InvoiceItem.invoice_id == invoice.id)
    ).scalar_one()
    invoice.amount_credited = db.execute(
        select(func.coalesce(func.sum(FinancialAdjustment.amount), 0)).where(
            FinancialAdjustment.invoice_id == invoice.id,
            FinancialAdjustment.kind == AdjustmentKind.CREDIT.value,
        )
    ).scalar_one()
    invoice.amount_paid = db.execute(
        select(func.coalesce(func.sum(PaymentAllocation.amount), 0))
        .join(Payment, Payment.id == PaymentAllocation.payment_id)
        .where(PaymentAllocation.invoice_id == invoice.id, Payment.status == PaymentStatus.APPROVED.value)
    ).scalar_one()
    invoice.status = status_for(invoice, today)
    db.flush()


def refresh_overdue(db: Session, today: date) -> int:
    """Flag open invoices whose due date has passed. Idempotent."""
    result = db.execute(
        update(Invoice)
        .where(
            Invoice.status.in_([InvoiceStatus.UNPAID.value, InvoiceStatus.PARTIALLY_PAID.value]),
            Invoice.due_date < today,
            BALANCE > 0,
        )
        .values(status=InvoiceStatus.OVERDUE.value)
        .execution_options(synchronize_session=False)
    )
    return result.rowcount or 0


def outstanding_by_tenant(db: Session, tenant_ids: list[int]) -> dict[int, dict[str, Decimal]]:
    if not tenant_ids:
        return {}
    rows = db.execute(
        select(Invoice.tenant_id, Invoice.currency, func.sum(BALANCE))
        .where(Invoice.tenant_id.in_(tenant_ids), Invoice.status.in_(OPEN_STATUSES))
        .group_by(Invoice.tenant_id, Invoice.currency)
    ).all()
    out: dict[int, dict[str, Decimal]] = defaultdict(dict)
    for tid, cur, amount in rows:
        out[tid][cur] = amount
    return out


def tenants_with_balance_query():
    return select(Invoice.tenant_id).where(Invoice.status.in_(OPEN_STATUSES), BALANCE > 0)


def outstanding_for_agreement(db: Session, agreement_id: int, currency: str, *, exclude_invoice_id: int | None = None) -> Decimal:
    stmt = select(func.coalesce(func.sum(BALANCE), 0)).where(
        Invoice.agreement_id == agreement_id, Invoice.currency == currency, Invoice.status.in_(OPEN_STATUSES)
    )
    if exclude_invoice_id:
        stmt = stmt.where(Invoice.id != exclude_invoice_id)
    return db.execute(stmt).scalar_one()


def _allocated_subq():
    return (
        select(PaymentAllocation.payment_id, func.sum(PaymentAllocation.amount).label("allocated"))
        .group_by(PaymentAllocation.payment_id)
        .subquery()
    )


def credit_by_tenant(db: Session, tenant_ids: list[int]) -> dict[int, dict[str, Decimal]]:
    """Approved money received but not applied to any invoice (prepayments)."""
    if not tenant_ids:
        return {}
    alloc = _allocated_subq()
    rows = db.execute(
        select(Payment.tenant_id, Payment.currency,
               func.sum(Payment.amount - func.coalesce(alloc.c.allocated, 0)))
        .outerjoin(alloc, alloc.c.payment_id == Payment.id)
        .where(Payment.tenant_id.in_(tenant_ids), Payment.status == PaymentStatus.APPROVED.value)
        .group_by(Payment.tenant_id, Payment.currency)
    ).all()
    out: dict[int, dict[str, Decimal]] = defaultdict(dict)
    for tid, cur, amount in rows:
        out[tid][cur] = amount
    return out


def paid_by_tenant(db: Session, tenant_id: int) -> dict[str, Decimal]:
    rows = db.execute(
        select(Payment.currency, func.sum(Payment.amount))
        .where(Payment.tenant_id == tenant_id, Payment.status == PaymentStatus.APPROVED.value)
        .group_by(Payment.currency)
    ).all()
    return {c: a for c, a in rows}


def open_invoices(db: Session, *, tenant_id: int, currency: str, agreement_id: int | None = None,
                  lock: bool = False) -> list[Invoice]:
    """Open invoices oldest first — the order used for automatic allocation.
    The given agreement's invoices come before the tenant's other agreements."""
    stmt = (
        select(Invoice)
        .where(Invoice.tenant_id == tenant_id, Invoice.currency == currency,
               Invoice.status.in_(OPEN_STATUSES), BALANCE > 0)
        .order_by(
            case((Invoice.agreement_id == agreement_id, 0), else_=1) if agreement_id else Invoice.id,
            Invoice.due_date, Invoice.id,
        )
    )
    if lock:
        stmt = stmt.with_for_update(of=Invoice)
    return list(db.execute(stmt).unique().scalars())


def sum_by_currency(rows) -> dict[str, Decimal]:
    out: dict[str, Decimal] = defaultdict(lambda: ZERO)
    for cur, amount in rows:
        out[cur] += amount or ZERO
    return dict(out)

