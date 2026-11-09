"""Paying several months at once, and permanently deleting records."""

import io
from datetime import date

from conftest import login, make_user, png_bytes
from pypdf import PdfReader
from test_billing import MONTH_START, THIS_MONTH, current_invoice, prev_month, rented

from evaramu.modules.billing.service import _next_month


def month_key(offset: int) -> str:
    y, m = MONTH_START.year, MONTH_START.month
    for _ in range(offset):
        y, m = _next_month(y, m)
    return f"{y:04d}-{m:02d}"


def pay_months(api, agreement_id, amount, months, ref="", approve=True):
    data = {"agreement_id": str(agreement_id), "amount": str(amount), "method_code": "mtn_momo",
            "payment_date": date.today().isoformat(), "transaction_reference": ref, "months_covered": str(months)}
    if approve:
        data["auto_approve"] = "true"
    return api.c.post("/api/v1/payments", data=data, headers=api.h)


def rent_invoices(api, ag):
    items = api.ok(api.get("/invoices", params={"agreement_id": ag["id"], "page_size": 50}))["items"]
    return {i["period_start"][:7]: i for i in items}


# ---- months ahead --------------------------------------------------------------------------------

def test_coverage_preview_lists_the_next_unpaid_months(api):
    ag = rented(api, start=MONTH_START.isoformat())
    current_invoice(api, ag)
    cov = api.ok(api.get("/payments/coverage", params={"agreement_id": ag["id"], "months": 3}))
    assert [m["period"] for m in cov["months"]] == [month_key(0), month_key(1), month_key(2)]
    assert cov["total"] == "450000.00" and cov["available"] == 3
    assert cov["months"][0]["invoice_number"] and cov["months"][1]["invoice_number"] is None


def test_payment_for_three_months_creates_and_pays_the_invoices(api):
    ag = rented(api, start=MONTH_START.isoformat())
    current_invoice(api, ag)
    p = api.ok(pay_months(api, ag["id"], 450000, 3, ref="MP3MONTHS"), 201)
    assert p["status"] == "approved" and p["months_covered"] == 3
    assert p["unapplied_amount"] == "0.00" and len(p["allocations"]) == 3
    invs = rent_invoices(api, ag)
    for k in (month_key(0), month_key(1), month_key(2)):
        assert invs[k]["status"] == "paid", k
    assert month_key(3) not in invs
    # Generating a month that was paid ahead does not duplicate it.
    assert api.generate(month_key(1))["created"] == 0
    # The next payment for one month starts after the paid ones.
    cov = api.ok(api.get("/payments/coverage", params={"agreement_id": ag["id"], "months": 1}))
    assert cov["months"][0]["period"] == month_key(3)


def test_months_start_with_what_is_owed_and_pending_months_wait_for_approval(api):
    ag = rented(api)  # started last month
    prev = prev_month(MONTH_START).strftime("%Y-%m")
    api.generate(prev)
    api.generate(THIS_MONTH)
    cov = api.ok(api.get("/payments/coverage", params={"agreement_id": ag["id"], "months": 2}))
    assert [m["period"] for m in cov["months"]] == [prev, THIS_MONTH]
    p = api.ok(pay_months(api, ag["id"], 300000, 2, approve=False), 201)
    assert p["status"] == "pending"
    assert rent_invoices(api, ag)[prev]["status"] != "paid"
    api.ok(api.approve(p["id"]))
    invs = rent_invoices(api, ag)
    assert invs[prev]["status"] == "paid" and invs[THIS_MONTH]["status"] == "paid"


def test_short_payment_pays_oldest_months_first(api):
    ag = rented(api, start=MONTH_START.isoformat())
    p = api.ok(pay_months(api, ag["id"], 200000, 2), 201)
    invs = rent_invoices(api, ag)
    assert invs[month_key(0)]["status"] == "paid"
    assert invs[month_key(1)]["amount_paid"] == "50000.00"
    assert p["unapplied_amount"] == "0.00"


def test_months_cannot_go_past_the_end_of_the_agreement(api):
    prop = api.property()
    unit = api.unit(prop["id"], code="E1")
    t = api.tenant(name="Short Stay", phone="+250788000077")
    y, m = _next_month(MONTH_START.year, MONTH_START.month)
    end = date(y, m, 1).replace(day=28)
    ag = api.agreement(t["id"], unit["id"], start=MONTH_START.isoformat(), end=end.isoformat())
    r = pay_months(api, ag["id"], 450000, 3)
    assert r.status_code == 400 and r.json()["code"] == "months_unavailable"
    both = api.c.post("/api/v1/payments", headers=api.h, data={
        "agreement_id": str(ag["id"]), "amount": "1000", "method_code": "mtn_momo",
        "payment_date": date.today().isoformat(), "months_covered": "2",
        "allocations": '[{"invoice_id": 1, "amount": "1000"}]'})
    assert both.status_code in (400, 404)


