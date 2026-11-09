from conftest import png_bytes


def public_codes(client, **params):
    r = client.get("/api/v1/public/listings", params={"page_size": 48, **params})
    assert r.status_code == 200, r.text
    return {i["code"] for i in r.json()["items"]}


def test_create_standalone_house_with_its_unit(api):
    prop = api.property(code="H101", name="House 101", property_type="house", standalone_unit={
        "code": "H101", "name": "House 101", "unit_type": "house", "bedrooms": 3, "bathrooms": 2,
        "monthly_rent": "450000", "currency": "RWF"})
    assert prop["code"] == "H101" and len(prop["units"]) == 1
    assert prop["units"][0]["code"] == "H101" and prop["units"][0]["status"] == "off_market"


def test_codes_are_unique_normalised_and_never_reused(api):
    prop = api.property(code="b01")
    assert prop["code"] == "B01"
    assert api.post("/properties", {"code": "B01", "name": "Other", "property_type": "building"}).status_code == 409
    u = api.unit(prop["id"], code="R101", publish=False, available=False)
    assert api.post("/units", {"property_id": prop["id"], "code": "r101", "name": "Dup", "unit_type": "room",
                               "monthly_rent": "1", "currency": "RWF"}).status_code == 409
    api.ok(api.post(f"/units/{u['id']}/archive"))
    # Archived codes stay reserved forever.
    r = api.post("/units", {"property_id": prop["id"], "code": "R101", "name": "Reuse", "unit_type": "room",
                            "monthly_rent": "1", "currency": "RWF"})
    assert r.status_code == 409 and r.json()["code"] == "code_taken"
    assert api.post("/properties", {"code": "1BAD", "name": "x", "property_type": "house"}).status_code == 422
    assert api.ok(api.get("/codes/suggest", params={"prefix": "R"}))["code"] == "R102"


def test_rent_precision_per_currency(api):
    prop = api.property()
    bad = api.post("/units", {"property_id": prop["id"], "code": "R1", "name": "x", "unit_type": "room",
                              "monthly_rent": "1000.50", "currency": "RWF"})
    assert bad.status_code == 422
    ok = api.post("/units", {"property_id": prop["id"], "code": "A201", "name": "x", "unit_type": "apartment",
                             "monthly_rent": "650.50", "currency": "USD"})
    assert ok.status_code == 201 and ok.json()["monthly_rent"] == "650.50"


def test_only_published_available_units_are_public(client, api):
    prop = api.property()
    api.unit(prop["id"], code="R101")
    api.unit(prop["id"], code="R102", publish=False)
    unit3 = api.unit(prop["id"], code="R103")
    unit4 = api.unit(prop["id"], code="R104")
    api.ok(api.post(f"/units/{unit3['id']}/status", {"status": "maintenance", "reason": "Plumbing"}))
    api.ok(api.post(f"/units/{unit4['id']}/status", {"status": "reserved"}))
    assert public_codes(client) == {"R101"}
    detail = client.get("/api/v1/public/listings/R101").json()
    assert detail["code"] == "R101" and "tenant" not in str(detail).lower()
    assert client.get("/api/v1/public/listings/R102").status_code == 404
    assert client.get("/api/v1/public/listings/R103").status_code == 404


def test_occupied_and_turnover_cannot_be_set_by_hand(api):
    prop = api.property()
    unit = api.unit(prop["id"])
    for status in ("occupied", "turnover"):
        assert api.post(f"/units/{unit['id']}/status", {"status": status}).status_code == 400


