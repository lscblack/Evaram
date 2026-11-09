"""The full operational workflow, end to end through the HTTP API."""

from datetime import date


def test_complete_rental_workflow(client, api):
    today = date.today()
    period = today.strftime("%Y-%m")
    month_start = today.replace(day=1)

    # 1. Create a property.
    prop = api.property(code="B10", name="Nyarutarama Court", district="Gasabo", sector="Remera")
    # 2. Add a rentable room.
    room = api.unit(prop["id"], code="R1001", rent="150000", publish=False)
    # 3. Publish it.
    api.ok(api.post(f"/units/{room['id']}/publish", {"is_published": True}))
    # 4. It appears publicly.
    listed = client.get("/api/v1/public/listings").json()["items"]
    assert [i["code"] for i in listed] == ["R1001"]
    assert listed[0]["monthly_rent"] == "150000.00" and listed[0]["currency"] == "RWF"
    # 5. Register a tenant.
    tenant = api.tenant(name="Eric Habimana", phone="+250788123456")
    # 6. Create (and activate) a rental agreement.
    ag = api.agreement(tenant["id"], room["id"], start=month_start.isoformat(), end=None, due_day=28,
                       deposit_required="150000")
    assert ag["status"] == "active"
    # 7. The unit disappears from public listings.
    assert client.get("/api/v1/public/listings").json()["items"] == []
    assert client.get("/api/v1/public/listings/R1001").status_code == 404
    # 8. Generate the rent invoice.
    assert api.generate(period)["created"] == 1
    inv = api.ok(api.get("/invoices", params={"agreement_id": ag["id"]}))["items"][0]
    assert inv["balance_due"] == "150000.00"
    # 9. Record a pending payment (partial).
    payment = api.ok(api.pay(ag["id"], 100000, ref="MOMO-778899"), 201)
    assert payment["status"] == "pending"
    dash = api.ok(api.get("/dashboard"))["finance"]
    assert dash["pending_approvals"]["count"] == 1
    assert dash["collected_this_month"] == []  # pending money is not collected money
    # 10. Approve the payment.
    api.ok(api.approve(payment["id"]))
    # 11. The invoice balance changes.
    inv = api.invoice(inv["id"])
    assert inv["amount_paid"] == "100000.00" and inv["balance_due"] == "50000.00"
    assert inv["status"] in ("partially_paid", "overdue")
    # 12. The dashboard reflects the approved payment.
    dash = api.ok(api.get("/dashboard"))["finance"]
    assert dash["collected_this_month"] == [{"currency": "RWF", "amount": "100000.00"}]
    assert dash["outstanding"] == [{"currency": "RWF", "amount": "50000.00"}]
    assert dash["pending_approvals"]["count"] == 0
    # 13. End the tenancy (tenant hands back the keys the same day).
    api.ok(api.post(f"/agreements/{ag['id']}/terminate",
                    {"terminated_on": today.isoformat(), "reason": "End of stay", "tenant_vacated": True}))
    unit = api.ok(api.get(f"/units/{room['id']}"))
    assert unit["status"] == "turnover"
    assert client.get("/api/v1/public/listings").json()["items"] == []  # not yet ready
    # The balance owed survives the end of the tenancy.
    assert api.ok(api.get(f"/tenants/{tenant['id']}"))["outstanding"] == [{"currency": "RWF", "amount": "50000.00"}]
    # 14. Available again only once marked ready.
    api.ok(api.post(f"/units/{room['id']}/status", {"status": "available", "reason": "Inspected and cleaned"}))
    assert [i["code"] for i in client.get("/api/v1/public/listings").json()["items"]] == ["R1001"]