# ---- deleting ------------------------------------------------------------------------------------

def test_delete_approved_payment_reopens_its_invoice(api):
    ag = rented(api)
    inv = current_invoice(api, ag)
    p = api.ok(api.pay(ag["id"], 150000, ref="DEL-1"), 201)
    api.ok(api.approve(p["id"]))
    assert api.invoice(inv["id"])["status"] == "paid"
    pre = api.ok(api.get(f"/records/payment/{p['id']}/delete-preview"))
    assert pre["removes"] == {"payments": 1} and pre["invoices_reopened"] == 1
    assert pre["approved_money_removed"] == [{"currency": "RWF", "amount": "150000.00"}]
    api.ok(api.c.delete(f"/api/v1/records/payment/{p['id']}", headers=api.h))
    assert api.get(f"/payments/{p['id']}").status_code == 404
    after = api.invoice(inv["id"])
    assert after["amount_paid"] == "0.00" and after["status"] != "paid"
    logs = api.ok(api.get("/audit-logs", params={"entity_type": "payment"}))["items"]
    assert any(e["action"] == "payment.deleted" for e in logs)


def test_delete_invoice_turns_its_payment_into_credit(api):
    ag = rented(api)
    inv = current_invoice(api, ag)
    p = api.ok(api.pay(ag["id"], 150000, ref="DEL-2"), 201)
    api.ok(api.approve(p["id"]))
    pre = api.ok(api.get(f"/records/invoice/{inv['id']}/delete-preview"))
    assert pre["payments_to_credit"] == 1
    api.ok(api.c.delete(f"/api/v1/records/invoice/{inv['id']}", headers=api.h))
    assert api.get(f"/invoices/{inv['id']}").status_code == 404
    pay = api.ok(api.get(f"/payments/{p['id']}"))
    assert pay["status"] == "approved" and pay["unapplied_amount"] == "150000.00"


def test_delete_tenant_removes_their_agreements_and_frees_the_unit(api):
    ag = rented(api)
    inv = current_invoice(api, ag)
    p = api.ok(api.pay(ag["id"], 150000, ref="DEL-3",
                      files={"evidence": ("r.png", png_bytes(), "image/png")}), 201)
    api.ok(api.approve(p["id"]))
    pre = api.ok(api.get(f"/records/tenant/{ag['tenant_id']}/delete-preview"))
    assert pre["removes"]["agreements"] == 1 and pre["removes"]["payments"] == 1 and pre["removes"]["tenants"] == 1
    assert any("available again" in w for w in pre["warnings"])
    api.ok(api.c.delete(f"/api/v1/records/tenant/{ag['tenant_id']}", headers=api.h))
    assert api.get(f"/tenants/{ag['tenant_id']}").status_code == 404
    assert api.get(f"/agreements/{ag['id']}").status_code == 404
    assert api.get(f"/invoices/{inv['id']}").status_code == 404
    assert api.ok(api.get(f"/units/{ag['unit_id']}"))["status"] == "available"


def test_delete_property_removes_units_but_keeps_tenants(api):
    ag = rented(api)
    current_invoice(api, ag)
    unit = api.ok(api.get(f"/units/{ag['unit_id']}"))
    pid = unit["property"]["id"]
    pre = api.ok(api.get(f"/records/property/{pid}/delete-preview"))
    assert pre["removes"]["units"] == 1 and pre["removes"]["agreements"] == 1 and "tenants" not in pre["removes"]
    api.ok(api.c.delete(f"/api/v1/records/property/{pid}", headers=api.h))
    assert api.get(f"/properties/{pid}").status_code == 404
    assert api.ok(api.get(f"/tenants/{ag['tenant_id']}"))["full_name"] == "Jean Mugisha"
    # The unit code can be used again.
    prop = api.property(code="B02")
    assert api.unit(prop["id"], code=unit["code"])["code"] == unit["code"]


def test_only_holders_of_records_delete_can_delete(api, client):
    ag = rented(api)
    make_user("acc@example.com", "Accountant")
    h = login(client, "acc@example.com")
    assert client.get(f"/api/v1/records/agreement/{ag['id']}/delete-preview", headers=h).status_code == 403
    assert client.delete(f"/api/v1/records/agreement/{ag['id']}", headers=h).status_code == 403
    assert client.delete(f"/api/v1/records/agreement/{ag['id']}").status_code == 401
    assert api.c.delete("/api/v1/records/agreement/999999", headers=api.h).status_code == 404
    assert api.c.delete("/api/v1/records/user/1", headers=api.h).status_code == 422