def test_whole_apartment_and_its_rooms_block_each_other(client, api):
    prop = api.property()
    apt = api.unit(prop["id"], code="A201", unit_type="apartment", bedrooms=3, rent="600000")
    room = api.unit(prop["id"], code="R201", parent_unit_id=apt["id"], rent="200000")
    assert public_codes(client) == {"A201", "R201"}
    tenant = api.tenant()
    api.agreement(tenant["id"], room["id"])
    # A room is let → the whole apartment disappears too.
    assert public_codes(client) == set()
    apt_now = api.ok(api.get(f"/units/{apt['id']}"))
    assert "R201" in (apt_now["blocked_reason"] or "")
    other = api.tenant(name="Other Tenant", phone="+250788000002")
    r = api.post("/agreements", {"tenant_id": other["id"], "unit_id": apt["id"], "start_date": "2026-01-01",
                                 "activate": True})
    assert r.status_code == 409 and r.json()["code"] == "unit_unavailable"


def test_public_filters(client, api):
    prop = api.property(district="Gasabo")
    prop2 = api.property(code="B02", name="Kicukiro Court", district="Kicukiro", sector="Niboye")
    api.unit(prop["id"], code="R101", rent="150000", bedrooms=1)
    api.unit(prop["id"], code="A201", unit_type="apartment", rent="800", currency="USD", bedrooms=2)
    api.unit(prop2["id"], code="H301", unit_type="house", rent="500000", bedrooms=4)
    assert public_codes(client, location="kicukiro") == {"H301"}
    assert public_codes(client, unit_type="apartment") == {"A201"}
    # Budgets compare across currencies at the test rate (1 USD = 1,400 RWF): $800 = 1,120,000 RWF.
    assert public_codes(client, currency="RWF", min_rent=200000) == {"H301", "A201"}
    assert public_codes(client, currency="RWF", max_rent=200000) == {"R101"}
    assert public_codes(client, currency="USD", max_rent=400) == {"R101", "H301"}
    assert public_codes(client, currency="USD", min_rent=500) == {"A201"}
    by_price = client.get("/api/v1/public/listings", params={"sort": "price_asc"}).json()["items"]
    assert [x["code"] for x in by_price] == ["R101", "H301", "A201"]
    assert public_codes(client, bedrooms=2) == {"A201", "H301"}
    assert client.get("/api/v1/public/listings", params={"min_rent": 1}).status_code == 400
    f = client.get("/api/v1/public/filters").json()
    assert f["locations"] == ["Gasabo", "Kicukiro"] and f["total_available"] == 3
    assert {c["currency"] for c in f["currencies"]} == {"RWF", "USD"}


def test_exchange_rate_live_override_and_last_known(client, api, monkeypatch, db):
    from evaramu.modules.public import fx
    from evaramu.modules.system.models import AppSetting

    if db.get(AppSetting, "currency.usd_rwf_rate") is None:  # wiped by the users TRUNCATE cascade
        db.add(AppSetting(key="currency.usd_rwf_rate", value=0, label="USD to RWF rate", group="currency"))
        db.commit()

    r = client.get("/api/v1/public/exchange-rate").json()
    assert (float(r["rate"]), r["source"], r["is_override"]) == (1400, "test", False)

    # Live lookups failing: the last good rate (saved above) is used.
    fx.reset_cache()
    monkeypatch.setattr(fx, "fetch_remote", lambda: None)
    r = client.get("/api/v1/public/exchange-rate").json()
    assert float(r["rate"]) == 1400 and r["source"] == "test"

    # The landlord's own rate wins.
    api.ok(api.patch("/settings", {"values": {"currency.usd_rwf_rate": 1500}}))
    r = client.get("/api/v1/public/exchange-rate").json()
    assert (float(r["rate"]), r["is_override"]) == (1500, True)


def test_no_exchange_rate_keeps_budgets_within_one_currency(client, api, monkeypatch):
    from evaramu.modules.public import fx

    fx.reset_cache()
    monkeypatch.setattr(fx, "fetch_remote", lambda: None)
    prop = api.property()
    api.unit(prop["id"], code="R101", rent="150000")
    api.unit(prop["id"], code="A201", unit_type="apartment", rent="100", currency="USD")
    assert client.get("/api/v1/public/exchange-rate").json()["rate"] is None
    assert public_codes(client, currency="RWF", max_rent=1000000) == {"R101"}


