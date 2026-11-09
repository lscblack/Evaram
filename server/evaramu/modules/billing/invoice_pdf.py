"""Branded invoice PDF (A4 portrait) for sending to tenants."""

from __future__ import annotations

import io
from datetime import datetime
from decimal import Decimal

from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy import select
from sqlalchemy.orm import Session

from evaramu.modules.billing.models import (
    Invoice,
    InvoiceStatus,
    Payment,
    PaymentAllocation,
    PaymentMethod,
    PaymentStatus,
)
from evaramu.modules.reports.pdf import GOLD, GREEN, INK, LINE, LOGO, MUTED, NAVY, RED, TINT, ZEBRA, day, money, text
from evaramu.modules.system.models import AppSetting

W, H = A4
MX = 1.8 * cm

STATUS = {
    InvoiceStatus.PAID.value: ("PAID", GREEN),
    InvoiceStatus.PARTIALLY_PAID.value: ("PARTLY PAID", GOLD),
    InvoiceStatus.UNPAID.value: ("UNPAID", NAVY),
    InvoiceStatus.OVERDUE.value: ("OVERDUE", RED),
    InvoiceStatus.VOID.value: ("VOID", RED),
}

P = {
    "label": ParagraphStyle("l", fontName="Helvetica-Bold", fontSize=7.5, leading=10, textColor=MUTED),
    "body": ParagraphStyle("b", fontName="Helvetica", fontSize=9.5, leading=13, textColor=INK),
    "strong": ParagraphStyle("s", fontName="Helvetica-Bold", fontSize=11, leading=14, textColor=INK),
    "small": ParagraphStyle("sm", fontName="Helvetica", fontSize=8, leading=11, textColor=MUTED),
    "th": ParagraphStyle("th", fontName="Helvetica-Bold", fontSize=8.5, leading=11, textColor=colors.white),
    "th_r": ParagraphStyle("thr", fontName="Helvetica-Bold", fontSize=8.5, leading=11, textColor=colors.white, alignment=TA_RIGHT),
    "td": ParagraphStyle("td", fontName="Helvetica", fontSize=9.5, leading=12.5, textColor=INK),
    "td_r": ParagraphStyle("tdr", fontName="Helvetica", fontSize=9.5, leading=12.5, textColor=INK, alignment=TA_RIGHT),
    "h": ParagraphStyle("h", fontName="Helvetica-Bold", fontSize=10.5, leading=14, textColor=NAVY),
}


def _settings(db: Session) -> dict[str, str]:
    rows = db.execute(select(AppSetting.key, AppSetting.value).where(
        AppSetting.key.in_(["company.name", "contact.phone", "contact.email", "contact.address", "landlord.bank_name",
                            "landlord.bank_account_number", "landlord.bank_account_name", "landlord.phone"]))).all()
    return {k: str(v).strip() for k, v in rows if v not in (None, "")}


def _payments(db: Session, invoice: Invoice) -> list[tuple[Payment, Decimal, str]]:
    rows = db.execute(
        select(Payment, PaymentAllocation.amount, PaymentMethod.label)
        .join(PaymentAllocation, PaymentAllocation.payment_id == Payment.id)
        .join(PaymentMethod, PaymentMethod.code == Payment.method_code, isouter=True)
        .where(PaymentAllocation.invoice_id == invoice.id, Payment.status == PaymentStatus.APPROVED.value)
        .order_by(Payment.payment_date)).unique().all()
    return [(p, amt, label or p.method_code) for p, amt, label in rows]