# ---- one invoice for several months --------------------------------------------------------------

def test_three_month_payment_has_one_invoice_pdf_listing_every_month(api, client):
    ag = rented(api, start=MONTH_START.isoformat())
    p = api.ok(pay_months(api, ag["id"], 450000, 3, ref="MP3PDF"), 201)
    r = client.get(f"/api/v1/payments/{p['id']}/invoice-pdf", headers=api.h)
    assert r.status_code == 200 and r.content.startswith(b"%PDF")
    assert f'invoice-{p["payment_number"]}.pdf' in r.headers["content-disposition"]
    text = "".join(pg.extract_text() for pg in PdfReader(io.BytesIO(r.content)).pages)
    invs = rent_invoices(api, ag)
    for k in (month_key(0), month_key(1), month_key(2)):
        assert invs[k]["invoice_number"] in text
    assert "3 months" in text and "450,000" in text

    share = api.ok(api.post(f"/payments/{p['id']}/share"))
    assert share["whatsapp_number"] == "250788000001" and p["payment_number"] in share["message"]
    public = client.get(share["path"])
    assert public.status_code == 200 and public.content.startswith(b"%PDF")
    assert client.get(share["path"][:-3] + "abc").status_code == 404
    # An invoice token does not open a payment invoice and vice versa.
    assert client.get(share["path"].replace("payment-invoice-pdf", "invoice-pdf")).status_code == 404


def test_pending_payment_has_no_combined_invoice_yet(api):
    ag = rented(api, start=MONTH_START.isoformat())
    p = api.ok(pay_months(api, ag["id"], 300000, 2, approve=False), 201)
    r = api.get(f"/payments/{p['id']}/invoice-pdf")
    assert r.status_code == 409 and r.json()["code"] == "no_payment_invoice"


# ---- editing payments ----------------------------------------------------------------------------

def test_edit_approved_payment_amount_reapplies_it(api):
    ag = rented(api)
    inv = current_invoice(api, ag)
    p = api.ok(api.pay(ag["id"], 100000, ref="ED-1"), 201)
    api.ok(api.approve(p["id"]))
    assert api.invoice(inv["id"])["amount_paid"] == "100000.00"
    e = api.ok(api.patch(f"/payments/{p['id']}", {"amount": "150000", "transaction_reference": "ED-1B",
                                                  "notes": "Typo in amount"}))
    assert e["amount"] == "150000.00" and e["transaction_reference"] == "ED-1B" and e["status"] == "approved"
    after = api.invoice(inv["id"])
    assert after["amount_paid"] == "150000.00" and after["status"] == "paid"
    # Lowering it again re-opens the invoice by the difference.
    api.ok(api.patch(f"/payments/{p['id']}", {"amount": "50000"}))
    assert api.invoice(inv["id"])["amount_paid"] == "50000.00"
    logs = api.ok(api.get("/audit-logs", params={"entity_type": "payment"}))["items"]
    assert any(x["action"] == "payment.edited" and "150000" in x["summary"] for x in logs)


def test_edit_payment_to_cover_more_months(api):
    ag = rented(api, start=MONTH_START.isoformat())
    p = api.ok(pay_months(api, ag["id"], 150000, 1), 201)
    e = api.ok(api.patch(f"/payments/{p['id']}", {"amount": "450000", "months_covered": 3}))
    assert e["months_covered"] == 3 and e["unapplied_amount"] == "0.00"
    invs = rent_invoices(api, ag)
    assert all(invs[month_key(i)]["status"] == "paid" for i in range(3))


def test_edit_rules(api, client):
    ag = rented(api)
    current_invoice(api, ag)
    a = api.ok(api.pay(ag["id"], 1000, ref="ED-A"), 201)
    b = api.ok(api.pay(ag["id"], 2000, ref="ED-B"), 201)
    r = api.patch(f"/payments/{b['id']}", {"transaction_reference": "ed-a"})
    assert r.status_code == 409 and r.json()["code"] == "duplicate_reference"
    assert api.patch(f"/payments/{b['id']}", {"payment_date": "2999-01-01"}).status_code == 400
    api.ok(api.post(f"/payments/{a['id']}/reject", {"reason": "Not received"}))
    assert api.patch(f"/payments/{a['id']}", {"notes": "x"}).status_code == 409
    # A recorder may fix a pending payment, but not an approved one.
    make_user("pm@example.com", "Property Manager")
    h = login(client, "pm@example.com")
    assert client.patch(f"/api/v1/payments/{b['id']}", json={"notes": "fixed"}, headers=h).status_code == 200
    api.ok(api.approve(b["id"]))
    assert client.patch(f"/api/v1/payments/{b['id']}", json={"notes": "again"}, headers=h).status_code == 403