def test_fx_rejects_insane_rates():
    from evaramu.modules.public import fx

    assert fx._sane("1450.5") is not None
    assert fx._sane("0.0007") is None and fx._sane("abc") is None and fx._sane(None) is None


def test_public_areas_count_available_taken_and_price_range(client, api):
    prop = api.property(district="Gasabo")
    prop2 = api.property(code="B02", name="Kicukiro Court", district="Kicukiro", sector="Niboye")
    api.unit(prop["id"], code="R101", rent="150000", bedrooms=1)
    api.unit(prop["id"], code="R102", rent="90000", bedrooms=1)
    api.unit(prop["id"], code="A201", unit_type="apartment", rent="800", currency="USD", bedrooms=2)
    let = api.unit(prop2["id"], code="H301", unit_type="house", rent="500000", bedrooms=4)
    api.agreement(api.tenant()["id"], let["id"])
    areas = client.get("/api/v1/public/areas").json()
    assert [a["name"] for a in areas] == ["Gasabo", "Kicukiro"]
    gasabo, kicukiro = areas
    assert (gasabo["available"], gasabo["taken"]) == (3, 0)
    assert [(p["currency"], float(p["min"]), float(p["max"])) for p in gasabo["prices"]] == [
        ("RWF", 90000, 150000), ("USD", 800, 800)]
    assert (kicukiro["available"], kicukiro["taken"], kicukiro["prices"]) == (0, 1, [])
    assert "tenant" not in str(areas).lower()


def test_archived_property_hides_units(client, api):
    prop = api.property()
    api.unit(prop["id"])
    api.ok(api.post(f"/properties/{prop['id']}/archive"))
    assert public_codes(client) == set()
    assert api.patch(f"/properties/{prop['id']}", {"name": "New"}).status_code == 409


def test_photo_upload_is_reencoded_and_listed(client, api):
    prop = api.property()
    unit = api.unit(prop["id"])
    files = [("files", ("front.png", png_bytes(), "image/png")), ("files", ("back.png", png_bytes((200, 120, 40)), "image/png"))]
    imgs = api.ok(client.post(f"/api/v1/properties/{prop['id']}/images", files=files, headers=api.h), 201)
    assert len(imgs) == 2 and imgs[0]["url"].endswith(".webp")
    assert client.get(imgs[0]["url"]).status_code == 200
    listing = client.get("/api/v1/public/listings/R101").json()
    assert listing["image_count"] == 2 and listing["cover_url"].endswith("_thumb.webp")
    bad = client.post(f"/api/v1/properties/{prop['id']}/images", headers=api.h,
                      files=[("files", ("evil.png", b"<?php echo 1; ?>", "image/png"))])
    assert bad.status_code == 400
    assert unit["id"]


def test_property_history_records_changes(api):
    prop = api.property()
    api.unit(prop["id"])
    api.patch(f"/properties/{prop['id']}", {"name": "Kimihurura Heights"})
    history = api.ok(api.get(f"/properties/{prop['id']}/history"))
    kinds = {h["kind"] for h in history}
    assert {"property.created", "property.updated", "unit.created", "unit.published"} <= kinds


def _shop(api, prop_id, code="S101", **kw):
    return api.post("/units", {"property_id": prop_id, "code": code, "name": f"Shop {code}", "unit_type": "commercial",
                               "monthly_rent": "120000", "currency": "RWF", **kw})


