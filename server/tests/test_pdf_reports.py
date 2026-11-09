import io
from datetime import date, datetime, timedelta
from decimal import Decimal

from conftest import SessionLocal
from pypdf import PdfReader
from sqlalchemy import text
from test_billing import MONTH_START, THIS_MONTH, prev_month

from evaramu.modules.reports import builders, pdf, statements

TODAY = date.today()


def pdf_text(content: bytes) -> str:
    return "".join(p.extract_text() for p in PdfReader(io.BytesIO(content)).pages)
PREV = prev_month(MONTH_START)


def setup(api, tenant_name="Jean Mugisha"):
    """RWF tenant pays one full month and part of the next; USD tenant pays nothing (overdue)."""
    prop = api.property()
    rwf = api.unit(prop["id"], code="R101", rent="150000")
    usd = api.unit(prop["id"], code="A201", unit_type="apartment", rent="800", currency="USD")
    api.unit(prop["id"], code="R102", rent="90000")  # free room
    t1 = api.tenant(name=tenant_name)
    t2 = api.tenant(name="Grace Ingabire", phone="+250788000002")
    a1 = api.agreement(t1["id"], rwf["id"], start=PREV.isoformat(), end=None, due_day=1)
    api.agreement(t2["id"], usd["id"], start=PREV.isoformat(), end=None, due_day=1)
    api.generate(PREV.strftime("%Y-%m"))
    api.generate(THIS_MONTH)
    p = api.ok(api.pay(a1["id"], 200000), 201)
    api.ok(api.approve(p["id"]))
    return prop


def test_payments_received_months_paid_and_units_taken(api):
    setup(api)
    with SessionLocal() as db:
        d = statements.payments_received(db, date_from=MONTH_START, date_to=TODAY)
    assert d["totals"] == {"RWF": Decimal("200000.00")} and d["payment_count"] == 1 and d["tenant_count"] == 1
    row = d["rows"][0]
    assert (row["tenant"], row["units"], row["months_full"], row["months_part"]) == ("Jean Mugisha", ["R101"], 1, 1)
    u = d["units"]
    assert (u["total"], u["taken"], u["free"]) == (3, 2, 1)
    assert {t["type"]: (t["taken"], t["total"]) for t in u["by_type"]} == {"room": (1, 2), "apartment": (1, 1)}
    with SessionLocal() as db:
        empty = statements.payments_received(db, date_from=MONTH_START - timedelta(days=400),
                                             date_to=MONTH_START - timedelta(days=370))
    assert empty["rows"] == [] and empty["totals"] == {}


def test_overdue_tenants_keep_currencies_apart(api):
    setup(api)
    with SessionLocal() as db:
        d = statements.overdue_tenants(db, TODAY)
        db.commit()
    by_tenant = {r["tenant"]: r for r in d["rows"]}
    grace = by_tenant["Grace Ingabire"]
    assert grace["currency"] == "USD" and grace["months"] >= 1 and grace["amount"] >= Decimal("800")
    assert grace["days_late"] == (TODAY - grace["oldest_due"]).days > 0
    assert "USD" in d["totals"] and d["tenant_count"] == len(by_tenant)
    assert sum(d["ageing"]["USD"].values()) == d["totals"]["USD"]


def test_occupancy_lists_every_unit(api):
    setup(api)
    with SessionLocal() as db:
        d = statements.occupancy(db)
    rows = {r["unit"]: r for r in d["rows"]}
    assert rows["R101"]["taken"] and rows["R101"]["tenant"] == "Jean Mugisha"
    assert not rows["R102"]["taken"] and rows["R102"]["tenant"] == ""
    assert d["expected_rent"] == {"RWF": Decimal("150000.00"), "USD": Decimal("800.00")}


