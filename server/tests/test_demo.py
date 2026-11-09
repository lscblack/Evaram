"""Demo data loads through the real services and clears without touching real records."""

from evaramu.core.config import get_settings


def media_files():
    return sorted(p for p in get_settings().MEDIA_ROOT.rglob("*") if p.is_file())


def test_demo_data_load_and_clear_leaves_real_records(api):
    # A real record that must survive.
    prop = api.property(code="REAL1")
    real_unit = api.unit(prop["id"], code="REAL1-R1")
    tenant = api.tenant()
    ag = api.agreement(tenant["id"], real_unit["id"], start="2026-01-01", end=None)
    before_media = media_files()

    assert api.ok(api.get("/system/demo-data"))["loaded"] is False
    loaded = api.ok(api.post("/system/demo-data"), 201)
    assert loaded == {"loaded": True, "properties": 5, "units": 16, "tenants": 5}
    assert api.post("/system/demo-data").status_code == 409  # no double load

    listings = api.ok(api.c.get("/api/v1/public/listings", params={"page_size": 48}))
    codes = {i["code"] for i in listings["items"]}
    assert {"DEMO-KHA-A1", "DEMO-NYV-H", "DEMO-KGR-R1"} <= codes
    assert "DEMO-KHA-A3" not in codes  # occupied
    assert "DEMO-KHA-A5" not in codes  # maintenance

    d = api.ok(api.get("/dashboard"))
    assert d["portfolio"]["occupied_units"] >= 6
    assert d["finance"]["pending_approvals"]["count"] == 3
    assert api.ok(api.get("/invoices", params={"tab": "overdue"}))["total"] >= 1
    assert len(media_files()) > len(before_media)

    cleared = api.ok(api.c.delete("/api/v1/system/demo-data", headers=api.h))
    assert cleared["properties"] == 5 and cleared["units"] == 16 and cleared["tenants"] == 5
    assert cleared["agreements"] == 5 and cleared["payments"] > 10
    assert api.ok(api.get("/system/demo-data"))["loaded"] is False
    assert media_files() == before_media

    # Real data untouched.
    assert api.ok(api.get(f"/agreements/{ag['id']}"))["status"] == "active"
    assert api.ok(api.get("/properties"))["total"] == 1
    assert api.ok(api.get("/tenants"))["total"] == 1

    # Codes were released, so demo data can be loaded again.
    assert api.post("/system/demo-data").status_code == 201


def test_demo_data_requires_settings_permission(client, api):
    from conftest import login, make_user

    make_user("clerk@example.com", "Accountant")
    h = login(client, "clerk@example.com")
    assert client.post("/api/v1/system/demo-data", headers=h).status_code == 403
    assert client.delete("/api/v1/system/demo-data", headers=h).status_code == 403
