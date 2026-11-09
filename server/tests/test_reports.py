from datetime import date

from test_billing import MONTH_START, THIS_MONTH, prev_month

TODAY = date.today()


def setup_two_currencies(api):
    prop = api.property()
    rwf_unit = api.unit(prop["id"], code="R101", rent="150000", currency="RWF")
    usd_unit = api.unit(prop["id"], code="A201", unit_type="apartment", rent="800", currency="USD")
    t1 = api.tenant()
    t2 = api.tenant(name="Grace Ingabire", phone="+250788000002")
    start = prev_month(MONTH_START).isoformat()
    a1 = api.agreement(t1["id"], rwf_unit["id"], start=start, end=None, due_day=28)
    a2 = api.agreement(t2["id"], usd_unit["id"], start=start, end=None, due_day=28)
    api.generate(THIS_MONTH)
    p1 = api.ok(api.pay(a1["id"], 100000), 201)
    p2 = api.ok(api.pay(a2["id"], 800, method="bank_transfer"), 201)
    api.ok(api.approve(p1["id"]))
    api.ok(api.approve(p2["id"]))
    pending = api.ok(api.pay(a1["id"], 20000, method="cash"), 201)
    return a1, a2, pending


def amounts(rows):
    return {r["currency"]: r["amount"] for r in rows}


def test_dashboard_keeps_currencies_separate(api):
    setup_two_currencies(api)
    d = api.ok(api.get("/dashboard"))
    p = d["portfolio"]
    assert p["units"] == 2 and p["occupied_units"] == 2 and p["occupancy_rate"] == 100.0 and p["active_tenants"] == 2
    f = d["finance"]
    assert amounts(f["expected_monthly_rent"]) == {"RWF": "150000.00", "USD": "800.00"}
    assert amounts(f["collected_this_month"]) == {"RWF": "100000.00", "USD": "800.00"}
    assert amounts(f["outstanding"]) == {"RWF": "50000.00"}
    assert f["pending_approvals"]["count"] == 1 and amounts(f["pending_approvals"]["amounts"]) == {"RWF": "20000.00"}
    month = next(m for m in d["revenue_series"] if m["month"] == THIS_MONTH)
    assert month["collected"] == {"RWF": "100000.00", "USD": "800.00"}
    assert len(d["pending_payments"]) == 1 and d["recent_activity"]


def test_payment_report_filters(api):
    a1, _, _ = setup_two_currencies(api)
    r = api.ok(api.get("/reports/payments", params={"currency": "USD"}))
    assert {(t["currency"], t["status"]) for t in r["totals"]} == {("USD", "approved")}
    r = api.ok(api.get("/reports/payments", params={"method_code": "cash"}))
    assert r["totals"] == [{"currency": "RWF", "status": "pending", "amount": "20000.00", "count": 1}]
    r = api.ok(api.get("/reports/payments", params={"tenant_id": a1["tenant_id"], "status": "approved"}))
    assert r["totals"][0]["amount"] == "100000.00"
    r = api.ok(api.get("/reports/payments", params={"date_from": "2020-01-01", "date_to": "2020-12-31"}))
    assert r["totals"] == []
    assert api.get("/reports/payments", params={"date_from": "2026-02-01", "date_to": "2026-01-01"}).status_code == 400


def test_invoice_report_and_outstanding_ageing(api):
    setup_two_currencies(api)
    r = api.ok(api.get("/reports/invoices"))
    by = {c["currency"]: c for c in r["by_currency"]}
    assert by["RWF"]["outstanding"] == "50000.00" and by["USD"]["outstanding"] == "0.00"
    assert by["USD"]["collection_rate"] == 100.0
    rows = api.ok(api.get("/reports/outstanding"))
    assert len(rows) == 1 and rows[0]["currency"] == "RWF" and rows[0]["total"] == "50000.00"
    csv = api.get("/reports/outstanding.csv")
    assert csv.status_code == 200 and "Jean Mugisha" in csv.text
    pcsv = api.get("/reports/payments.csv", params={"currency": "RWF"})
    assert pcsv.status_code == 200 and "USD" not in pcsv.text.split("\n", 1)[1]
