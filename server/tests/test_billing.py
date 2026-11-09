from datetime import date, timedelta

from conftest import SessionLocal

from evaramu.jobs import run_daily

TODAY = date.today()
THIS_MONTH = TODAY.strftime("%Y-%m")
MONTH_START = TODAY.replace(day=1)
OPEN_STATUS = "partially_paid" if TODAY.day <= 28 else "overdue"


def prev_month(d: date) -> date:
    return (d.replace(day=1) - timedelta(days=1)).replace(day=1)


def rented(api, rent="150000", currency="RWF", code="R101", start=None, tenant_phone="+250788000001", name="Jean Mugisha"):
    prop = api.ok(api.get("/properties"))["items"]
    prop = prop[0] if prop else api.property()
    unit = api.unit(prop["id"], code=code, rent=rent, currency=currency)
    t = api.tenant(name=name, phone=tenant_phone)
    start = start or prev_month(MONTH_START).isoformat()
    return api.agreement(t["id"], unit["id"], start=start, end=None, due_day=28)


def current_invoice(api, ag):
    api.generate(THIS_MONTH)
    items = api.ok(api.get("/invoices", params={"agreement_id": ag["id"]}))["items"]
    return next(i for i in items if i["period_start"] == MONTH_START.isoformat())


def test_invoice_generation_is_idempotent_and_complete(api):
    ag = rented(api)
    first = api.generate(THIS_MONTH)
    assert first["created"] == 1
    assert api.generate(THIS_MONTH)["created"] == 0
    inv = api.ok(api.get("/invoices"))["items"][0]
    assert inv["invoice_number"].startswith(f"INV-{MONTH_START:%Y%m}-")
    assert inv["amount_charged"] == "150000.00" and inv["currency"] == "RWF"
    assert inv["tenant_name"] == "Jean Mugisha" and inv["unit_code"] == "R101"
    assert inv["location"] and inv["due_date"] == MONTH_START.replace(day=28).isoformat()
    assert inv["agreement_id"] == ag["id"]


def test_first_month_is_prorated(api):
    rented(api, rent="300000", start="2026-04-16")
    result = api.generate("2026-04")
    assert result["created"] == 1
    inv = api.ok(api.get("/invoices"))["items"][0]
    assert inv["amount_charged"] == "150000.00"  # 15 of 30 days
    assert inv["period_start"] == "2026-04-16" and inv["due_date"] == "2026-04-28"


def test_previous_balance_is_shown_but_not_double_counted(api):
    ag = rented(api)
    api.generate(prev_month(MONTH_START).strftime("%Y-%m"))
    inv = current_invoice(api, ag)
    assert inv["previous_balance"] == "150000.00"
    assert inv["total_due"] == "300000.00" and inv["balance_due"] == "150000.00"
    tenant = api.ok(api.get(f"/tenants/{ag['tenant_id']}"))
    assert tenant["outstanding"] == [{"currency": "RWF", "amount": "300000.00"}]


def test_partial_payment_flow_requires_approval(api):
    ag = rented(api)
    inv = current_invoice(api, ag)
    p = api.ok(api.pay(ag["id"], 100000, ref="MP2611AAA1", allocations=[{"invoice_id": inv["id"], "amount": "100000"}]), 201)
    assert p["status"] == "pending"
    after_record = api.invoice(inv["id"])
    assert after_record["amount_paid"] == "0.00" and after_record["status"] == "unpaid"
    assert after_record["pending_amount"] == "100000.00"
    approved = api.ok(api.approve(p["id"]))
    assert approved["status"] == "approved" and approved["reviewed_by"] == "Alice Admin" and approved["reviewed_at"]
    inv2 = api.invoice(inv["id"])
    assert inv2["amount_paid"] == "100000.00" and inv2["balance_due"] == "50000.00" and inv2["status"] == OPEN_STATUS
    p2 = api.ok(api.pay(ag["id"], 50000, ref="MP2611AAA2"), 201)
    api.ok(api.approve(p2["id"]))
    inv3 = api.invoice(inv["id"])
    assert inv3["status"] == "paid" and inv3["balance_due"] == "0.00"
    logs = api.ok(api.get("/audit-logs", params={"entity_type": "payment"}))["items"]
    assert {"payment.recorded", "payment.approved"} <= {log["action"] for log in logs}


def test_rejection_requires_reason_and_changes_nothing(api):
    ag = rented(api)
    inv = current_invoice(api, ag)
    p = api.ok(api.pay(ag["id"], 150000), 201)
    assert api.post(f"/payments/{p['id']}/reject", {"reason": ""}).status_code == 422
    rejected = api.ok(api.post(f"/payments/{p['id']}/reject", {"reason": "No matching MoMo transaction"}))
    assert rejected["status"] == "rejected" and rejected["rejection_reason"]
    assert api.invoice(inv["id"])["amount_paid"] == "0.00"
    assert api.approve(p["id"]).status_code == 409  # cannot approve after rejection


