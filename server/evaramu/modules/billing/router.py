from __future__ import annotations

import json
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, File, Form, Query, Request, Response, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, TypeAdapter, ValidationError
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from evaramu.core.clock import now_local
from evaramu.core.config import get_settings
from evaramu.core.deps import DB, CurrentUser, Paging, require
from evaramu.core.errors import Conflict, DomainError, Forbidden, NotFound
from evaramu.core.money import Currency
from evaramu.core.ratelimit import rate_limit
from evaramu.core.schemas import Page
from evaramu.core.storage import evidence_path, save_evidence
from evaramu.modules.agreements.models import RentalAgreement
from evaramu.modules.billing import invoice_pdf, ledger, service
from evaramu.modules.billing.models import (
    FinancialAdjustment,
    Invoice,
    InvoiceStatus,
    Payment,
    PaymentAllocation,
    PaymentMethod,
    PaymentStatus,
)
from evaramu.modules.billing.schemas import (
    AdjustmentIn,
    AdjustmentOut,
    AllocationIn,
    AllocationOut,
    ApproveIn,
    CoverageMonth,
    CoverageOut,
    GenerateIn,
    GenerateOut,
    InvoiceDetail,
    InvoiceItemOut,
    InvoiceOut,
    ManualInvoiceIn,
    PaymentMethodIn,
    PaymentMethodOut,
    PaymentMethodUpdate,
    PaymentOut,
    ReasonIn,
)
from evaramu.modules.identity.models import User
from evaramu.modules.properties.models import RentalUnit
from evaramu.modules.system.services import audit
from evaramu.modules.tenants.models import Tenant

router = APIRouter(tags=["billing"])
InvoiceManager = Annotated[User, Depends(require("invoices.manage"))]
Approver = Annotated[User, Depends(require("payments.approve"))]


# ------------------------------------------------------------ serialisers ----


def invoices_out(rows: list[Invoice], today: date | None = None) -> list[InvoiceOut]:
    today = today or date.today()
    out = []
    for i in rows:
        bal = i.balance_due
        out.append(InvoiceOut(
            id=i.id, invoice_number=i.invoice_number, kind=i.kind, status=i.status,
            agreement_id=i.agreement_id, agreement_number=i.agreement.agreement_number,
            tenant_id=i.tenant_id, tenant_name=i.tenant.full_name, unit_id=i.unit_id,
            unit_code=i.unit.code, property_name=i.unit.property.name,
            location=i.unit.property.location_label, period_start=i.period_start,
            period_end=i.period_end, issue_date=i.issue_date, due_date=i.due_date, currency=i.currency,
            amount_charged=i.amount_charged, amount_credited=i.amount_credited, amount_paid=i.amount_paid,
            balance_due=bal, previous_balance=i.previous_balance, total_due=i.total_due,
            days_overdue=(today - i.due_date).days if bal > 0 and i.due_date < today and i.status != "void" else 0,
            created_at=i.created_at,
        ))
    return out


def _alloc_out(a: PaymentAllocation, p: Payment) -> AllocationOut:
    return AllocationOut(payment_id=p.id, payment_number=p.payment_number, invoice_id=a.invoice_id,
                         invoice_number=a.invoice.invoice_number, amount=a.amount, payment_status=p.status,
                         payment_date=p.payment_date, method=p.method.label)


def invoice_detail(db: Session, inv: Invoice) -> InvoiceDetail:
    db.refresh(inv)
    base = invoices_out([inv])[0]
    allocs = db.execute(select(PaymentAllocation).where(PaymentAllocation.invoice_id == inv.id)
                        .order_by(PaymentAllocation.id)).unique().scalars().all()
    pending = sum((a.amount for a in allocs if a.payment.status == PaymentStatus.PENDING.value), Decimal("0"))
    adjustments = db.execute(select(FinancialAdjustment).where(FinancialAdjustment.invoice_id == inv.id)
                             .order_by(FinancialAdjustment.id)).scalars().all()
    return InvoiceDetail(
        **base.model_dump(), items=[InvoiceItemOut.model_validate(x) for x in inv.items],
        adjustments=[AdjustmentOut.model_validate(a) for a in adjustments],
        allocations=[_alloc_out(a, a.payment) for a in allocs],
        notes=inv.notes, void_reason=inv.void_reason, pending_amount=pending,
    )