def _render(db: Session, *, number: str, status: str, cur: str, tenant, unit, agreement_number: str,
            facts: list[tuple[str, str]], items: list[tuple[str, Decimal]], totals: list[tuple[str, str]],
            balance: Decimal, payments: list[tuple[str, object, str, Decimal]], payments_heading: str,
            reference: str, notes: list[str], footnote: str | None, title: str, generated_at: datetime) -> bytes:
    cfg = _settings(db)
    company = cfg.get("company.name", "Evaramu Group Ltd")
    status_label, status_color = STATUS.get(status, (status.upper(), NAVY))
    prop = unit.property

    def decorate(c, doc):
        c.saveState()
        if LOGO.exists():
            img = ImageReader(str(LOGO))
            iw, ih = img.getSize()
            lh = 1.3 * cm
            c.drawImage(img, MX, H - 1.2 * cm - lh, width=lh * iw / ih, height=lh, mask="auto")
        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 22)
        c.drawRightString(W - MX, H - 1.85 * cm, "INVOICE")
        c.setFont("Helvetica", 9)
        c.setFillColor(MUTED)
        c.drawRightString(W - MX, H - 2.35 * cm, number)
        c.setStrokeColor(GOLD)
        c.setLineWidth(1.4)
        c.line(MX, H - 2.85 * cm, W - MX, H - 2.85 * cm)
        # Stamp for settled or cancelled invoices.
        if status in (InvoiceStatus.PAID.value, InvoiceStatus.VOID.value):
            c.translate(W / 2, H / 2)
            c.rotate(28)
            c.setFillColor(status_color)
            c.setFillAlpha(0.07)
            c.setFont("Helvetica-Bold", 120)
            c.drawCentredString(0, -40, status_label)
            c.setFillAlpha(1)
            c.rotate(-28)
            c.translate(-W / 2, -H / 2)
        # Footer.
        c.setStrokeColor(LINE)
        c.setLineWidth(0.6)
        c.line(MX, 1.5 * cm, W - MX, 1.5 * cm)
        c.setFont("Helvetica", 7.5)
        c.setFillColor(MUTED)
        contact = " · ".join(x for x in (company, cfg.get("contact.address"), cfg.get("contact.phone"),
                                         cfg.get("contact.email")) if x)
        c.drawString(MX, 1.0 * cm, contact[:150])
        c.drawRightString(W - MX, 0.6 * cm, f"Generated {generated_at.day} {generated_at:%b %Y, %H:%M} · Page {doc.page}")
        c.restoreState()

    width = W - 2 * MX
    pill = Table([[Paragraph(f"<font color='white'><b>{status_label}</b></font>", P["body"])]], hAlign="LEFT",
                 colWidths=[0.25 * cm * len(status_label) + 1.0 * cm],
                 style=TableStyle([("BACKGROUND", (0, 0), (-1, -1), status_color), ("LEFTPADDING", (0, 0), (-1, -1), 8),
                                   ("RIGHTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 3),
                                   ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))

    location = ", ".join(x for x in (prop.sector, prop.district, prop.city) if x)
    billed = [Paragraph("BILLED TO", P["label"]), Spacer(1, 3), Paragraph(text(tenant.full_name), P["strong"]),
              Paragraph(text(tenant.phone), P["body"]),
              Paragraph(f"{text(unit.code)} · {text(unit.name)}", P["body"]),
              Paragraph(text(prop.name) + (f", {text(location)}" if location else ""), P["small"])]
    facts = [*facts, ("Agreement", text(agreement_number or "—")), ("Currency", cur)]
    facts_t = Table([[Paragraph(k.upper(), P["label"]), Paragraph(f"<b>{v}</b>", P["body"])] for k, v in facts],
                    colWidths=[2.6 * cm, 5.4 * cm],
                    style=TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                                      ("TOPPADDING", (0, 0), (-1, -1), 2), ("LEFTPADDING", (0, 0), (-1, -1), 0)]))
    top = Table([[billed, [pill, Spacer(1, 8), facts_t]]], colWidths=[width - 8.2 * cm, 8.2 * cm],
                style=TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0),
                                  ("RIGHTPADDING", (0, 0), (-1, -1), 0)]))

    item_rows = [[Paragraph(text(d), P["td"]), Paragraph(money(a, cur), P["td_r"])] for d, a in items]
    items_t = Table([[Paragraph("Description", P["th"]), Paragraph("Amount", P["th_r"])], *item_rows],
                    colWidths=[width - 4.5 * cm, 4.5 * cm], repeatRows=1)
    st = [("BACKGROUND", (0, 0), (-1, 0), NAVY), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
          ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
          ("LINEBELOW", (0, 1), (-1, -1), 0.4, LINE)]
    st += [("BACKGROUND", (0, i), (-1, i), ZEBRA) for i in range(2, len(item_rows) + 1, 2)]
    items_t.setStyle(TableStyle(st))

    due_color = "#067647" if balance <= 0 else ("#b42318" if status == InvoiceStatus.OVERDUE.value else "#032a4e")
    rows = [[Paragraph(k, P["body"]), Paragraph(v, P["td_r"])] for k, v in totals]
    rows.append([Paragraph("<b>Balance due</b>", P["body"]),
                 Paragraph(f"<font size='14' color='{due_color}'><b>{money(balance, cur)}</b></font>", P["td_r"])])
    totals_t = Table(rows, colWidths=[3.6 * cm, 4.6 * cm])
    totals_t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), TINT), ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                                  ("LINEABOVE", (0, -1), (-1, -1), 1.2, NAVY), ("TOPPADDING", (0, 0), (-1, -1), 5),
                                  ("BOTTOMPADDING", (0, 0), (-1, -1), 5), ("TOPPADDING", (0, -1), (-1, -1), 8),
                                  ("BOTTOMPADDING", (0, -1), (-1, -1), 8), ("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
    totals_wrap = Table([["", totals_t]], colWidths=[width - 8.2 * cm, 8.2 * cm],
                        style=TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0)]))

    story: list = [top, Spacer(1, 16), items_t, Spacer(1, 10), totals_wrap]
    if footnote:
        story += [Spacer(1, 6), Paragraph(footnote, P["small"])]

    if payments:
        pay_rows = [[Paragraph(text(n), P["td"]), Paragraph(day(d), P["td"]),
                     Paragraph(text(label), P["td"]), Paragraph(money(amt, cur), P["td_r"])] for n, d, label, amt in payments]
        pay_t = Table([[Paragraph(h, P["th"]) for h in ("Payment", "Date", "Method")] + [Paragraph("Applied", P["th_r"])],
                       *pay_rows], colWidths=[width * 0.3, width * 0.22, width * 0.26, width * 0.22], repeatRows=1)
        pay_t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), NAVY), ("TOPPADDING", (0, 0), (-1, -1), 5),
                                   ("BOTTOMPADDING", (0, 0), (-1, -1), 5), ("LINEBELOW", (0, 1), (-1, -1), 0.4, LINE)]))
        story += [Spacer(1, 18), Paragraph(payments_heading, P["h"]), Spacer(1, 6), pay_t]

    if balance > 0 and status != InvoiceStatus.VOID.value:
        how = []
        if cfg.get("landlord.bank_name") or cfg.get("landlord.bank_account_number"):
            how.append(f"Bank: <b>{text(cfg.get('landlord.bank_name', ''))}</b> · Account: "
                       f"<b>{text(cfg.get('landlord.bank_account_number', ''))}</b>"
                       + (f" · Name: <b>{text(cfg['landlord.bank_account_name'])}</b>" if cfg.get("landlord.bank_account_name") else ""))
        phone = cfg.get("landlord.phone") or cfg.get("contact.phone")
        if phone:
            how.append(f"Questions about this invoice: <b>{text(phone)}</b>")
        how.append(f"Please quote <b>{text(reference)}</b> as the payment reference.")
        box = Table([[[Paragraph("HOW TO PAY", P["label"]), Spacer(1, 4)] + [Paragraph(h, P["body"]) for h in how]]],
                    colWidths=[width])
        box.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.6, LINE), ("LINEBEFORE", (0, 0), (0, -1), 3, GOLD),
                                 ("LEFTPADDING", (0, 0), (-1, -1), 12), ("TOPPADDING", (0, 0), (-1, -1), 10),
                                 ("BOTTOMPADDING", (0, 0), (-1, -1), 10)]))
        story += [Spacer(1, 18), box]
    for n in notes:
        story += [Spacer(1, 10), Paragraph(n, P["small"])]
    story += [Spacer(1, 16), Paragraph(f"Thank you for renting with {text(company)}.", P["small"])]

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=MX, rightMargin=MX, topMargin=3.4 * cm, bottomMargin=2.2 * cm,
                            title=f"{title} — {company}", author=company,
                            subject=f"Invoice for {tenant.full_name}", creator="Evaramu")
    doc.build(story, onFirstPage=decorate, onLaterPages=decorate)
    return buf.getvalue()