def test_payment_cannot_be_approved_twice(api):
    ag = rented(api)
    current_invoice(api, ag)
    p = api.ok(api.pay(ag["id"], 150000), 201)
    api.ok(api.approve(p["id"]))
    r = api.approve(p["id"])
    assert r.status_code == 409 and r.json()["code"] == "not_pending"


def test_duplicate_reference_is_blocked(api):
    ag = rented(api)
    api.ok(api.pay(ag["id"], 1000, ref="TX-REF-1"), 201)
    r = api.pay(ag["id"], 1000, ref="tx-ref-1")
    assert r.status_code == 409 and r.json()["code"] == "duplicate_reference"
    # A different provider may reuse a reference.
    assert api.pay(ag["id"], 1000, ref="TX-REF-1", method="bank_transfer").status_code == 201


def test_lookalike_payment_needs_explicit_confirmation(api):
    ag = rented(api)
    current_invoice(api, ag)
    a = api.ok(api.pay(ag["id"], 50000, method="cash"), 201)
    b = api.ok(api.pay(ag["id"], 50000, method="cash"), 201)
    api.ok(api.approve(a["id"]))
    pending = api.ok(api.get("/payments", params={"status": "pending"}))["items"][0]
    assert pending["possible_duplicate_of"] == [a["payment_number"]]
    r = api.approve(b["id"])
    assert r.status_code == 409 and r.json()["code"] == "possible_duplicate"
    assert api.approve(b["id"], confirm_duplicate=True).status_code == 200


def test_reversal_restores_balance_and_keeps_record(api):
    ag = rented(api)
    inv = current_invoice(api, ag)
    p = api.ok(api.pay(ag["id"], 150000), 201)
    api.ok(api.approve(p["id"]))
    assert api.invoice(inv["id"])["status"] == "paid"
    assert api.post(f"/payments/{p['id']}/reverse", {"reason": ""}).status_code == 422
    rev = api.ok(api.post(f"/payments/{p['id']}/reverse", {"reason": "Bank reversed the transfer"}))
    assert rev["status"] == "reversed" and rev["reversed_by"] == "Alice Admin"
    assert api.invoice(inv["id"])["amount_paid"] == "0.00"
    assert api.ok(api.get(f"/payments/{p['id']}"))["allocations"]  # history kept


def test_overpayment_becomes_credit_and_can_be_applied(api):
    ag = rented(api)
    api.generate(prev_month(MONTH_START).strftime("%Y-%m"))
    p = api.ok(api.pay(ag["id"], 200000), 201)
    approved = api.ok(api.approve(p["id"]))
    assert approved["allocated_amount"] == "150000.00" and approved["unapplied_amount"] == "50000.00"
    tenant = api.ok(api.get(f"/tenants/{ag['tenant_id']}"))
    assert tenant["credit"] == [{"currency": "RWF", "amount": "50000.00"}]
    inv = current_invoice(api, ag)
    applied = api.ok(api.post(f"/payments/{p['id']}/apply-credit"))
    assert applied["unapplied_amount"] == "0.00"
    assert api.invoice(inv["id"])["amount_paid"] == "50000.00"


def test_currency_is_enforced_per_agreement(api):
    ag = rented(api, rent="900", currency="USD", code="A201")
    r = api.c.post("/api/v1/payments", headers=api.h, data={
        "agreement_id": str(ag["id"]), "amount": "900", "currency": "RWF", "method_code": "bank_transfer",
        "payment_date": TODAY.isoformat()})
    assert r.status_code == 400
    assert api.pay(ag["id"], "900.555").status_code in (400, 422)
    assert api.pay(ag["id"], "900.50").status_code == 201


def test_future_dated_payment_rejected(api):
    ag = rented(api)
    assert api.pay(ag["id"], 1000, when=TODAY + timedelta(days=2)).status_code == 400