def test_pdf_downloads(api, client):
    setup(api)
    for path, name in [("payments-received", "payments-received"), ("overdue", "overdue-tenants"),
                       ("occupancy", "occupancy")]:
        r = client.get(f"/api/v1/reports/pdf/{path}", headers=api.h)
        assert r.status_code == 200, r.text
        assert r.headers["content-type"] == "application/pdf" and r.content.startswith(b"%PDF")
        assert f'filename="evaramu-{name}-' in r.headers["content-disposition"]
    r = client.get("/api/v1/reports/pdf/payments-received", headers=api.h,
                   params={"date_from": "2026-02-01", "date_to": "2026-01-01"})
    assert r.status_code == 400
    with SessionLocal() as db:  # every download is in the audit trail
        assert db.execute(text("SELECT count(*) FROM audit_logs WHERE action = 'report.downloaded'")).scalar() == 3


def test_pdf_reports_need_permission(api, client):
    from conftest import login, make_user

    make_user("manager@example.com", "Property Manager")  # no reports.view
    h = login(client, "manager@example.com")
    assert client.get("/api/v1/reports/pdf/payments-received", headers=h).status_code == 403
    assert client.get("/api/v1/reports/pdf/overdue", headers=h).status_code == 403


def test_names_with_markup_characters_render(api):
    setup(api, tenant_name="Jean <b>&amp; Sons</b> & Co")
    with SessionLocal() as db:
        d = statements.payments_received(db, date_from=None, date_to=None)
    report = builders.payments_received(d, date_from=None, date_to=None, property_name="A & B <x>", currency=None)
    assert "&lt;b&gt;" in report.sections[0].rows[0][0]
    meta = pdf.Meta(company="Evaramu", contact_lines=[], generated_at=datetime.now(), generated_by="Tester")
    assert pdf.render(report, meta).startswith(b"%PDF")


def test_money_and_date_formats():
    assert pdf.money(Decimal("1250000"), "RWF") == "1,250,000 RWF"
    assert pdf.money(Decimal("950"), "USD") == "$950.00"
    assert pdf.day(date(2026, 11, 9)) == "9 Nov 2026" and pdf.month(date(2026, 12, 31)) == "Dec 2026"


def test_choose_cards_and_tables(api, client):
    setup(api)
    opts = client.get("/api/v1/reports/pdf/options", headers=api.h).json()
    assert {o["key"] for o in opts["payments-received"]["cards"]} >= {"total_paid", "units_taken", "type_room"}

    with SessionLocal() as db:
        d = statements.payments_received(db, date_from=None, date_to=None)
    full = builders.payments_received(d, date_from=None, date_to=None, property_name=None, currency=None)
    # Every card and table the builder makes is one the user can choose.
    keys = {k.key for k in full.kpis + full.secondary_kpis}
    assert keys and keys <= {o["key"] for o in opts["payments-received"]["cards"]}
    picked = builders.choose(full, {"total_paid", "type_room"}, set())
    assert [k.key for k in picked.kpis + picked.secondary_kpis] == ["total_paid", "type_room"] and picked.sections == []

    r = client.get("/api/v1/reports/pdf/payments-received", headers=api.h,
                   params={"cards": "total_paid,units_taken", "sections": "tenants"})
    assert r.status_code == 200 and r.content.startswith(b"%PDF")
    # The tenants who paid, with the amount each paid, are in the PDF (regression: the
    # tables list used to be read from the cards list, dropping the table).
    txt = pdf_text(r.content)
    assert "Tenants who paid" in txt and "Jean Mugisha" in txt and "200,000 RWF" in txt
    assert "Rent months paid" not in txt  # a card that was not chosen
    # Cards only: no table.
    r = client.get("/api/v1/reports/pdf/payments-received", headers=api.h,
                   params={"cards": "total_paid", "sections": ""})
    assert "Jean Mugisha" not in pdf_text(r.content)
    r = client.get("/api/v1/reports/pdf/payments-received", headers=api.h, params={"cards": "", "sections": ""})
    assert r.status_code == 400 and "at least one" in r.json()["detail"]
    for slug in ("overdue", "occupancy"):
        r = client.get(f"/api/v1/reports/pdf/{slug}", headers=api.h, params={"cards": "units_taken"})
        assert r.status_code == 200


