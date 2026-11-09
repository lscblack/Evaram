from __future__ import annotations

import csv
import io
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import Response, StreamingResponse
from sqlalchemy import select

from evaramu.core.clock import now_local
from evaramu.core.deps import DB, CurrentUser, require
from evaramu.core.errors import DomainError
from evaramu.core.money import Currency
from evaramu.modules.agreements.models import AgreementStatus, RentalAgreement
from evaramu.modules.agreements.router import agreements_out
from evaramu.modules.billing.models import (
    Invoice,
    InvoiceStatus,
    Payment,
    PaymentStatus,
)
from evaramu.modules.billing.router import invoices_out, payments_out
from evaramu.modules.properties.models import Property
from evaramu.modules.reports import builders, pdf, service, statements
from evaramu.modules.system.models import AppSetting, AuditLog
from evaramu.modules.system.services import audit

router = APIRouter(tags=["reports"])
Reports = Depends(require("reports.view"))


@router.get("/dashboard", dependencies=[Depends(require("dashboard.view"))])
def dashboard(db: DB, user: CurrentUser):
    today = date.today()
    perms = user.permission_codes
    data: dict = {"generated_at": today.isoformat(), "portfolio": service.portfolio(db)}
    data["occupancy_by_property"] = service.occupancy_by_property(db)
    if "invoices.view" in perms or "payments.view" in perms:
        data["finance"] = service.finance(db, today)
        db.commit()  # persist overdue flags refreshed by finance()
        data["revenue_series"] = service.monthly_series(db, service.add_months(service.month_start(today), -11), today)
    if "payments.view" in perms:
        recent = list(db.execute(select(Payment).order_by(Payment.created_at.desc()).limit(8)).unique().scalars())
        pending = list(db.execute(select(Payment).where(Payment.status == PaymentStatus.PENDING.value)
                                  .order_by(Payment.created_at).limit(6)).unique().scalars())
        data["recent_payments"] = [p.model_dump(mode="json") for p in payments_out(db, recent)]
        data["pending_payments"] = [p.model_dump(mode="json") for p in payments_out(db, pending, with_duplicates=True)]
    if "invoices.view" in perms:
        overdue = list(db.execute(select(Invoice).where(Invoice.status == InvoiceStatus.OVERDUE.value)
                                  .order_by(Invoice.due_date).limit(8)).unique().scalars())
        data["overdue_invoices"] = [i.model_dump(mode="json") for i in invoices_out(overdue, today)]
    if "agreements.view" in perms:
        expiring = list(db.execute(select(RentalAgreement).where(
            RentalAgreement.status == AgreementStatus.ACTIVE.value, RentalAgreement.end_date.is_not(None),
            RentalAgreement.end_date <= today + timedelta(days=60)).order_by(RentalAgreement.end_date).limit(8)
        ).unique().scalars())
        data["upcoming_expirations"] = [a.model_dump(mode="json") for a in agreements_out(db, expiring, today)]
    activity = db.execute(select(AuditLog).where(AuditLog.entity_type.in_(
        ["property", "unit", "agreement", "payment", "invoice", "tenant"]))
        .order_by(AuditLog.created_at.desc()).limit(10)).unique().scalars()
    data["recent_activity"] = [{"at": a.created_at.isoformat(), "action": a.action, "summary": a.summary,
                                "actor": a.actor.full_name if a.actor else "System"} for a in activity]
    return data


def _filters(date_from, date_to, property_id, tenant_id, method_code, currency, status) -> dict:
    if date_from and date_to and date_to < date_from:
        raise DomainError("The end date must be on or after the start date")
    return {"date_from": date_from, "date_to": date_to, "property_id": property_id, "tenant_id": tenant_id,
            "method_code": method_code, "currency": currency.value if currency else None, "status": status}


@router.get("/reports/payments", dependencies=[Reports])
def payments_report(db: DB, date_from: date | None = None, date_to: date | None = None,
                    property_id: int | None = None, tenant_id: int | None = None, method_code: str | None = None,
                    currency: Currency | None = None, status: PaymentStatus | None = None):
    f = _filters(date_from, date_to, property_id, tenant_id, method_code, currency, status.value if status else None)
    return service.payment_report(db, f)


@router.get("/reports/invoices", dependencies=[Reports])
def invoices_report(db: DB, date_from: date | None = None, date_to: date | None = None,
                    property_id: int | None = None, tenant_id: int | None = None,
                    currency: Currency | None = None, status: InvoiceStatus | None = None):
    f = _filters(date_from, date_to, property_id, tenant_id, None, currency, status.value if status else None)
    return service.invoice_report(db, f)


