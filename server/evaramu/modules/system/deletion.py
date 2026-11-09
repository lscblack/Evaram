"""Permanent deletion of records and everything that depends on them.

One rule set for payments, invoices, agreements, tenants, units and
properties. ``preview`` tells the user exactly what will go before anything is
removed; ``delete`` removes it in one transaction:

* a payment takes its allocations with it; invoices it paid are recomputed and
  become unpaid again;
* an invoice takes its items, adjustments and allocations; payments that paid
  it (from outside the deletion) stay recorded and become unapplied credit;
* an agreement takes its invoices, payments, deposits and contract documents;
  an occupied unit becomes available again;
* a tenant takes all of their agreements (and so everything above);
* a unit takes its rooms, their agreements and photos; a property takes all of
  its units. Tenants themselves are kept.

Audit-log entries are never deleted: the deletion itself is audited.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import Annotated, Literal

from fastapi import APIRouter, BackgroundTasks, Depends, Request
from pydantic import BaseModel
from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.orm import Session

from evaramu.core.deps import DB, require
from evaramu.core.errors import NotFound
from evaramu.core.storage import delete_evidence, delete_media
from evaramu.modules.agreements.models import AgreementDocument, AgreementStatus, DepositTransaction, RentalAgreement
from evaramu.modules.billing import ledger
from evaramu.modules.billing.models import (
    FinancialAdjustment,
    Invoice,
    InvoiceItem,
    Payment,
    PaymentAllocation,
    PaymentStatus,
)
from evaramu.modules.identity.models import User
from evaramu.modules.properties.models import Property, PropertyImage, RentalUnit, ReservedCode, UnitStatus
from evaramu.modules.properties.service import record_status
from evaramu.modules.system.models import Notification
from evaramu.modules.system.services import audit
from evaramu.modules.tenants.models import Tenant

Kind = Literal["payment", "invoice", "agreement", "tenant", "unit", "property"]


@dataclass
class Scope:
    kind: str
    label: str
    tenants: set[int] = field(default_factory=set)
    properties: set[int] = field(default_factory=set)
    units: set[int] = field(default_factory=set)
    agreements: set[int] = field(default_factory=set)
    invoices: set[int] = field(default_factory=set)
    payments: set[int] = field(default_factory=set)


def _ids(db: Session, stmt) -> set[int]:
    return set(db.execute(stmt).scalars())


def _with_rooms(db: Session, unit_ids: set[int]) -> set[int]:
    found, frontier = set(unit_ids), set(unit_ids)
    while frontier:
        frontier = _ids(db, select(RentalUnit.id).where(RentalUnit.parent_unit_id.in_(frontier))) - found
        found |= frontier
    return found


def _fill_from_agreements(db: Session, s: Scope) -> None:
    if s.units:
        s.agreements |= _ids(db, select(RentalAgreement.id).where(RentalAgreement.unit_id.in_(s.units)))
    if s.agreements:
        s.invoices |= _ids(db, select(Invoice.id).where(Invoice.agreement_id.in_(s.agreements)))
        s.payments |= _ids(db, select(Payment.id).where(Payment.agreement_id.in_(s.agreements)))


def collect(db: Session, kind: str, record_id: int) -> Scope:
    if kind == "payment":
        p = db.get(Payment, record_id)
        if p is None:
            raise NotFound("Payment not found")
        return Scope(kind, f"payment {p.payment_number}", payments={p.id})
    if kind == "invoice":
        inv = db.get(Invoice, record_id)
        if inv is None:
            raise NotFound("Invoice not found")
        return Scope(kind, f"invoice {inv.invoice_number}", invoices={inv.id})
    if kind == "agreement":
        ag = db.get(RentalAgreement, record_id)
        if ag is None:
            raise NotFound("Rental agreement not found")
        s = Scope(kind, f"agreement {ag.agreement_number}", agreements={ag.id})
    elif kind == "tenant":
        t = db.get(Tenant, record_id)
        if t is None:
            raise NotFound("Tenant not found")
        s = Scope(kind, f"tenant {t.full_name}", tenants={t.id})
        s.agreements = _ids(db, select(RentalAgreement.id).where(RentalAgreement.tenant_id == t.id))
    elif kind == "unit":
        u = db.get(RentalUnit, record_id)
        if u is None:
            raise NotFound("Unit not found")
        s = Scope(kind, f"unit {u.code}", units=_with_rooms(db, {u.id}))
    elif kind == "property":
        prop = db.get(Property, record_id)
        if prop is None:
            raise NotFound("Property not found")
        s = Scope(kind, f"property {prop.name} ({prop.code})", properties={prop.id})
        s.units = _with_rooms(db, _ids(db, select(RentalUnit.id).where(RentalUnit.property_id == prop.id)))
    else:  # pragma: no cover - guarded by the router's Literal
        raise NotFound("Unknown record type")
    _fill_from_agreements(db, s)
    return s


# ----------------------------------------------------------------- preview ----


class MoneyLine(BaseModel):
    currency: str
    amount: str


class DeletePreview(BaseModel):
    kind: str
    label: str
    removes: dict[str, int]
    approved_money_removed: list[MoneyLine]
    invoices_reopened: int        # invoices that stay but lose the payments being deleted
    payments_to_credit: int       # payments that stay but lose the invoices being deleted
    warnings: list[str]


def _outside_effects(db: Session, s: Scope) -> tuple[set[int], set[int]]:
    """(invoices kept that lose allocations, payments kept that lose allocations)."""
    reopened: set[int] = set()
    credited: set[int] = set()
    if s.payments:
        reopened = _ids(db, select(PaymentAllocation.invoice_id).join(Payment).where(
            PaymentAllocation.payment_id.in_(s.payments), Payment.status == PaymentStatus.APPROVED.value,
        )) - s.invoices
    if s.invoices:
        credited = _ids(db, select(PaymentAllocation.payment_id).join(Payment).where(
            PaymentAllocation.invoice_id.in_(s.invoices),
            Payment.status.in_([PaymentStatus.APPROVED.value, PaymentStatus.PENDING.value]),
        )) - s.payments
    return reopened, credited


def preview(db: Session, s: Scope) -> DeletePreview:
    count = lambda model, col, ids: db.execute(  # noqa: E731
        select(func.count()).select_from(model).where(col.in_(ids))).scalar_one() if ids else 0
    removes = {
        "properties": len(s.properties),
        "units": len(s.units),
        "photos": db.execute(select(func.count()).select_from(PropertyImage).where(or_(
            PropertyImage.property_id.in_(s.properties or {0}), PropertyImage.unit_id.in_(s.units or {0})))).scalar_one(),
        "tenants": len(s.tenants),
        "agreements": len(s.agreements),
        "documents": count(AgreementDocument, AgreementDocument.agreement_id, s.agreements),
        "deposits": count(DepositTransaction, DepositTransaction.agreement_id, s.agreements),
        "invoices": len(s.invoices),
        "payments": len(s.payments),
    }
    money: dict[str, Decimal] = defaultdict(Decimal)
    if s.payments:
        for cur, amt in db.execute(select(Payment.currency, func.sum(Payment.amount)).where(
                Payment.id.in_(s.payments), Payment.status == PaymentStatus.APPROVED.value).group_by(Payment.currency)):
            money[cur] += amt
    reopened, credited = _outside_effects(db, s)
    warnings: list[str] = []
    if money:
        warnings.append("Approved payments are removed from the books and from every report.")
    if s.agreements and db.execute(select(func.count()).select_from(RentalAgreement).where(
            RentalAgreement.id.in_(s.agreements), RentalAgreement.status == AgreementStatus.ACTIVE.value)).scalar_one():
        if s.kind in ("agreement", "tenant"):
            warnings.append("An active tenancy is removed; its unit becomes available again.")
    if reopened:
        warnings.append(f"{len(reopened)} invoice(s) that stay will show as unpaid again.")
    if credited:
        warnings.append(f"{len(credited)} payment(s) that stay will become unapplied credit.")
    return DeletePreview(
        kind=s.kind, label=s.label, removes={k: v for k, v in removes.items() if v},
        approved_money_removed=[MoneyLine(currency=c, amount=str(a)) for c, a in sorted(money.items())],
        invoices_reopened=len(reopened), payments_to_credit=len(credited), warnings=warnings,
    )


# ------------------------------------------------------------------ delete ----


def purge(db: Session, s: Scope, *, actor: User, request: Request | None) -> tuple[DeletePreview, list[str], list[str]]:
    """Delete everything in scope. Returns (summary, media keys, evidence keys) —
    files are removed by the caller only after the transaction commits."""
    summary = preview(db, s)
    reopened, _ = _outside_effects(db, s)
    # Lock what is about to change so concurrent approvals cannot interleave.
    if s.invoices | reopened:
        db.execute(select(Invoice.id).where(Invoice.id.in_(s.invoices | reopened)).order_by(Invoice.id).with_for_update())
    if s.payments:
        db.execute(select(Payment.id).where(Payment.id.in_(s.payments)).order_by(Payment.id).with_for_update())

    evidence = [k for k in db.execute(select(Payment.evidence_key).where(
        Payment.id.in_(s.payments or {0}), Payment.evidence_key.is_not(None))).scalars() if k]
    images = db.execute(select(PropertyImage.storage_key, PropertyImage.thumb_key).where(or_(
        PropertyImage.property_id.in_(s.properties or {0}), PropertyImage.unit_id.in_(s.units or {0})))).all()
    occupied_units = _ids(db, select(RentalAgreement.unit_id).where(
        RentalAgreement.id.in_(s.agreements or {0}), RentalAgreement.status == AgreementStatus.ACTIVE.value)) - s.units

    if s.payments or s.invoices:
        db.execute(delete(PaymentAllocation).where(or_(PaymentAllocation.payment_id.in_(s.payments or {0}),
                                                       PaymentAllocation.invoice_id.in_(s.invoices or {0}))))
    if s.payments:
        db.execute(delete(Notification).where(Notification.dedupe_key.in_([f"payment-pending-{i}" for i in s.payments])))
        db.execute(delete(Payment).where(Payment.id.in_(s.payments)))
    if s.invoices:
        db.execute(delete(FinancialAdjustment).where(FinancialAdjustment.invoice_id.in_(s.invoices)))
        db.execute(delete(InvoiceItem).where(InvoiceItem.invoice_id.in_(s.invoices)))
        db.execute(delete(Invoice).where(Invoice.id.in_(s.invoices)))
    if s.agreements:
        db.execute(delete(DepositTransaction).where(DepositTransaction.agreement_id.in_(s.agreements)))
        db.execute(delete(AgreementDocument).where(AgreementDocument.agreement_id.in_(s.agreements)))
        db.execute(update(RentalAgreement).where(RentalAgreement.renewed_from_id.in_(s.agreements))
                   .values(renewed_from_id=None))
        db.execute(delete(RentalAgreement).where(RentalAgreement.id.in_(s.agreements)))
    if s.units:
        db.execute(delete(PropertyImage).where(PropertyImage.unit_id.in_(s.units)))
        db.execute(update(RentalUnit).where(RentalUnit.parent_unit_id.in_(s.units)).values(parent_unit_id=None))
        db.execute(delete(ReservedCode).where(ReservedCode.entity_type == "unit", ReservedCode.entity_id.in_(s.units)))
        db.execute(delete(RentalUnit).where(RentalUnit.id.in_(s.units)))
    if s.properties:
        db.execute(delete(PropertyImage).where(PropertyImage.property_id.in_(s.properties)))
        db.execute(delete(ReservedCode).where(ReservedCode.entity_type == "property",
                                              ReservedCode.entity_id.in_(s.properties)))
        db.execute(delete(Property).where(Property.id.in_(s.properties)))
    if s.tenants:
        db.execute(delete(Tenant).where(Tenant.id.in_(s.tenants)))
    db.flush()
    db.expire_all()

    today = date.today()
    for inv in db.execute(select(Invoice).where(Invoice.id.in_(reopened or {0}))).unique().scalars():
        ledger.recompute_invoice(db, inv, today)
    for unit in db.execute(select(RentalUnit).where(RentalUnit.id.in_(occupied_units or {0}))).unique().scalars():
        still_let = db.execute(select(func.count()).select_from(RentalAgreement).where(
            RentalAgreement.unit_id == unit.id, RentalAgreement.status == AgreementStatus.ACTIVE.value)).scalar_one()
        if not still_let and unit.status == UnitStatus.OCCUPIED.value:
            record_status(db, unit, UnitStatus.AVAILABLE.value, actor=actor, reason=f"Deleted {s.label}")

    removed = ", ".join(f"{v} {k}" for k, v in summary.removes.items())
    audit(db, actor=actor, action=f"{s.kind}.deleted", entity_type=s.kind, entity_id=None,
          summary=f"Permanently deleted {s.label}" + (f" ({removed})" if removed else ""),
          changes={"removes": summary.removes,
                   "approved_money_removed": [m.model_dump() for m in summary.approved_money_removed]},
          request=request)
    return summary, [k for pair in images for k in pair if k], evidence


# ------------------------------------------------------------------ router ----

router = APIRouter(tags=["deletion"])
Deleter = Annotated[User, Depends(require("records.delete"))]


@router.get("/records/{kind}/{record_id}/delete-preview", response_model=DeletePreview)
def delete_preview(kind: Kind, record_id: int, db: DB, _: Deleter):
    return preview(db, collect(db, kind, record_id))


@router.delete("/records/{kind}/{record_id}", response_model=DeletePreview)
def delete_record(kind: Kind, record_id: int, request: Request, background: BackgroundTasks, db: DB, actor: Deleter):
    summary, media, evidence = purge(db, collect(db, kind, record_id), actor=actor, request=request)
    db.commit()
    # Files go only once the rows are gone for good.
    background.add_task(delete_media, *media)
    background.add_task(delete_evidence, *evidence)
    return summary