def render_invoice(db: Session, invoice: Invoice, generated_at: datetime) -> bytes:
    cur = invoice.currency
    period = (f"{day(invoice.period_start)} – {day(invoice.period_end)}" if invoice.period_start and invoice.period_end
              else "—")
    items = [(i.description, i.amount) for i in invoice.items or []] or [("Rent", invoice.amount_charged)]
    totals = [("Charged", money(invoice.amount_charged, cur))]
    if invoice.amount_credited:
        totals.append(("Credits", f"− {money(invoice.amount_credited, cur)}"))
    totals.append(("Paid", f"− {money(invoice.amount_paid, cur)}"))
    footnote = None
    if invoice.previous_balance and invoice.previous_balance > 0:
        footnote = (f"Earlier unpaid balance on this agreement: <b>{money(invoice.previous_balance, cur)}</b> — total "
                    f"owed <b>{money(invoice.total_due, cur)}</b>.")
    notes = []
    if invoice.notes:
        notes.append(f"<b>Notes:</b> {text(invoice.notes)}")
    if invoice.status == InvoiceStatus.VOID.value and invoice.void_reason:
        notes.append(f"<b>Cancelled:</b> {text(invoice.void_reason)}")
    return _render(
        db, number=invoice.invoice_number, status=invoice.status, cur=cur, tenant=invoice.tenant, unit=invoice.unit,
        agreement_number=invoice.agreement.agreement_number if invoice.agreement else "",
        facts=[("Issue date", day(invoice.issue_date)), ("Due date", day(invoice.due_date)), ("Period", period)],
        items=items, totals=totals, balance=invoice.balance_due,
        payments=[(p.payment_number, p.payment_date, label, amt) for p, amt, label in _payments(db, invoice)],
        payments_heading="Payments received for this invoice", reference=invoice.invoice_number, notes=notes,
        footnote=footnote, title=f"Invoice {invoice.invoice_number}", generated_at=generated_at,
    )