def test_adjustments_and_void_rules(api):
    ag = rented(api)
    inv = current_invoice(api, ag)
    credited = api.ok(api.post(f"/invoices/{inv['id']}/adjustments",
                               {"kind": "credit", "amount": "20000", "reason": "Water outage discount"}), 201)
    assert credited["balance_due"] == "130000.00" and credited["amount_credited"] == "20000.00"
    debited = api.ok(api.post(f"/invoices/{inv['id']}/adjustments",
                              {"kind": "debit", "amount": "5000", "reason": "Key replacement"}), 201)
    assert debited["amount_charged"] == "155000.00" and debited["balance_due"] == "135000.00"
    assert api.post(f"/invoices/{inv['id']}/adjustments",
                    {"kind": "credit", "amount": "999999", "reason": "too much"}).status_code == 409
    assert api.post(f"/invoices/{inv['id']}/void", {"reason": "duplicate"}).status_code == 409  # has credits
    manual = api.ok(api.post("/invoices", {"agreement_id": ag["id"], "issue_date": TODAY.isoformat(),
                                           "due_date": TODAY.isoformat(),
                                           "items": [{"description": "Garbage collection", "amount": "3000"}]}), 201)
    pending = api.ok(api.pay(ag["id"], 3000, allocations=[{"invoice_id": manual["id"], "amount": "3000"}]), 201)
    assert api.post(f"/invoices/{manual['id']}/void", {"reason": "Raised by mistake"}).status_code == 409
    api.ok(api.post(f"/payments/{pending['id']}/reject", {"reason": "Wrong tenant"}))
    voided = api.ok(api.post(f"/invoices/{manual['id']}/void", {"reason": "Raised by mistake"}))
    assert voided["status"] == "void" and voided["balance_due"] == "0.00"


def test_overdue_status_and_notifications(api):
    ag = rented(api, start="2026-01-01")
    api.generate("2026-02")
    with SessionLocal() as s:
        out = run_daily(s, today=date(2026, 3, 10))
        s.commit()
    assert out["overdue_notifications"] >= 1
    inv = api.ok(api.get("/invoices", params={"status": "overdue"}))["items"]
    assert inv and inv[0]["agreement_id"] == ag["id"]
    notes = api.ok(api.get("/notifications"))["items"]
    assert any(n["kind"] == "invoice_overdue" for n in notes)


def test_evidence_upload_is_private(client, api):
    from conftest import png_bytes
    ag = rented(api)
    r = api.pay(ag["id"], 5000, files={"evidence": ("momo.png", png_bytes(), "image/png")})
    p = api.ok(r, 201)
    assert p["has_evidence"] is True
    assert client.get(f"/api/v1/payments/{p['id']}/evidence").status_code == 401
    assert client.get(f"/api/v1/payments/{p['id']}/evidence", headers=api.h).status_code == 200
    bad = api.pay(ag["id"], 5000, files={"evidence": ("x.exe", b"MZ\x90\x00binary", "application/octet-stream")})
    assert bad.status_code == 400


def test_recording_with_auto_approve_applies_the_payment_at_once(api, db):
    from sqlalchemy import text
    tenant = api.tenant()
    unit = api.unit(api.property()["id"])
    ag = api.agreement(tenant["id"], unit["id"], start="2026-11-01", end="2027-10-31")
    api.generate("2026-11")  # the month's rent invoice
    r = api.c.post("/api/v1/payments", headers=api.h, data={
        "agreement_id": str(ag["id"]), "amount": "150000", "method_code": "cash",
        "payment_date": "2026-11-03", "auto_approve": "true"})
    p = api.ok(r, 201)
    assert p["status"] == "approved" and float(p["allocated_amount"]) == 150000
    assert db.execute(text("SELECT count(*) FROM notifications WHERE kind = 'payment_pending'")).scalar() == 0

    # The same tenant, amount, date and method again: never approved silently.
    p2 = api.ok(api.c.post("/api/v1/payments", headers=api.h, data={
        "agreement_id": str(ag["id"]), "amount": "150000", "method_code": "cash",
        "payment_date": "2026-11-03", "auto_approve": "true"}), 201)
    assert p2["status"] == "pending" and p2["possible_duplicate_of"] == [p["payment_number"]]
    assert db.execute(text("SELECT count(*) FROM notifications WHERE kind = 'payment_pending'")).scalar() >= 1


def test_auto_approve_needs_the_approval_permission(api, client):
    from conftest import login, make_user
    tenant = api.tenant()
    unit = api.unit(api.property()["id"])
    ag = api.agreement(tenant["id"], unit["id"], start="2026-11-01", end="2027-10-31")
    make_user("manager@example.com", "Property Manager")  # may record, may not approve
    h = login(client, "manager@example.com")
    data = {"agreement_id": str(ag["id"]), "amount": "1000", "method_code": "cash", "payment_date": "2026-11-03"}
    assert client.post("/api/v1/payments", headers=h, data={**data, "auto_approve": "true"}).status_code == 403
    r = client.post("/api/v1/payments", headers=h, data=data)
    assert r.status_code == 201 and r.json()["status"] == "pending"