@router.get("/reports/monthly", dependencies=[Reports])
def monthly_report(db: DB, date_from: date | None = None, date_to: date | None = None):
    today = date.today()
    end = date_to or today
    start = date_from or service.add_months(service.month_start(end), -11)
    if end < start:
        raise DomainError("The end date must be on or after the start date")
    if (end - start).days > 366 * 5:
        raise DomainError("Choose a range of at most five years")
    return service.monthly_series(db, start, end)


@router.get("/reports/outstanding", dependencies=[Depends(require("invoices.view"))])
def outstanding(db: DB, property_id: int | None = None, currency: Currency | None = None):
    return service.outstanding_report(db, date.today(), {"property_id": property_id,
                                                         "currency": currency.value if currency else None})


def _csv(filename: str, header: list[str], rows: list[list]) -> StreamingResponse:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(header)
    for r in rows:
        # Neutralise spreadsheet formula injection in user-entered text.
        w.writerow([("'" + v) if isinstance(v, str) and v[:1] in ("=", "+", "-", "@") else v for v in r])
    buf.seek(0)
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@router.get("/reports/payments.csv", dependencies=[Reports])
def payments_csv(db: DB, date_from: date | None = None, date_to: date | None = None,
                 property_id: int | None = None, tenant_id: int | None = None, method_code: str | None = None,
                 currency: Currency | None = None, status: PaymentStatus | None = None):
    f = _filters(date_from, date_to, property_id, tenant_id, method_code, currency, status.value if status else None)
    rows = list(db.execute(service.apply_payment_filters(select(Payment), f).order_by(Payment.payment_date)
                           .limit(20000)).unique().scalars())
    out = payments_out(db, rows)
    return _csv("payments.csv",
                ["Payment", "Date", "Status", "Tenant", "Unit", "Property", "Method", "Reference", "Currency",
                 "Amount", "Recorded by", "Reviewed by", "Reviewed at"],
                [[p.payment_number, p.payment_date.isoformat(), p.status, p.tenant_name, p.unit_code,
                  p.property_name, p.method_label, p.transaction_reference, p.currency, format(p.amount, "f"),
                  p.recorded_by or "", p.reviewed_by or "", p.reviewed_at.isoformat() if p.reviewed_at else ""]
                 for p in out])


@router.get("/reports/invoices.csv", dependencies=[Reports])
def invoices_csv(db: DB, date_from: date | None = None, date_to: date | None = None,
                 property_id: int | None = None, tenant_id: int | None = None,
                 currency: Currency | None = None, status: InvoiceStatus | None = None):
    f = _filters(date_from, date_to, property_id, tenant_id, None, currency, status.value if status else None)
    rows = list(db.execute(service.apply_invoice_filters(select(Invoice), f).order_by(Invoice.issue_date)
                           .limit(20000)).unique().scalars())
    return _csv("invoices.csv",
                ["Invoice", "Issued", "Due", "Status", "Tenant", "Unit", "Property", "Period start", "Period end",
                 "Currency", "Charged", "Credited", "Paid", "Balance"],
                [[i.invoice_number, i.issue_date.isoformat(), i.due_date.isoformat(), i.status, i.tenant_name,
                  i.unit_code, i.property_name, i.period_start.isoformat() if i.period_start else "",
                  i.period_end.isoformat() if i.period_end else "", i.currency, format(i.amount_charged, "f"),
                  format(i.amount_credited, "f"), format(i.amount_paid, "f"), format(i.balance_due, "f")]
                 for i in invoices_out(rows)])


@router.get("/reports/outstanding.csv", dependencies=[Depends(require("invoices.view"))])
def outstanding_csv(db: DB, property_id: int | None = None, currency: Currency | None = None):
    rows = service.outstanding_report(db, date.today(), {"property_id": property_id,
                                                         "currency": currency.value if currency else None})
    return _csv("outstanding-balances.csv",
                ["Tenant", "Phone", "Units", "Currency", "Invoices", "Not yet due", "1-30 days", "31-60 days",
                 "61-90 days", "90+ days", "Total"],
                [[r["tenant_name"], r["phone"], " ".join(r["units"]), r["currency"], r["invoices"], r["current"],
                  r["d1_30"], r["d31_60"], r["d61_90"], r["d90_plus"], r["total"]] for r in rows])