def test_commercial_property_holds_only_shop_rooms_without_bathrooms(api):
    prop = api.property(code="B10", property_type="building", usage="commercial")
    assert prop["usage"] == "commercial"
    shop = api.ok(_shop(api, prop["id"], bedrooms=2, bathrooms=1, toilet="shared"), 201)
    assert (shop["bedrooms"], shop["bathrooms"], shop["toilet"]) == (0, 0, "shared")
    # Homes are refused in a commercial property, shops in a residential one.
    room = api.post("/units", {"property_id": prop["id"], "code": "R10", "name": "Room", "unit_type": "room",
                               "monthly_rent": "1", "currency": "RWF"})
    assert room.status_code == 400 and "shop rooms" in room.json()["detail"]
    home = api.property(code="B11")
    assert home["usage"] == "residential"
    assert _shop(api, home["id"], code="S102").status_code == 400
    # Toilet can be private per room; editing never gives a shop bathrooms.
    edited = api.ok(api.patch(f"/units/{shop['id']}", {"toilet": "private", "bathrooms": 2}))
    assert (edited["bathrooms"], edited["toilet"]) == (0, "private")
    assert api.post("/units", {"property_id": home["id"], "code": "R11", "name": "x", "unit_type": "room",
                               "toilet": "outside", "monthly_rent": "1", "currency": "RWF"}).status_code == 422


def test_mixed_use_and_changing_a_propertys_use(api):
    prop = api.property(code="B12", usage="mixed")
    api.ok(_shop(api, prop["id"]), 201)
    api.unit(prop["id"], code="A12", unit_type="apartment")
    r = api.patch(f"/properties/{prop['id']}", {"usage": "commercial"})
    assert r.status_code == 400 and "A12" in r.json()["detail"]
    r = api.patch(f"/properties/{prop['id']}", {"usage": "residential"})
    assert r.status_code == 400 and "S101" in r.json()["detail"]
    # Only house or building are property types now.
    assert api.post("/properties", {"code": "C1", "name": "Shops", "property_type": "commercial"}).status_code == 422


def test_public_listing_shows_the_toilet(client, api):
    prop = api.property(code="B13", usage="commercial")
    shop = api.ok(_shop(api, prop["id"], toilet="shared"), 201)
    api.ok(api.post(f"/units/{shop['id']}/status", {"status": "available"}))
    api.ok(api.post(f"/units/{shop['id']}/publish", {"is_published": True}))
    item = client.get("/api/v1/public/listings/S101").json()
    assert item["unit_type"] == "commercial" and item["toilet"] == "shared" and item["bathrooms"] == 0


def test_location_defaults_come_from_settings(api, db):
    from sqlalchemy import text
    for k, v in {"village": "Bisambu", "cell": "Nyarurama", "sector": "Gatenga", "district": "Kicukiro"}.items():
        db.execute(text("INSERT INTO app_settings (key, value, label, \"group\", is_public) VALUES "
                        "(:k, to_jsonb(CAST(:v AS text)), '', 'landlord', false) ON CONFLICT (key) DO UPDATE "
                        "SET value = EXCLUDED.value"), {"k": f"landlord.default_{k}", "v": v})
    db.commit()
    d = api.ok(api.get("/properties/location-defaults"))
    assert d == {"city": "Kigali", "district": "Kicukiro", "sector": "Gatenga", "cell": "Nyarurama", "village": "Bisambu"}


def test_put_on_market_in_one_step_and_take_off(client, api):
    prop = api.property(code="H201", name="House 201", property_type="house", standalone_unit={
        "code": "H201", "name": "House 201", "unit_type": "house", "bedrooms": 4,
        "monthly_rent": "200000", "currency": "RWF"})
    uid = prop["units"][0]["id"]
    assert "H201" not in public_codes(client)
    u = api.ok(api.post(f"/units/{uid}/market", {"on_market": True}))
    assert u["status"] == "available" and u["is_published"] and u["is_publicly_listed"]
    assert "H201" in public_codes(client)
    u = api.ok(api.post(f"/units/{uid}/market", {"on_market": False}))
    assert u["status"] == "off_market" and not u["is_published"] and not u["is_publicly_listed"]
    assert "H201" not in public_codes(client)
    # Maintenance units come back to market as available.
    api.ok(api.post(f"/units/{uid}/status", {"status": "maintenance", "reason": "Paint"}))
    assert api.ok(api.post(f"/units/{uid}/market", {"on_market": True}))["status"] == "available"
