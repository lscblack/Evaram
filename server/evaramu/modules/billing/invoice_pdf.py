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


def render_invoice(db: Session, invoice: Invoice, generated_at: datetime) -> bytes:
    cfg = _settings(db)
    company = cfg.get("company.name", "Evaramu Group Ltd")
    cur = invoice.currency
    status_label, status_color = STATUS.get(invoice.status, (invoice.status.upper(), NAVY))
    unit, prop, tenant = invoice.unit, invoice.unit.property, invoice.tenant

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
        c.drawRightString(W - MX, H - 2.35 * cm, invoice.invoice_number)
        c.setStrokeColor(GOLD)
        c.setLineWidth(1.4)
        c.line(MX, H - 2.85 * cm, W - MX, H - 2.85 * cm)
        # Stamp for settled or cancelled invoices.
        if invoice.status in (InvoiceStatus.PAID.value, InvoiceStatus.VOID.value):
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
    period = (f"{day(invoice.period_start)} – {day(invoice.period_end)}" if invoice.period_start and invoice.period_end
              else "—")
    facts = [["Issue date", day(invoice.issue_date)], ["Due date", day(invoice.due_date)], ["Period", period],
             ["Agreement", text(invoice.agreement.agreement_number if invoice.agreement else "—")], ["Currency", cur]]
    facts_t = Table([[Paragraph(k.upper(), P["label"]), Paragraph(f"<b>{v}</b>", P["body"])] for k, v in facts],
                    colWidths=[2.6 * cm, 5.4 * cm],
                    style=TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                                      ("TOPPADDING", (0, 0), (-1, -1), 2), ("LEFTPADDING", (0, 0), (-1, -1), 0)]))
    top = Table([[billed, [pill, Spacer(1, 8), facts_t]]], colWidths=[width - 8.2 * cm, 8.2 * cm],
                style=TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0),
                                  ("RIGHTPADDING", (0, 0), (-1, -1), 0)]))

    items = invoice.items or []
    item_rows = [[Paragraph(text(i.description), P["td"]), Paragraph(money(i.amount, cur), P["td_r"])] for i in items]
    if not item_rows:
        item_rows = [[Paragraph("Rent", P["td"]), Paragraph(money(invoice.amount_charged, cur), P["td_r"])]]
    items_t = Table([[Paragraph("Description", P["th"]), Paragraph("Amount", P["th_r"])], *item_rows],
                    colWidths=[width - 4.5 * cm, 4.5 * cm], repeatRows=1)
    st = [("BACKGROUND", (0, 0), (-1, 0), NAVY), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
          ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
          ("LINEBELOW", (0, 1), (-1, -1), 0.4, LINE)]
    st += [("BACKGROUND", (0, i), (-1, i), ZEBRA) for i in range(2, len(item_rows) + 1, 2)]
    items_t.setStyle(TableStyle(st))

    balance = invoice.balance_due
    totals = [["Charged", money(invoice.amount_charged, cur)]]
    if invoice.amount_credited:
        totals.append(["Credits", f"− {money(invoice.amount_credited, cur)}"])
    totals.append(["Paid", f"− {money(invoice.amount_paid, cur)}"])
    due_color = "#067647" if balance <= 0 else ("#b42318" if invoice.status == InvoiceStatus.OVERDUE.value else "#032a4e")
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
    if invoice.previous_balance and invoice.previous_balance > 0:
        story += [Spacer(1, 6), Paragraph(
            f"Earlier unpaid balance on this agreement: <b>{money(invoice.previous_balance, cur)}</b> — total owed "
            f"<b>{money(invoice.total_due, cur)}</b>.", P["small"])]

    paid = _payments(db, invoice)
    if paid:
        pay_rows = [[Paragraph(text(p.payment_number), P["td"]), Paragraph(day(p.payment_date), P["td"]),
                     Paragraph(text(label), P["td"]), Paragraph(money(amt, cur), P["td_r"])] for p, amt, label in paid]
        pay_t = Table([[Paragraph(h, P["th"]) for h in ("Payment", "Date", "Method")] + [Paragraph("Applied", P["th_r"])],
                       *pay_rows], colWidths=[width * 0.3, width * 0.22, width * 0.26, width * 0.22], repeatRows=1)
        pay_t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), NAVY), ("TOPPADDING", (0, 0), (-1, -1), 5),
                                   ("BOTTOMPADDING", (0, 0), (-1, -1), 5), ("LINEBELOW", (0, 1), (-1, -1), 0.4, LINE)]))
        story += [Spacer(1, 18), Paragraph("Payments received for this invoice", P["h"]), Spacer(1, 6), pay_t]

    if balance > 0 and invoice.status != InvoiceStatus.VOID.value:
        how = []
        if cfg.get("landlord.bank_name") or cfg.get("landlord.bank_account_number"):
            how.append(f"Bank: <b>{text(cfg.get('landlord.bank_name', ''))}</b> · Account: "
                       f"<b>{text(cfg.get('landlord.bank_account_number', ''))}</b>"
                       + (f" · Name: <b>{text(cfg['landlord.bank_account_name'])}</b>" if cfg.get("landlord.bank_account_name") else ""))
        phone = cfg.get("landlord.phone") or cfg.get("contact.phone")
        if phone:
            how.append(f"Questions about this invoice: <b>{text(phone)}</b>")
        how.append(f"Please quote <b>{text(invoice.invoice_number)}</b> as the payment reference.")
        box = Table([[[Paragraph("HOW TO PAY", P["label"]), Spacer(1, 4)] + [Paragraph(h, P["body"]) for h in how]]],
                    colWidths=[width])
        box.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.6, LINE), ("LINEBEFORE", (0, 0), (0, -1), 3, GOLD),
                                 ("LEFTPADDING", (0, 0), (-1, -1), 12), ("TOPPADDING", (0, 0), (-1, -1), 10),
                                 ("BOTTOMPADDING", (0, 0), (-1, -1), 10)]))
        story += [Spacer(1, 18), box]
    if invoice.notes:
        story += [Spacer(1, 12), Paragraph(f"<b>Notes:</b> {text(invoice.notes)}", P["small"])]
    if invoice.status == InvoiceStatus.VOID.value and invoice.void_reason:
        story += [Spacer(1, 8), Paragraph(f"<b>Cancelled:</b> {text(invoice.void_reason)}", P["small"])]
    story += [Spacer(1, 16), Paragraph(f"Thank you for renting with {text(company)}.", P["small"])]

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=MX, rightMargin=MX, topMargin=3.4 * cm, bottomMargin=2.2 * cm,
                            title=f"Invoice {invoice.invoice_number} — {company}", author=company,
                            subject=f"Invoice for {tenant.full_name}", creator="Evaramu")
    doc.build(story, onFirstPage=decorate, onLaterPages=decorate)
    return buf.getvalue()