def payments_out(db: Session, rows: list[Payment], *, with_duplicates: bool = False) -> list[PaymentOut]:
    out = []
    for p in rows:
        dups = [d.payment_number for d in service.possible_duplicates(db, p)] if (
            with_duplicates and p.status == PaymentStatus.PENDING.value) else []
        out.append(PaymentOut(
            id=p.id, payment_number=p.payment_number, status=p.status, tenant_id=p.tenant_id,
            tenant_name=p.tenant.full_name, agreement_id=p.agreement_id,
            agreement_number=p.agreement.agreement_number, unit_id=p.unit_id, unit_code=p.unit.code,
            property_name=p.unit.property.name, amount=p.amount, currency=p.currency,
            payment_date=p.payment_date, method_code=p.method_code, method_label=p.method.label,
            transaction_reference=p.transaction_reference, notes=p.notes, has_evidence=bool(p.evidence_key),
            recorded_by=p.recorded_by.full_name if p.recorded_by else None, created_at=p.created_at,
            reviewed_by=p.reviewed_by.full_name if p.reviewed_by else None, reviewed_at=p.reviewed_at,
            rejection_reason=p.rejection_reason,
            reversed_by=p.reversed_by.full_name if p.reversed_by else None, reversed_at=p.reversed_at,
            reversal_reason=p.reversal_reason,
            allocated_amount=p.allocated_amount if p.status == PaymentStatus.APPROVED.value else Decimal("0"),
            unapplied_amount=p.unapplied_amount if p.status == PaymentStatus.APPROVED.value else Decimal("0"),
            allocations=[_alloc_out(a, p) for a in p.allocations], possible_duplicate_of=dups,
            months_covered=p.months_covered,
        ))
    return out


# --------------------------------------------------------------- invoices ----


@router.get("/invoices", response_model=Page[InvoiceOut], dependencies=[Depends(require("invoices.view"))])
def list_invoices(
    db: DB, paging: Paging,
    search: str | None = None,
    status: InvoiceStatus | None = None,
    open_only: bool = False,
    tenant_id: int | None = None,
    agreement_id: int | None = None,
    property_id: int | None = None,
    currency: Currency | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
):
    ledger.refresh_overdue(db, date.today())
    db.commit()
    stmt = (select(Invoice).join(Tenant, Tenant.id == Invoice.tenant_id)
            .join(RentalUnit, RentalUnit.id == Invoice.unit_id))
    if status:
        stmt = stmt.where(Invoice.status == status.value)
    if open_only:
        stmt = stmt.where(Invoice.status.in_(ledger.OPEN_STATUSES))
    if tenant_id:
        stmt = stmt.where(Invoice.tenant_id == tenant_id)
    if agreement_id:
        stmt = stmt.where(Invoice.agreement_id == agreement_id)
    if property_id:
        stmt = stmt.where(RentalUnit.property_id == property_id)
    if currency:
        stmt = stmt.where(Invoice.currency == currency.value)
    if date_from:
        stmt = stmt.where(Invoice.issue_date >= date_from)
    if date_to:
        stmt = stmt.where(Invoice.issue_date <= date_to)
    if search:
        term = f"%{search.strip()}%"
        stmt = stmt.where(or_(Invoice.invoice_number.ilike(term), Tenant.full_name.ilike(term),
                              RentalUnit.code.ilike(term)))
    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
    rows = list(db.execute(stmt.order_by(Invoice.issue_date.desc(), Invoice.id.desc())
                           .offset(paging.offset).limit(paging.page_size)).unique().scalars())
    return Page(items=invoices_out(rows), total=total, page=paging.page, page_size=paging.page_size)


