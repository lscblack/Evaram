from conftest import Api, login, make_user


def _as(client, role, email):
    make_user(email, role)
    return Api(client, login(client, email))


def test_viewer_is_read_only(client, api):
    prop = api.property()
    viewer = _as(client, "Viewer", "viewer@example.com")
    assert viewer.get("/properties").status_code == 200
    assert viewer.post("/properties", {"code": "B02", "name": "X Building", "property_type": "building"}).status_code == 403
    assert viewer.patch(f"/properties/{prop['id']}", {"name": "Hacked"}).status_code == 403
    assert viewer.get("/users").status_code == 403
    assert viewer.get("/audit-logs").status_code == 403
    assert viewer.get("/settings").status_code == 403


def test_property_manager_records_but_cannot_approve_payments(client, api):
    prop = api.property()
    unit = api.unit(prop["id"])
    tenant = api.tenant()
    ag = api.agreement(tenant["id"], unit["id"])
    pm = _as(client, "Property Manager", "pm@example.com")
    r = pm.pay(ag["id"], 1000)
    assert r.status_code == 201, r.text
    assert pm.approve(r.json()["id"]).status_code == 403
    assert pm.post("/invoices/generate", {"period": "2026-02"}).status_code == 403
    assert pm.get("/reports/payments").status_code == 403


def test_accountant_approves_but_cannot_edit_properties(client, api):
    prop = api.property()
    acc = _as(client, "Accountant", "acc@example.com")
    assert acc.patch(f"/properties/{prop['id']}", {"name": "Renamed"}).status_code == 403
    assert acc.get("/reports/invoices").status_code == 200


def test_identification_numbers_are_masked_without_sensitive_permission(client, api):
    t = api.tenant(id_type="national_id", id_number="1199080012345678")
    assert api.ok(api.get(f"/tenants/{t['id']}"))["id_number"] == "1199080012345678"
    viewer = _as(client, "Viewer", "viewer@example.com")
    shown = viewer.ok(viewer.get(f"/tenants/{t['id']}"))
    assert shown["id_number"] == "•••• 5678" and shown["id_number_masked"] is True
    listed = viewer.ok(viewer.get("/tenants"))["items"][0]
    assert "1199080012345678" not in str(listed)


def test_audit_log_never_contains_id_numbers(api):
    t = api.tenant(id_type="passport", id_number="PC1234567")
    api.patch(f"/tenants/{t['id']}", {"id_number": "PC7654321"})
    logs = api.ok(api.get("/audit-logs", params={"page_size": 100}))
    assert "PC1234567" not in str(logs) and "PC7654321" not in str(logs)
