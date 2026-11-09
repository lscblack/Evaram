"""PDF rendering for the downloadable reports (ReportLab, A4 landscape).

Every page carries the company logo and details, the report title and the
generation date; the first page opens with summary cards. All text from the
database is escaped before it reaches ReportLab's mini-markup.
"""

from __future__ import annotations

import io
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.platypus import CondPageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

LOGO = Path(__file__).resolve().parents[2] / "assets" / "report-logo.png"

NAVY = colors.HexColor("#032a4e")
GOLD = colors.HexColor("#bc7a26")
INK = colors.HexColor("#0f172a")
MUTED = colors.HexColor("#64748b")
LINE = colors.HexColor("#dbe3ec")
TINT = colors.HexColor("#f3f6fa")
ZEBRA = colors.HexColor("#f8fafc")
RED = colors.HexColor("#b42318")
GREEN = colors.HexColor("#067647")

PAGE = landscape(A4)
MARGIN_X = 1.5 * cm
TOP = 3.0 * cm
BOTTOM = 1.8 * cm

S = {
    "title": ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=20, leading=24, textColor=NAVY),
    "sub": ParagraphStyle("sub", fontName="Helvetica", fontSize=9.5, leading=13, textColor=MUTED),
    "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=12, leading=15, textColor=NAVY, spaceBefore=6),
    "kpi_label": ParagraphStyle("kl", fontName="Helvetica-Bold", fontSize=7, leading=9, textColor=MUTED),
    "kpi_value": ParagraphStyle("kv", fontName="Helvetica-Bold", fontSize=14, leading=17, textColor=NAVY),
    "kpi_note": ParagraphStyle("kn", fontName="Helvetica", fontSize=7.5, leading=9.5, textColor=MUTED),
    "th": ParagraphStyle("th", fontName="Helvetica-Bold", fontSize=8, leading=10, textColor=colors.white),
    "th_r": ParagraphStyle("thr", fontName="Helvetica-Bold", fontSize=8, leading=10, textColor=colors.white, alignment=TA_RIGHT),
    "td": ParagraphStyle("td", fontName="Helvetica", fontSize=8.5, leading=10.5, textColor=INK),
    "td_r": ParagraphStyle("tdr", fontName="Helvetica", fontSize=8.5, leading=10.5, textColor=INK, alignment=TA_RIGHT),
    "td_b": ParagraphStyle("tdb", fontName="Helvetica-Bold", fontSize=8.5, leading=10.5, textColor=INK),
    "td_br": ParagraphStyle("tdbr", fontName="Helvetica-Bold", fontSize=8.5, leading=10.5, textColor=INK, alignment=TA_RIGHT),
    "note": ParagraphStyle("note", fontName="Helvetica", fontSize=7.5, leading=10, textColor=MUTED, alignment=TA_LEFT),
    "empty": ParagraphStyle("empty", fontName="Helvetica-Oblique", fontSize=9.5, leading=13, textColor=MUTED),
}


# ---- formatting ---------------------------------------------------------------------------------

def money(amount: Decimal | int | float | None, currency: str) -> str:
    a = Decimal(str(amount or 0))
    if currency == "USD":
        return f"${a:,.2f}"
    return f"{a:,.0f} {currency}"


def day(d: date | None) -> str:
    return f"{d.day} {d:%b %Y}" if d else "—"


def month(d: date | None) -> str:
    return f"{d:%b %Y}" if d else "—"


def text(value) -> str:
    return escape(str(value if value is not None else ""))


# ---- document model -----------------------------------------------------------------------------

@dataclass
class Kpi:
    label: str
    value: str
    note: str = ""
    tone: str = "navy"   # navy | red | green


@dataclass
class Column:
    header: str
    width: float          # relative
    align: str = "left"   # left | right


@dataclass
class Section:
    title: str
    columns: list[Column]
    rows: list[list[str]]
    totals: list[list[str]] = field(default_factory=list)
    intro: str = ""
    empty: str = "Nothing to show."


@dataclass
class Report:
    title: str
    subtitle: str
    kpis: list[Kpi]
    sections: list[Section]
    secondary_kpis: list[Kpi] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)


@dataclass
class Meta:
    company: str
    contact_lines: list[str]
    generated_at: datetime
    generated_by: str


# ---- building blocks ----------------------------------------------------------------------------

