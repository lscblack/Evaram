from datetime import date

from conftest import SessionLocal

from evaramu.jobs import run_daily


def public_codes(client):
    return {i["code"] for i in client.get("/api/v1/public/listings").json()["items"]}


def setup_unit(api, code="R101"):
    prop = api.property()
    return api.unit(prop["id"], code=code)


def test_tenant_registration_and_duplicate_detection(api):
    t = api.tenant(email="jean@example.com", emergency_contact_name="Marie", emergency_contact_phone="+250788999999")
    assert t["full_name"] == "Jean Mugisha" and t["current_tenancies"] == []
    dup = api.post("/tenants", {"full_name": "jean mugisha", "phone": "+250788000001"})
    assert dup.status_code == 409 and dup.json()["code"] == "duplicate_tenant"
    assert api.post("/tenants", {"full_name": "X Y", "phone": "not-a-phone"}).status_code == 422
    found = api.ok(api.get("/tenants", params={"search": "mugisha"}))
    assert found["total"] == 1


def test_activation_marks_unit_occupied_and_removes_it_publicly(client, api):
    unit = setup_unit(api)
    assert public_codes(client) == {"R101"}
    t = api.tenant()
    draft = api.agreement(t["id"], unit["id"], activate=False, deposit_required="150000")
    assert draft["status"] == "draft" and draft["agreement_number"].startswith("AGR-202601-")
    assert public_codes(client) == {"R101"}  # a draft does not occupy the unit
    active = api.ok(api.post(f"/agreements/{draft['id']}/activate"))
    assert active["status"] == "active"
    u = api.ok(api.get(f"/units/{unit['id']}"))
    assert u["status"] == "occupied" and u["occupancy"]["tenant_name"] == "Jean Mugisha"
    assert public_codes(client) == set()


def test_two_active_agreements_on_one_unit_are_impossible(api, db):
    unit = setup_unit(api)
    t1 = api.tenant()
    t2 = api.tenant(name="Aline Uwase", phone="+250788000002")
    api.agreement(t1["id"], unit["id"])
    second = api.agreement(t2["id"], unit["id"], activate=False)
    r = api.post(f"/agreements/{second['id']}/activate")
    assert r.status_code == 409 and r.json()["code"] == "unit_unavailable"
    # Even bypassing the service, the database refuses it.
    from sqlalchemy import text
    from sqlalchemy.exc import IntegrityError
    try:
        db.execute(text("UPDATE rental_agreements SET status='active' WHERE id=:i"), {"i": second["id"]})
        db.commit()
        raise AssertionError("partial unique index did not fire")
    except IntegrityError:
        db.rollback()


def test_end_of_tenancy_requires_move_out_and_ready_check(client, api):
    unit = setup_unit(api)
    t = api.tenant()
    ag = api.agreement(t["id"], unit["id"])
    ended = api.ok(api.post(f"/agreements/{ag['id']}/terminate",
                            {"terminated_on": "2026-06-30", "reason": "Tenant relocating", "tenant_vacated": False}))
    assert ended["status"] == "terminated" and ended["awaiting_move_out"] is True
    assert api.ok(api.get(f"/units/{unit['id']}"))["status"] == "occupied"  # still physically there
    blocked = api.post(f"/units/{unit['id']}/status", {"status": "available"})
    assert blocked.status_code == 409
    api.ok(api.post(f"/agreements/{ag['id']}/move-out", {"move_out_date": "2026-07-02"}))
    assert api.ok(api.get(f"/units/{unit['id']}"))["status"] == "turnover"
    assert public_codes(client) == set()  # not listed until inspected
    assert api.post(f"/units/{unit['id']}/status", {"status": "available"}).status_code == 400  # note required
    api.ok(api.post(f"/units/{unit['id']}/status", {"status": "available", "reason": "Inspected, cleaned, repainted"}))
    assert public_codes(client) == {"R101"}


def test_terminate_with_vacate_goes_straight_to_turnover(api):
    unit = setup_unit(api)
    t = api.tenant()
    ag = api.agreement(t["id"], unit["id"])
    api.ok(api.post(f"/agreements/{ag['id']}/terminate", {"terminated_on": "2026-05-31", "reason": "Mutual",
                                                          "tenant_vacated": True}))
    assert api.ok(api.get(f"/units/{unit['id']}"))["status"] == "turnover"
    assert api.post(f"/agreements/{ag['id']}/terminate", {"terminated_on": "2026-05-31", "reason": "Again"}).status_code == 409


def test_renewal_keeps_unit_occupied(api):
    unit = setup_unit(api)
    t = api.tenant()
    ag = api.agreement(t["id"], unit["id"], end="2026-12-31")
    new = api.ok(api.post(f"/agreements/{ag['id']}/renew", {"end_date": "2027-12-31", "monthly_rent": "160000"}), 201)
    assert new["status"] == "active" and new["start_date"] == "2027-01-01" and new["monthly_rent"] == "160000.00"
    old = api.ok(api.get(f"/agreements/{ag['id']}"))
    assert old["status"] == "expired" and old["renewed_to_id"] == new["id"] and old["awaiting_move_out"] is False
    assert api.ok(api.get(f"/units/{unit['id']}"))["status"] == "occupied"
    assert api.post(f"/agreements/{ag['id']}/renew", {"end_date": "2028-01-01"}).status_code == 409


def test_daily_job_expires_agreements_but_keeps_occupancy(api):
    unit = setup_unit(api)
    t = api.tenant()
    ag = api.agreement(t["id"], unit["id"], start="2025-01-01", end="2025-12-31")
    with SessionLocal() as s:
        result = run_daily(s, today=date(2026, 1, 2))
        s.commit()
    assert result["agreements_expired"] == 1
    assert api.ok(api.get(f"/agreements/{ag['id']}"))["status"] == "expired"
    assert api.ok(api.get(f"/units/{unit['id']}"))["status"] == "occupied"
    notes = api.ok(api.get("/notifications"))["items"]
    assert any(n["kind"] == "agreement_expired" for n in notes)


def test_deposits(api):
    unit = setup_unit(api)
    t = api.tenant()
    ag = api.agreement(t["id"], unit["id"], deposit_required="300000")
    d = api.ok(api.post(f"/agreements/{ag['id']}/deposits", {"kind": "received", "amount": "300000",
                                                             "transaction_date": "2026-01-01", "method": "cash"}), 201)
    assert d["deposit_held"] == "300000.00"
    assert api.post(f"/agreements/{ag['id']}/deposits", {"kind": "refunded", "amount": "400000",
                                                         "transaction_date": "2026-02-01"}).status_code == 409
    d = api.ok(api.post(f"/agreements/{ag['id']}/deposits", {"kind": "deducted", "amount": "50000",
                                                             "transaction_date": "2026-02-01", "notes": "Broken window"}), 201)
    assert d["deposit_held"] == "250000.00"


def test_draft_can_be_cancelled_without_touching_unit(api):
    unit = setup_unit(api)
    t = api.tenant()
    ag = api.agreement(t["id"], unit["id"], activate=False)
    api.ok(api.post(f"/agreements/{ag['id']}/terminate", {"terminated_on": "2026-01-01", "reason": "Changed mind"}))
    assert api.ok(api.get(f"/units/{unit['id']}"))["status"] == "available"