def test_every_report_card_has_a_key(api):
    setup(api)
    from datetime import date as _d
    with SessionLocal() as db:
        built = {
            "payments-received": builders.payments_received(statements.payments_received(db, date_from=None, date_to=None),
                                                            date_from=None, date_to=None, property_name=None, currency=None),
            "overdue": builders.overdue_tenants(statements.overdue_tenants(db, _d.today()), today=_d.today(),
                                                property_name=None, currency=None),
            "occupancy": builders.occupancy(statements.occupancy(db), today=_d.today(), property_name=None),
        }
        db.rollback()
    for slug, rep in built.items():
        cards = {o["key"] for o in builders.OPTIONS[slug]["cards"]}
        sections = {o["key"] for o in builders.OPTIONS[slug]["sections"]}
        assert all(k.key in cards for k in rep.kpis + rep.secondary_kpis), slug
        assert all(s.key in sections for s in rep.sections), slug


def test_payment_method_replaces_paid_through(api, client):
    setup(api)
    # A second approved payment by another method: the tenant used both, most-used first.
    with SessionLocal() as db:
        agreement_id = db.execute(text(
            "SELECT a.id FROM rental_agreements a JOIN tenants t ON t.id = a.tenant_id "
            "WHERE t.full_name = 'Jean Mugisha'")).scalar()
    p = api.ok(api.pay(agreement_id, 1000, method="bank_transfer"), 201)
    api.ok(api.approve(p["id"]))

    with SessionLocal() as db:
        received = statements.payments_received(db, date_from=None, date_to=None)
        occ = statements.occupancy(db)
    assert received["rows"][0]["methods"] == ["MTN MoMo", "Bank transfer"]
    units = {r["unit"]: r for r in occ["rows"]}
    assert units["R101"]["method"] == "Bank transfer"  # the latest approved payment
    assert units["A201"]["method"] is None and units["R102"]["method"] is None

    for slug in ("payments-received", "occupancy"):
        txt = pdf_text(client.get(f"/api/v1/reports/pdf/{slug}", headers=api.h).content)
        assert "Payment method" in txt and "Paid through" not in txt, slug
    txt = pdf_text(client.get("/api/v1/reports/pdf/payments-received", headers=api.h).content)
    assert "MTN MoMo, Bank transfer" in " ".join(txt.split())  # the cell may wrap the text


def test_pdf_orientation(api, client):
    setup(api)

    def size(params=None):
        r = client.get("/api/v1/reports/pdf/occupancy", headers=api.h, params=params or {})
        assert r.status_code == 200, r.text
        box = PdfReader(io.BytesIO(r.content)).pages[0].mediabox
        return float(box.width), float(box.height)

    w, h = size()
    assert w > h  # landscape stays the default
    w, h = size({"orientation": "landscape"})
    assert w > h
    for slug in ("payments-received", "overdue", "occupancy"):
        r = client.get(f"/api/v1/reports/pdf/{slug}", headers=api.h, params={"orientation": "portrait"})
        box = PdfReader(io.BytesIO(r.content)).pages[0].mediabox
        assert float(box.width) < float(box.height), slug
    assert client.get("/api/v1/reports/pdf/occupancy", headers=api.h,
                      params={"orientation": "sideways"}).status_code == 422


def test_narrow_columns_never_break_words():
    from reportlab.pdfbase.pdfmetrics import stringWidth

    sec = pdf.Section(title="t", columns=[pdf.Column("Tenant", 4), pdf.Column("Type", 0.5), pdf.Column("Phone", 0.5)],
                      rows=[["A very long tenant name", "<b>Apartment</b>", "+250788000001"]])
    widths = pdf._fit_widths(sec, 300, pdf.COMPACT)
    assert abs(sum(widths) - 300) < 0.01
    size = pdf.COMPACT["td"].fontSize
    for w, word in zip(widths[1:], ("Apartment", "+250788000001"), strict=True):
        assert w >= stringWidth(word, "Helvetica-Bold", size) + 2 * pdf.CELL_PAD