@router.post("/invoices/generate", response_model=GenerateOut)
def generate(body: GenerateIn, request: Request, db: DB, actor: InvoiceManager):
    year, month = map(int, body.period.split("-"))
    result = service.generate_rent_invoices(db, year, month, actor=actor, agreement_id=body.agreement_id)
    db.commit()
    return GenerateOut(period=result["period"], created=len(result["created"]), skipped=result["skipped"],
                       invoice_numbers=[i.invoice_number for i in result["created"]])


@router.post("/invoices", response_model=InvoiceDetail, status_code=201)
def create_invoice(body: ManualInvoiceIn, request: Request, db: DB, actor: InvoiceManager):
    ag = db.execute(select(RentalAgreement).where(RentalAgreement.id == body.agreement_id)).unique().scalar_one_or_none()
    if ag is None:
        raise NotFound("Rental agreement not found")
    inv = service.create_manual_invoice(db, ag, issue_date=body.issue_date, due_date=body.due_date,
                                        items=[i.model_dump() for i in body.items], notes=body.notes,
                                        actor=actor, request=request)
    db.commit()
    return invoice_detail(db, inv)


@router.get("/invoices/{invoice_id}", response_model=InvoiceDetail, dependencies=[Depends(require("invoices.view"))])
def get_invoice(invoice_id: int, db: DB):
    return invoice_detail(db, service.get_invoice(db, invoice_id))


# ---- invoice PDF: download, and a signed link for sending on WhatsApp -------------------------------

SHARE_DAYS = 30
SHARE_AUDIENCE = "invoice-pdf"


def _invoice_pdf_response(db: Session, inv: Invoice, inline: bool = False) -> Response:
    content = invoice_pdf.render_invoice(db, inv, now_local())
    disposition = "inline" if inline else "attachment"
    return Response(content, media_type="application/pdf", headers={
        "Content-Disposition": f'{disposition}; filename="invoice-{inv.invoice_number}.pdf"',
        "Cache-Control": "no-store", "X-Robots-Tag": "noindex"})


def whatsapp_number(phone: str) -> str:
    """International digits for wa.me links: '+250 788 123 456' / '0788123456' -> '250788123456'."""
    digits = "".join(ch for ch in phone if ch.isdigit())
    if digits.startswith("0") and len(digits) == 10:
        digits = "250" + digits[1:]
    return digits


class InvoiceShareOut(BaseModel):
    token: str
    #: Path under the API origin; the client prefixes VITE_API_URL.
    path: str
    filename: str
    whatsapp_number: str
    message: str
    expires_at: datetime


@router.get("/invoices/{invoice_id}/pdf", dependencies=[Depends(require("invoices.view"))],
            response_class=Response, responses={200: {"content": {"application/pdf": {}}}})
def invoice_pdf_download(invoice_id: int, db: DB):
    """The invoice as a branded PDF."""
    return _invoice_pdf_response(db, service.get_invoice(db, invoice_id))


@router.post("/invoices/{invoice_id}/share", response_model=InvoiceShareOut)
def invoice_share(invoice_id: int, request: Request, db: DB, actor: Annotated[User, Depends(require("invoices.view"))]):
    """A link the tenant can open without signing in (valid 30 days), plus a ready WhatsApp message."""
    inv = service.get_invoice(db, invoice_id)
    expires = datetime.now(UTC) + timedelta(days=SHARE_DAYS)
    token = jwt.encode({"sub": str(inv.id), "aud": SHARE_AUDIENCE, "exp": expires, "n": inv.invoice_number},
                       get_settings().SECRET_KEY, algorithm="HS256")
    balance = inv.balance_due
    amount = f"{balance:,.0f} RWF" if inv.currency == "RWF" else f"${balance:,.2f}"
    period = f" for {inv.period_start:%B %Y}" if inv.period_start else ""
    message = (f"Hello {inv.tenant.full_name}, here is your invoice {inv.invoice_number}{period}"
               + (f". Amount due: {amount} by {inv.due_date:%d %b %Y}" if balance > 0 else ". It is fully paid, thank you")
               + ".")
    audit(db, actor=actor, action="invoice.shared", entity_type="invoice", entity_id=inv.id,
          summary=f"Created a share link for invoice {inv.invoice_number}", request=request)
    db.commit()
    return InvoiceShareOut(token=token, path=f"/api/v1/public/invoice-pdf/{token}",
                           filename=f"invoice-{inv.invoice_number}.pdf",
                           whatsapp_number=whatsapp_number(inv.tenant.phone), message=message, expires_at=expires)