def _kpi_row(kpis: list[Kpi], width: float) -> Table:
    tone = {"navy": NAVY, "red": RED, "green": GREEN}
    cells = []
    for k in kpis:
        value_style = ParagraphStyle("v", parent=S["kpi_value"], textColor=tone.get(k.tone, NAVY))
        cells.append([Paragraph(text(k.label).upper(), S["kpi_label"]), Spacer(1, 3),
                      Paragraph(k.value, value_style)] + ([Spacer(1, 2), Paragraph(k.note, S["kpi_note"])] if k.note else []))
    gap = 0.25 * cm
    n = len(kpis)
    col = (width - gap * (n - 1)) / n
    widths, row = [], []
    for i, c in enumerate(cells):
        if i:
            widths.append(gap)
            row.append("")
        widths.append(col)
        row.append(c)
    t = Table([row], colWidths=widths)
    style = [("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 9),
             ("RIGHTPADDING", (0, 0), (-1, -1), 9), ("TOPPADDING", (0, 0), (-1, -1), 8),
             ("BOTTOMPADDING", (0, 0), (-1, -1), 9)]
    for i in range(0, len(row), 2):
        style += [("BACKGROUND", (i, 0), (i, 0), TINT), ("BOX", (i, 0), (i, 0), 0.6, LINE),
                  ("LINEABOVE", (i, 0), (i, 0), 2.2, GOLD if i == 0 else NAVY)]
    t.setStyle(TableStyle(style))
    return t


def _table(sec: Section, width: float) -> list:
    out: list = [Paragraph(text(sec.title), S["h2"])]
    if sec.intro:
        out.append(Paragraph(sec.intro, S["sub"]))
    out.append(Spacer(1, 6))
    if not sec.rows:
        out.append(Paragraph(text(sec.empty), S["empty"]))
        return out
    total_w = sum(c.width for c in sec.columns)
    widths = [width * c.width / total_w for c in sec.columns]
    right = [c.align == "right" for c in sec.columns]
    head = [Paragraph(text(c.header), S["th_r"] if r else S["th"]) for c, r in zip(sec.columns, right, strict=True)]
    body = [[Paragraph(v, S["td_r"] if r else S["td"]) for v, r in zip(row, right, strict=True)] for row in sec.rows]
    foot = [[Paragraph(v, S["td_br"] if r else S["td_b"]) for v, r in zip(row, right, strict=True)] for row in sec.totals]
    t = Table([head, *body, *foot], colWidths=widths, repeatRows=1)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 1), (-1, len(body)), 0.4, LINE),
    ]
    for i in range(1, len(body) + 1):
        if i % 2 == 0:
            style.append(("BACKGROUND", (0, i), (-1, i), ZEBRA))
    if foot:
        first = len(body) + 1
        style += [("BACKGROUND", (0, first), (-1, -1), TINT), ("LINEABOVE", (0, first), (-1, first), 1.2, NAVY)]
    t.setStyle(TableStyle(style))
    out.append(t)
    return out


class _NumberedCanvas(rl_canvas.Canvas):
    """Two-pass canvas so the footer can say "Page X of Y"."""

    def __init__(self, *args, meta: Meta, title: str, **kwargs):
        super().__init__(*args, **kwargs)
        self._pages: list[dict] = []
        self._meta = meta
        self._title = title

    def showPage(self):  # noqa: N802 - ReportLab API
        self._pages.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total = len(self._pages)
        for state in self._pages:
            self.__dict__.update(state)
            self._decorate(total)
            super().showPage()
        super().save()

    def _decorate(self, total: int) -> None:
        w, h = PAGE
        m = self._meta
        # Header: logo left, company details right, gold rule.
        if LOGO.exists():
            img = ImageReader(str(LOGO))
            iw, ih = img.getSize()
            lh = 1.15 * cm
            self.drawImage(img, MARGIN_X, h - 0.9 * cm - lh, width=lh * iw / ih, height=lh, mask="auto")
        self.setFillColor(NAVY)
        self.setFont("Helvetica-Bold", 10.5)
        self.drawRightString(w - MARGIN_X, h - 1.2 * cm, m.company)
        self.setFillColor(MUTED)
        self.setFont("Helvetica", 7.8)
        y = h - 1.6 * cm
        for line in m.contact_lines[:3]:
            self.drawRightString(w - MARGIN_X, y, line)
            y -= 0.36 * cm
        self.setStrokeColor(GOLD)
        self.setLineWidth(1.4)
        self.line(MARGIN_X, h - 2.45 * cm, w - MARGIN_X, h - 2.45 * cm)
        # Footer.
        self.setStrokeColor(LINE)
        self.setLineWidth(0.6)
        self.line(MARGIN_X, 1.3 * cm, w - MARGIN_X, 1.3 * cm)
        self.setFont("Helvetica", 7.5)
        self.setFillColor(MUTED)
        stamp = f"{m.generated_at.day} {m.generated_at:%b %Y, %H:%M}"
        self.drawString(MARGIN_X, 0.85 * cm, f"{self._title}  ·  Generated {stamp} by {m.generated_by}  ·  Confidential")
        self.drawRightString(w - MARGIN_X, 0.85 * cm, f"Page {self._pageNumber} of {total}")


def render(report: Report, meta: Meta) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=PAGE, leftMargin=MARGIN_X, rightMargin=MARGIN_X, topMargin=TOP,
                            bottomMargin=BOTTOM, title=f"{report.title} — {meta.company}", author=meta.company,
                            subject=report.subtitle, creator="Evaramu")
    width = PAGE[0] - 2 * MARGIN_X
    story: list = [Paragraph(text(report.title), S["title"]), Spacer(1, 3),
                   Paragraph(report.subtitle, S["sub"]), Spacer(1, 12)]
    if report.kpis:
        story += [_kpi_row(report.kpis, width), Spacer(1, 8)]
    if report.secondary_kpis:
        story += [_kpi_row(report.secondary_kpis, width), Spacer(1, 6)]
    for sec in report.sections:
        # Never leave a section heading alone at the bottom of a page.
        story += [Spacer(1, 8), CondPageBreak(2.8 * cm), *_table(sec, width)]
    if report.notes:
        story.append(Spacer(1, 12))
        story += [Paragraph(n, S["note"]) for n in report.notes]
    doc.build(story, canvasmaker=lambda *a, **k: _NumberedCanvas(*a, meta=meta, title=report.title, **k))
    return buf.getvalue()