def payment_invoices(payment: Payment) -> list[Invoice]:
    """The invoices an approved payment paid, oldest period first."""
    invs = {a.invoice_id: a.invoice for a in payment.allocations}
    return sorted(invs.values(), key=lambda i: (i.period_start or i.issue_date, i.id))


def _invoice_lines(invoices: list[Invoice]) -> list[tuple[str, Decimal]]:
    lines = []
    for i in invoices:
        desc = "; ".join(x.description for x in i.items) if i.items else "Rent"
        lines.append((f"{desc} ({i.invoice_number})", i.amount_charged))
    return lines


def _span(invoices: list[Invoice]) -> tuple[str, int]:
    starts = [i.period_start for i in invoices if i.period_start]
    ends = [i.period_end for i in invoices if i.period_end]
    period = f"{day(min(starts))} – {day(max(ends))}" if starts and ends else "—"
    return period, len(starts)


def render_payment_invoice(db: Session, payment: Payment, generated_at: datetime) -> bytes:
    """One invoice for everything a payment paid — e.g. three months of rent paid at once."""
    cur = payment.currency
    invoices = payment_invoices(payment)
    charged = sum((i.amount_charged for i in invoices), Decimal("0"))
    credited = sum((i.amount_credited for i in invoices), Decimal("0"))
    balance = sum((i.balance_due for i in invoices), Decimal("0"))
    this_payment = sum((a.amount for a in payment.allocations), Decimal("0"))
    other_paid = sum((i.amount_paid for i in invoices), Decimal("0")) - this_payment
    period, months = _span(invoices)

    totals = [("Charged", money(charged, cur))]
    if credited:
        totals.append(("Credits", f"− {money(credited, cur)}"))
    if other_paid > 0:
        totals.append(("Paid before", f"− {money(other_paid, cur)}"))
    totals.append(("This payment", f"− {money(this_payment, cur)}"))
    status = InvoiceStatus.PAID.value if balance <= 0 else InvoiceStatus.PARTIALLY_PAID.value
    method = payment.method.label if payment.method else payment.method_code
    notes = []
    if payment.unapplied_amount > 0:
        notes.append(f"<b>Credit:</b> {money(payment.unapplied_amount, cur)} of this payment is held as credit "
                     "for future invoices.")
    return _render(
        db, number=f"{payment.payment_number}" + (f" · {months} months" if months > 1 else ""), status=status,
        cur=cur, tenant=payment.tenant, unit=payment.unit, agreement_number=payment.agreement.agreement_number,
        facts=[("Paid on", day(payment.payment_date)), ("Period", period),
               ("Months", str(months) if months else "—")],
        items=_invoice_lines(invoices), totals=totals, balance=balance,
        payments=[(payment.payment_number, payment.payment_date, method, this_payment)],
        payments_heading="Payment received", reference=payment.payment_number, notes=notes, footnote=None,
        title=f"Invoice {payment.payment_number}", generated_at=generated_at,
    )