@router.get("/public/invoice-pdf/{token}", dependencies=[Depends(rate_limit("invoice-pdf", 30, 60))],
            response_class=Response, responses={200: {"content": {"application/pdf": {}}}})
def invoice_pdf_public(token: str, db: DB):
    """Opened from the WhatsApp link: no sign-in, the signed token is the permission."""
    try:
        claims = jwt.decode(token, get_settings().SECRET_KEY, algorithms=["HS256"], audience=SHARE_AUDIENCE)
        inv = db.get(Invoice, int(claims["sub"]))
    except (jwt.PyJWTError, KeyError, ValueError):
        inv = None
    if inv is None or inv.invoice_number != claims.get("n"):
        raise NotFound("This invoice link has expired or is not valid. Ask for a new one.")
    return _invoice_pdf_response(db, inv, inline=True)


@router.post("/invoices/{invoice_id}/adjustments", response_model=InvoiceDetail, status_code=201)
def adjust(invoice_id: int, body: AdjustmentIn, request: Request, db: DB, actor: InvoiceManager):
    inv = service.get_invoice(db, invoice_id, for_update=True)
    service.add_adjustment(db, inv, kind=body.kind.value, amount=body.amount, reason=body.reason,
                           actor=actor, request=request)
    db.commit()
    return invoice_detail(db, inv)


@router.post("/invoices/{invoice_id}/void", response_model=InvoiceDetail)
def void(invoice_id: int, body: ReasonIn, request: Request, db: DB, actor: InvoiceManager):
    inv = service.get_invoice(db, invoice_id, for_update=True)
    service.void_invoice(db, inv, reason=body.reason, actor=actor, request=request)
    db.commit()
    return invoice_detail(db, inv)


# --------------------------------------------------------------- payments ----


@router.get("/payment-methods", response_model=list[PaymentMethodOut])
def list_methods(db: DB, user: CurrentUser, include_inactive: bool = False):
    if not ({"payments.view", "payments.record", "settings.manage"} & user.permission_codes):
        raise Forbidden("You do not have permission to perform this action.")
    stmt = select(PaymentMethod).order_by(PaymentMethod.sort_order, PaymentMethod.label)
    if not include_inactive:
        stmt = stmt.where(PaymentMethod.is_active.is_(True))
    return list(db.execute(stmt).scalars())


@router.post("/payment-methods", response_model=PaymentMethodOut, status_code=201)
def create_method(body: PaymentMethodIn, request: Request, db: DB,
                  actor: Annotated[User, Depends(require("settings.manage"))]):
    if db.execute(select(PaymentMethod.id).where(PaymentMethod.code == body.code)).first():
        raise Conflict("A payment method with this code already exists")
    m = PaymentMethod(**body.model_dump())
    db.add(m)
    db.flush()
    audit(db, actor=actor, action="payment_method.created", entity_type="payment_method", entity_id=m.id,
          summary=f"Added payment method {m.label}", request=request)
    db.commit()
    return m