# ---- PDF reports ---------------------------------------------------------------------------------

def _meta(db, user) -> pdf.Meta:
    def setting(key: str, default: str = "") -> str:
        s = db.get(AppSetting, key)
        return str(s.value).strip() if s is not None and s.value not in (None, "") else default

    contact = [setting("contact.address"), " · ".join(x for x in (setting("contact.phone"), setting("contact.email")) if x)]
    return pdf.Meta(company=setting("company.name", "Evaramu Group Ltd"), contact_lines=[c for c in contact if c],
                    generated_at=now_local(), generated_by=user.full_name)


def _property_name(db, property_id: int | None) -> str | None:
    if not property_id:
        return None
    p = db.get(Property, property_id)
    if p is None:
        raise DomainError("Unknown property")
    return f"{p.code} — {p.name}"


def _picked(value: str | None) -> set[str] | None:
    """'a,b' -> {'a','b'}; None (parameter left out) means everything."""
    return None if value is None else {v.strip() for v in value.split(",") if v.strip()}


def _pdf_response(db, user, request: Request, slug: str, title: str, report: pdf.Report,
                  cards: str | None = None, sections: str | None = None) -> Response:
    report = builders.choose(report, _picked(cards), _picked(sections))
    if not (report.kpis or report.secondary_kpis or report.sections):
        raise DomainError("Choose at least one card or table for the report")
    meta = _meta(db, user)
    content = pdf.render(report, meta)
    audit(db, actor=user, action="report.downloaded", entity_type="report", entity_id=slug,
          summary=f"Downloaded the {title} report (PDF)", request=request)
    db.commit()
    filename = f"evaramu-{slug}-{meta.generated_at:%Y-%m-%d}.pdf"
    return Response(content, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@router.get("/reports/pdf/options", dependencies=[Reports])
def pdf_options() -> dict:
    """Cards and tables each PDF report can include (all included unless chosen otherwise)."""
    return builders.OPTIONS


def _choice():
    # A fresh Query per parameter: FastAPI must not share one object between "cards" and "sections".
    return Query(default=None, max_length=500, description="Comma-separated keys from /reports/pdf/options; omit for all")


@router.get("/reports/pdf/payments-received", dependencies=[Reports],
            response_class=Response, responses={200: {"content": {"application/pdf": {}}}})
def payments_received_pdf(db: DB, user: CurrentUser, request: Request, date_from: date | None = None,
                          date_to: date | None = None, property_id: int | None = None, currency: Currency | None = None,
                          cards: str | None = _choice(), sections: str | None = _choice()):
    """Approved payments in a period: totals, tenants who paid, months paid, units taken."""
    _filters(date_from, date_to, None, None, None, None, None)
    cur = currency.value if currency else None
    data = statements.payments_received(db, date_from=date_from, date_to=date_to, property_id=property_id, currency=cur)
    report = builders.payments_received(data, date_from=date_from, date_to=date_to,
                                        property_name=_property_name(db, property_id), currency=cur)
    return _pdf_response(db, user, request, "payments-received", report.title, report, cards, sections)


@router.get("/reports/pdf/overdue", dependencies=[Reports, Depends(require("invoices.view"))],
            response_class=Response, responses={200: {"content": {"application/pdf": {}}}})
def overdue_pdf(db: DB, user: CurrentUser, request: Request, property_id: int | None = None,
                currency: Currency | None = None, cards: str | None = _choice(), sections: str | None = _choice()):
    """Tenants with overdue rent: amount, months, days late, ageing."""
    today = date.today()
    cur = currency.value if currency else None
    data = statements.overdue_tenants(db, today, property_id=property_id, currency=cur)
    report = builders.overdue_tenants(data, today=today, property_name=_property_name(db, property_id), currency=cur)
    return _pdf_response(db, user, request, "overdue-tenants", report.title, report, cards, sections)


@router.get("/reports/pdf/occupancy", dependencies=[Reports],
            response_class=Response, responses={200: {"content": {"application/pdf": {}}}})
def occupancy_pdf(db: DB, user: CurrentUser, request: Request, property_id: int | None = None,
                  cards: str | None = _choice(), sections: str | None = _choice()):
    """Every unit: taken or free, tenant, rent, paid through, balance."""
    data = statements.occupancy(db, property_id=property_id)
    report = builders.occupancy(data, today=date.today(), property_name=_property_name(db, property_id))
    return _pdf_response(db, user, request, "occupancy", report.title, report, cards, sections)
