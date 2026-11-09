from datetime import date, datetime, timedelta
from decimal import Decimal

from conftest import SessionLocal
from sqlalchemy import text
from test_billing import MONTH_START, THIS_MONTH, prev_month

from evaramu.modules.reports import builders, pdf, statements

TODAY = date.today()
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
    assert row["paid_through"] is not None and row["paid_through"] < MONTH_START  # last month fully paid
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