@router.patch("/payment-methods/{method_id}", response_model=PaymentMethodOut)
def update_method(method_id: int, body: PaymentMethodUpdate, request: Request, db: DB,
                  actor: Annotated[User, Depends(require("settings.manage"))]):
    m = db.get(PaymentMethod, method_id)
    if m is None:
        raise NotFound("Payment method not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        if v is not None:
            setattr(m, k, v)
    audit(db, actor=actor, action="payment_method.updated", entity_type="payment_method", entity_id=m.id,
          summary=f"Updated payment method {m.label}", request=request)
    db.commit()
    return m


@router.get("/payments", response_model=Page[PaymentOut], dependencies=[Depends(require("payments.view"))])
def list_payments(
    db: DB, paging: Paging,
    search: str | None = None,
    status: PaymentStatus | None = None,
    tenant_id: int | None = None,
    agreement_id: int | None = None,
    property_id: int | None = None,
    method_code: str | None = None,
    currency: Currency | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
):
    stmt = (select(Payment).join(Tenant, Tenant.id == Payment.tenant_id)
            .join(RentalUnit, RentalUnit.id == Payment.unit_id))
    if status:
        stmt = stmt.where(Payment.status == status.value)
    if tenant_id:
        stmt = stmt.where(Payment.tenant_id == tenant_id)
    if agreement_id:
        stmt = stmt.where(Payment.agreement_id == agreement_id)
    if property_id:
        stmt = stmt.where(RentalUnit.property_id == property_id)
    if method_code:
        stmt = stmt.where(Payment.method_code == method_code)
    if currency:
        stmt = stmt.where(Payment.currency == currency.value)
    if date_from:
        stmt = stmt.where(Payment.payment_date >= date_from)
    if date_to:
        stmt = stmt.where(Payment.payment_date <= date_to)
    if search:
        term = f"%{search.strip()}%"
        stmt = stmt.where(or_(Payment.payment_number.ilike(term), Tenant.full_name.ilike(term),
                              Payment.transaction_reference.ilike(term), RentalUnit.code.ilike(term)))
    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
    order = Payment.created_at.asc() if status == PaymentStatus.PENDING else Payment.created_at.desc()
    rows = list(db.execute(stmt.order_by(order).offset(paging.offset).limit(paging.page_size)).unique().scalars())
    return Page(items=payments_out(db, rows, with_duplicates=status == PaymentStatus.PENDING),
                total=total, page=paging.page, page_size=paging.page_size)


_alloc_adapter = TypeAdapter(list[AllocationIn])


@router.get("/payments/coverage", response_model=CoverageOut, dependencies=[Depends(require("payments.record"))])
def payment_coverage(db: DB, agreement_id: int, months: Annotated[int, Query(ge=1, le=service.MAX_MONTHS)] = 1):
    """Which months a payment covering ``months`` months would pay, and how much that is."""
    ag = db.execute(select(RentalAgreement).where(RentalAgreement.id == agreement_id)).unique().scalar_one_or_none()
    if ag is None:
        raise NotFound("Rental agreement not found")
    plan = service.coverage_plan(db, ag, months)
    return CoverageOut(
        agreement_id=ag.id, currency=ag.currency, requested=months, available=len(plan),
        total=sum((e["amount_due"] for e in plan), Decimal("0")),
        months=[CoverageMonth(
            period=f"{e['year']:04d}-{e['month']:02d}",
            label=date(e["year"], e["month"], 1).strftime("%B %Y"),
            amount_due=e["amount_due"],
            invoice_number=e["invoice"].invoice_number if e["invoice"] else None,
        ) for e in plan],
    )


@router.post("/payments", response_model=PaymentOut, status_code=201)
def record_payment(
    request: Request, db: DB,
    actor: Annotated[User, Depends(require("payments.record"))],
    agreement_id: Annotated[int, Form()],
    amount: Annotated[Decimal, Form(gt=0)],
    payment_date: Annotated[date, Form()],
    method_code: Annotated[str, Form(max_length=32)],
    currency: Annotated[Currency | None, Form()] = None,
    transaction_reference: Annotated[str, Form(max_length=120)] = "",
    notes: Annotated[str, Form(max_length=2000)] = "",
    allocations: Annotated[str, Form(description='JSON: [{"invoice_id": 1, "amount": "1000"}]')] = "[]",
    evidence: Annotated[UploadFile | None, File(description="Optional receipt / screenshot (image or PDF)")] = None,
    auto_approve: Annotated[bool, Form(description="Approve immediately (needs payments.approve)")] = False,
    months_covered: Annotated[int | None, Form(ge=1, le=service.MAX_MONTHS,
                                               description="Pay this many unpaid months of rent, oldest first")] = None,
):
    if auto_approve and "payments.approve" not in actor.permission_codes:
        raise Forbidden("You can record this payment, but approving it needs the payments approval permission.")
    try:
        allocs = _alloc_adapter.validate_python(json.loads(allocations or "[]"))
    except (ValueError, ValidationError) as exc:
        raise DomainError("Invalid allocation list") from exc
    data = {
        "agreement_id": agreement_id, "amount": amount, "payment_date": payment_date,
        "method_code": method_code, "currency": currency.value if currency else None,
        "transaction_reference": transaction_reference, "notes": notes,
        "allocations": [a.model_dump() for a in allocs], "months_covered": months_covered,
    }
    if evidence is not None and evidence.filename:
        limit = get_settings().MAX_UPLOAD_MB * 1024 * 1024
        data["evidence_key"] = save_evidence(evidence.file.read(limit + 1), evidence.filename)
        data["evidence_name"] = evidence.filename[:255]
    p = service.record_payment(db, data, actor=actor, request=request, notify_approvers=not auto_approve)
    if auto_approve:
        # A possible duplicate is never approved silently: it stays pending for a
        # deliberate review in Pending Approvals (the response lists the matches).
        if service.possible_duplicates(db, p):
            service.notify_pending(db, p)
        else:
            service.approve_payment(db, p, actor=actor, confirm_duplicate=False, auto_allocate=True,
                                    note="", request=request)
    db.commit()
    db.refresh(p)
    return payments_out(db, [p], with_duplicates=True)[0]


@router.get("/payments/{payment_id}", response_model=PaymentOut, dependencies=[Depends(require("payments.view"))])
def get_payment(payment_id: int, db: DB):
    return payments_out(db, [service.get_payment(db, payment_id)], with_duplicates=True)[0]


@router.get("/payments/{payment_id}/evidence", dependencies=[Depends(require("payments.view"))])
def payment_evidence(payment_id: int, db: DB):
    p = service.get_payment(db, payment_id)
    if not p.evidence_key:
        raise NotFound("No evidence attached to this payment")
    path = evidence_path(p.evidence_key)
    return FileResponse(path, filename=p.evidence_name or path.name,
                        headers={"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"})


@router.post("/payments/{payment_id}/approve", response_model=PaymentOut)
def approve(payment_id: int, body: ApproveIn, request: Request, db: DB, actor: Approver):
    p = service.get_payment(db, payment_id, for_update=True)
    service.approve_payment(db, p, actor=actor, confirm_duplicate=body.confirm_duplicate,
                            auto_allocate=body.auto_allocate, note=body.note, request=request)
    db.commit()
    db.refresh(p)
    return payments_out(db, [p])[0]


@router.post("/payments/{payment_id}/reject", response_model=PaymentOut)
def reject(payment_id: int, body: ReasonIn, request: Request, db: DB, actor: Approver):
    p = service.get_payment(db, payment_id, for_update=True)
    service.reject_payment(db, p, actor=actor, reason=body.reason, request=request)
    db.commit()
    db.refresh(p)
    return payments_out(db, [p])[0]


@router.post("/payments/{payment_id}/reverse", response_model=PaymentOut)
def reverse(payment_id: int, body: ReasonIn, request: Request, db: DB, actor: Approver):
    p = service.get_payment(db, payment_id, for_update=True)
    service.reverse_payment(db, p, actor=actor, reason=body.reason, request=request)
    db.commit()
    db.refresh(p)
    return payments_out(db, [p])[0]


@router.post("/payments/{payment_id}/apply-credit", response_model=PaymentOut)
def apply_credit(payment_id: int, request: Request, db: DB, actor: Approver):
    p = service.get_payment(db, payment_id, for_update=True)
    service.apply_credit(db, p, actor=actor, request=request)
    db.commit()
    db.refresh(p)
    return payments_out(db, [p])[0]