def combined_reference(invoices: list[Invoice]) -> str:
    first, last = invoices[0].invoice_number, invoices[-1].invoice_number
    return first if len(invoices) == 1 else f"{first} – {last}"


def render_combined_invoice(db: Session, invoices: list[Invoice], generated_at: datetime) -> bytes:
    """Several invoices of one tenant (same currency) on a single invoice."""
    invoices = sorted(invoices, key=lambda i: (i.period_start or i.issue_date, i.id))
    cur = invoices[0].currency
    charged = sum((i.amount_charged for i in invoices), Decimal("0"))
    credited = sum((i.amount_credited for i in invoices), Decimal("0"))
    paid = sum((i.amount_paid for i in invoices), Decimal("0"))
    balance = sum((i.balance_due for i in invoices), Decimal("0"))
    period, months = _span(invoices)
    if balance <= 0:
        status = InvoiceStatus.PAID.value
    elif any(i.status == InvoiceStatus.OVERDUE.value for i in invoices):
        status = InvoiceStatus.OVERDUE.value
    elif paid > 0:
        status = InvoiceStatus.PARTIALLY_PAID.value
    else:
        status = InvoiceStatus.UNPAID.value

    by_payment: dict[int, list] = {}
    for inv in invoices:
        for p, amt, label in _payments(db, inv):
            row = by_payment.setdefault(p.id, [p.payment_number, p.payment_date, label, Decimal("0")])
            row[3] += amt
    payments = sorted((tuple(r) for r in by_payment.values()), key=lambda r: (r[1], r[0]))

    totals = [("Charged", money(charged, cur))]
    if credited:
        totals.append(("Credits", f"− {money(credited, cur)}"))
    totals.append(("Paid", f"− {money(paid, cur)}"))
    open_dues = [i.due_date for i in invoices if i.balance_due > 0]
    first = invoices[0]
    agreements = sorted({i.agreement.agreement_number for i in invoices if i.agreement})
    ref = combined_reference(invoices)
    return _render(
        db, number=f"{len(invoices)} invoices · {ref}" if len(invoices) > 1 else ref, status=status, cur=cur,
        tenant=first.tenant, unit=first.unit, agreement_number=", ".join(agreements),
        facts=[("Issue date", day(min(i.issue_date for i in invoices))),
               ("Due date", day(min(open_dues)) if open_dues else "—"), ("Period", period),
               ("Months", str(months) if months else "—")],
        items=_invoice_lines(invoices), totals=totals, balance=balance, payments=payments,
        payments_heading="Payments received for these invoices", reference=ref, notes=[], footnote=None,
        title=f"Invoices {ref}", generated_at=generated_at,
    )
