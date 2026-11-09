"""Agreement documents: template rendering, editing, digital signing, tamper detection."""

import base64
import io

from PIL import Image, ImageDraw

from evaramu.core.database import session_scope


def signature_png(width=400, height=150) -> str:
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    ImageDraw.Draw(img).line([(20, 100), (120, 40), (220, 110), (360, 30)], fill=(10, 20, 60, 255), width=4)
    buf = io.BytesIO()
    img.save(buf, "PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def setup_agreement(api, currency="RWF", rent="150000"):
    prop = api.property(cell="Nyarurama", village="Bisambu", sector="Gatenga", district="Kicukiro")
    unit = api.unit(prop["id"], code="S01", rent=rent, currency=currency)
    tenant = api.tenant(id_type="national_id", id_number="1199080012345678")
    return api.agreement(tenant["id"], unit["id"], start="2026-11-01", end="2027-10-31")


def fill_manual(api, doc_id):
    return api.ok(api.patch(f"/agreement-documents/{doc_id}", {"fields": {
        "monthly_rent_words": "ibihumbi ijana na mirongo itanu", "prepaid_months": "3",
        "prepaid_amount": "450,000", "prepaid_amount_words": "ibihumbi magana ane na mirongo itanu",
        "prepaid_from": "01/11/2026", "prepaid_to": "31/01/2027",
        "landlord_name": "LOUE SAUVEUR CHRISTIAN", "landlord_phone": "0735782632", "bank_name": "EQUITY BANK",
        "bank_account_number": "4012100905911", "bank_account_name": "LOUE SAUVEUR CHRISTIAN",
    }}))


def test_default_template_is_seeded_with_placeholders(api):
    templates = api.ok(api.get("/agreement-templates"))
    assert len(templates) == 1 and templates[0]["is_default"]
    assert "{{tenant_name}}" in templates[0]["body"] and "Ingingo ya 8" in templates[0]["body"]
    keys = {p["key"] for p in api.ok(api.get("/agreement-templates/placeholders"))}
    assert {"tenant_name", "monthly_rent", "unit_code", "village"} <= keys


def test_document_prefills_frw_amounts_and_escapes_html(api):
    ag = setup_agreement(api)
    doc = api.ok(api.post(f"/agreements/{ag['id']}/documents", {}), 201)
    f = doc["fields"]
    assert f["monthly_rent"] == "150,000" and f["unit_code"] == "S01" and f["village"] == "Bisambu"
    assert f["tenant_id_number"] == "1199080012345678" and f["start_date"] == "01/11/2026"
    assert "150,000" in doc["html"] and "Frw" in doc["html"]
    assert "monthly_rent_words" in doc["missing"]

    # Markup is escaped: no script can be injected through fields or body.
    doc = api.ok(api.patch(f"/agreement-documents/{doc['id']}", {
        "fields": {"tenant_name": "<script>alert(1)</script>"},
        "body": doc["body"] + "\n\n<img src=x onerror=alert(1)> **bold**",
    }))
    assert "<script>" not in doc["html"] and "<img" not in doc["html"]
    assert "&lt;script&gt;" in doc["html"] and "<strong>bold</strong>" in doc["html"]


def test_usd_agreement_requires_frw_amount_to_be_typed(api):
    ag = setup_agreement(api, currency="USD", rent="900")
    doc = api.ok(api.post(f"/agreements/{ag['id']}/documents", {}), 201)
    assert doc["fields"]["monthly_rent"] == "" and "monthly_rent" in doc["missing"]


def test_signing_freezes_document_and_detects_tampering(api):
    ag = setup_agreement(api)
    doc = api.ok(api.post(f"/agreements/{ag['id']}/documents", {}), 201)

    # Blanks must be filled before anyone signs.
    r = api.post(f"/agreement-documents/{doc['id']}/sign",
                 {"party": "tenant", "name": "Jean Mugisha", "signature": signature_png()})
    assert r.status_code == 400 and r.json()["code"] == "document_incomplete"
    fill_manual(api, doc["id"])

    # Empty / invalid signatures are refused.
    blank = Image.new("RGBA", (300, 100), (0, 0, 0, 0))
    buf = io.BytesIO()
    blank.save(buf, "PNG")
    r = api.post(f"/agreement-documents/{doc['id']}/sign", {
        "party": "tenant", "name": "Jean Mugisha",
        "signature": "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()})
    assert r.status_code == 400 and r.json()["code"] == "bad_signature", r.json()
    r = api.post(f"/agreement-documents/{doc['id']}/sign",
                 {"party": "tenant", "name": "Jean Mugisha", "signature": "data:image/png;base64,AAAA"})
    assert r.status_code == 400

    d1 = api.ok(api.post(f"/agreement-documents/{doc['id']}/sign",
                         {"party": "tenant", "name": "Jean Mugisha", "signature": signature_png()}))
    assert d1["status"] == "signing" and d1["content_hash"] and d1["verification_code"]
    assert d1["tenant_signature"]["image"].startswith("data:image/png;base64,")

    # Frozen: no edits, no double signing.
    assert api.patch(f"/agreement-documents/{doc['id']}", {"title": "Changed"}).status_code == 409
    assert api.post(f"/agreement-documents/{doc['id']}/sign",
                    {"party": "tenant", "name": "X Y", "signature": signature_png()}).status_code == 409

    d2 = api.ok(api.post(f"/agreement-documents/{doc['id']}/sign",
                         {"party": "landlord", "name": "Loue Sauveur", "signature": signature_png()}))
    assert d2["status"] == "signed" and d2["html"] == d1["html"]
    assert d2["verification"] == {"frozen": True, "content_intact": True, "tenant_signature_valid": True,
                                  "landlord_signature_valid": True}

    # Public verification needs number + code and reveals no names.
    ok = api.c.get("/api/v1/public/documents/verify",
                   params={"number": d2["document_number"], "code": d2["verification_code"]}).json()
    assert ok["found"] and ok["valid"] and "tenant_name" not in ok
    bad = api.c.get("/api/v1/public/documents/verify",
                    params={"number": d2["document_number"], "code": "0000000000000000"}).json()
    assert bad == {"found": False, "valid": False, "document_number": None, "status": None, "unit_code": None,
                   "tenant_signed_at": None, "landlord_signed_at": None}

    # Someone edits the stored contract directly in the database → detected.
    from evaramu.modules.agreements.models import AgreementDocument
    with session_scope() as db:
        row = db.get(AgreementDocument, doc["id"])
        row.rendered_html = row.rendered_html.replace("150,000", "50,000")
    d3 = api.ok(api.get(f"/agreement-documents/{doc['id']}"))
    assert d3["verification"]["content_intact"] is False
    tampered = api.c.get("/api/v1/public/documents/verify",
                         params={"number": d2["document_number"], "code": d2["verification_code"]}).json()
    assert tampered["found"] and tampered["valid"] is False


def test_void_keeps_record_and_templates_are_versioned(api):
    ag = setup_agreement(api)
    doc = api.ok(api.post(f"/agreements/{ag['id']}/documents", {}), 201)
    assert api.post(f"/agreement-documents/{doc['id']}/void", {"reason": ""}).status_code == 422
    v = api.ok(api.post(f"/agreement-documents/{doc['id']}/void", {"reason": "Wrong unit"}))
    assert v["status"] == "void" and v["void_reason"] == "Wrong unit"
    assert len(api.ok(api.get(f"/agreements/{ag['id']}/documents"))) == 1

    t = api.ok(api.get("/agreement-templates"))[0]
    r = api.patch(f"/agreement-templates/{t['id']}", {"body": t["body"] + "\n{{not_a_field}}"})
    assert r.status_code == 400
    t2 = api.ok(api.patch(f"/agreement-templates/{t['id']}", {"body": t["body"] + "\n\nIngingo ya 9: Test."}))
    assert t2["version"] == t["version"] + 1

    new = api.ok(api.post("/agreement-templates", {"name": "Residential (English)", "title": "LEASE AGREEMENT",
                                                   "body": "Between {{landlord_name}} and {{tenant_name}}."}), 201)
    assert new["is_default"] is False
    api.ok(api.post(f"/agreement-templates/{new['id']}/default"))
    assert [x["id"] for x in api.ok(api.get("/agreement-templates")) if x["is_default"]] == [new["id"]]
    preview = api.ok(api.post("/agreement-templates/preview", {"title": "T", "body": "Hi {{tenant_name}}"}))
    assert "Uwase Aline" in preview["html"]


def test_documents_require_agreement_permissions(client, api):
    from conftest import login, make_user

    ag = setup_agreement(api)
    make_user("acct@example.com", "Accountant")
    h = login(client, "acct@example.com")
    assert client.post(f"/api/v1/agreements/{ag['id']}/documents", json={}, headers=h).status_code == 403
    assert client.post("/api/v1/agreement-templates", json={"name": "x" * 3, "title": "abc",
                                                            "body": "0123456789"}, headers=h).status_code == 403


def test_blank_property_address_uses_the_landlords_default_location(api, db):
    from sqlalchemy import text
    for k, v in {"village": "Bisambu", "cell": "Nyarurama", "sector": "Gatenga", "district": "Kicukiro"}.items():
        db.execute(text("INSERT INTO app_settings (key, value, label, \"group\", is_public) VALUES "
                        "(:k, to_jsonb(CAST(:v AS text)), '', 'landlord', false) ON CONFLICT (key) DO UPDATE "
                        "SET value = EXCLUDED.value"), {"k": f"landlord.default_{k}", "v": v})
    db.commit()
    prop = api.property(code="B02", sector="Remera", district="Gasabo")  # no cell or village recorded
    unit = api.unit(prop["id"], code="R02")
    tenant = api.tenant()
    ag = api.agreement(tenant["id"], unit["id"], start="2026-11-01", end="2027-10-31")
    f = api.ok(api.post(f"/agreements/{ag['id']}/documents", {}), 201)["fields"]
    # The property's own sector/district win; blanks fall back to the defaults.
    assert (f["village"], f["cell"], f["sector"], f["district"]) == ("Bisambu", "Nyarurama", "Remera", "Gasabo")
