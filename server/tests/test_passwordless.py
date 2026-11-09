"""Email sign-in codes, passkeys (with a software authenticator) and shared invoice PDFs."""

import base64
import hashlib
import json
import os
import re
import secrets
from email import message_from_bytes
from email.policy import default as email_policy
from pathlib import Path

import cbor2
from conftest import PASSWORD, login, make_user
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from test_billing import MONTH_START, THIS_MONTH

from evaramu.modules.billing.router import whatsapp_number

ORIGIN = "http://localhost:5173"
RP_ID = "localhost"


def b64u(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def unb64u(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


# ---- email codes ---------------------------------------------------------------------------------

def outbox() -> list:
    d = Path(os.environ["MAIL_OUTBOX_DIR"])
    return [message_from_bytes(p.read_bytes(), policy=email_policy) for p in sorted(d.glob("*.eml"))] if d.exists() else []


def clear_outbox() -> None:
    d = Path(os.environ["MAIL_OUTBOX_DIR"])
    for p in d.glob("*.eml") if d.exists() else []:
        p.unlink()


def last_code(to: str) -> str:
    msg = [m for m in outbox() if m["To"] == to][-1]
    return re.search(r"\b(\d{6})\b", msg.get_body(("plain",)).get_content()).group(1)


def test_methods_lists_email_code_when_mail_is_configured(client):
    assert client.get("/api/v1/auth/methods").json() == {"password": True, "email_code": True, "passkey": True}


def test_email_code_signs_in_once(client):
    clear_outbox()
    make_user("staff@example.com", "Accountant", "Sam Staff")
    r = client.post("/api/v1/auth/email-code", json={"email": "STAFF@example.com"})
    assert r.status_code == 200
    code = last_code("staff@example.com")
    bad = client.post("/api/v1/auth/email-code/verify", json={"email": "staff@example.com",
                                                              "code": f"{(int(code) + 1) % 1_000_000:06d}"})
    assert bad.status_code == 401 and bad.json()["code"] == "bad_code"
    ok = client.post("/api/v1/auth/email-code/verify", json={"email": "staff@example.com", "code": code})
    assert ok.status_code == 200 and ok.json()["user"]["email"] == "staff@example.com"
    assert "evaramu_refresh" in ok.headers.get("set-cookie", "")
    # Single use.
    again = client.post("/api/v1/auth/email-code/verify", json={"email": "staff@example.com", "code": code})
    assert again.status_code == 401


def test_email_code_does_not_reveal_accounts_and_locks_after_wrong_tries(client):
    clear_outbox()
    r = client.post("/api/v1/auth/email-code", json={"email": "nobody@example.com"})
    assert r.status_code == 200 and outbox() == []
    make_user("staff@example.com", "Accountant")
    client.post("/api/v1/auth/email-code", json={"email": "staff@example.com"})
    code = last_code("staff@example.com")
    wrong = f"{(int(code) + 7) % 1_000_000:06d}"
    for _ in range(5):
        client.post("/api/v1/auth/email-code/verify", json={"email": "staff@example.com", "code": wrong})
    # Even the right code is refused after five wrong tries.
    r = client.post("/api/v1/auth/email-code/verify", json={"email": "staff@example.com", "code": code})
    assert r.status_code == 401


def test_email_code_refused_for_deactivated_account(client, api):
    clear_outbox()
    make_user("gone@example.com", "Viewer")
    users = api.ok(api.get("/users"))
    uid = next(u["id"] for u in users if u["email"] == "gone@example.com")
    api.ok(api.patch(f"/users/{uid}", {"is_active": False}))
    client.post("/api/v1/auth/email-code", json={"email": "gone@example.com"})
    assert [m for m in outbox() if m["To"] == "gone@example.com"] == []


# ---- passkeys ------------------------------------------------------------------------------------

class SoftAuthenticator:
    """Minimal platform authenticator: P-256 key, 'none' attestation, UV flag set."""

    def __init__(self):
        self.key = ec.generate_private_key(ec.SECP256R1())
        self.cred_id = secrets.token_bytes(32)
        self.count = 0
        self.user_handle = b""

    def _cose(self) -> bytes:
        n = self.key.public_key().public_numbers()
        return cbor2.dumps({1: 2, 3: -7, -1: 1, -2: n.x.to_bytes(32, "big"), -3: n.y.to_bytes(32, "big")})

    def _client_data(self, kind: str, challenge: str, origin: str) -> bytes:
        return json.dumps({"type": kind, "challenge": challenge, "origin": origin, "crossOrigin": False}).encode()

    def create(self, options: dict, origin: str = ORIGIN) -> dict:
        self.user_handle = unb64u(options["user"]["id"])
        rp_hash = hashlib.sha256(options["rp"]["id"].encode()).digest()
        auth_data = (rp_hash + bytes([0x45]) + self.count.to_bytes(4, "big") + bytes(16)
                     + len(self.cred_id).to_bytes(2, "big") + self.cred_id + self._cose())
        att = cbor2.dumps({"fmt": "none", "attStmt": {}, "authData": auth_data})
        cd = self._client_data("webauthn.create", options["challenge"], origin)
        return {"id": b64u(self.cred_id), "rawId": b64u(self.cred_id), "type": "public-key",
                "response": {"clientDataJSON": b64u(cd), "attestationObject": b64u(att), "transports": ["internal"]},
                "clientExtensionResults": {}}

    def get(self, options: dict, origin: str = ORIGIN) -> dict:
        self.count += 1
        rp_hash = hashlib.sha256(options["rpId"].encode()).digest()
        auth_data = rp_hash + bytes([0x05]) + self.count.to_bytes(4, "big")
        cd = self._client_data("webauthn.get", options["challenge"], origin)
        sig = self.key.sign(auth_data + hashlib.sha256(cd).digest(), ec.ECDSA(hashes.SHA256()))
        return {"id": b64u(self.cred_id), "rawId": b64u(self.cred_id), "type": "public-key",
                "response": {"clientDataJSON": b64u(cd), "authenticatorData": b64u(auth_data), "signature": b64u(sig),
                             "userHandle": b64u(self.user_handle)},
                "clientExtensionResults": {}}


def register(client, headers, auth: SoftAuthenticator, name="Laptop"):
    o = client.post("/api/v1/auth/passkeys/register/options", headers=headers).json()
    assert o["options"]["rp"]["id"] == RP_ID and o["options"]["authenticatorSelection"]["residentKey"] == "required"
    return client.post("/api/v1/auth/passkeys/register", headers=headers,
                       json={"challenge_id": o["challenge_id"], "credential": auth.create(o["options"]), "name": name})


def passkey_login(client, auth: SoftAuthenticator, origin=ORIGIN):
    o = client.post("/api/v1/auth/passkeys/login/options").json()
    return client.post("/api/v1/auth/passkeys/login",
                       json={"challenge_id": o["challenge_id"], "credential": auth.get(o["options"], origin)})


def test_passkey_register_sign_in_and_remove(client):
    make_user("pk@example.com", "Accountant", "Pat Key")
    h = login(client, "pk@example.com")
    auth = SoftAuthenticator()
    r = register(client, h, auth)
    assert r.status_code == 201, r.text
    assert [p["name"] for p in client.get("/api/v1/auth/passkeys", headers=h).json()] == ["Laptop"]

    r = passkey_login(client, auth)
    assert r.status_code == 200, r.text
    assert r.json()["user"]["email"] == "pk@example.com"
    # Signature counter moves forward; a second sign-in works too.
    assert passkey_login(client, auth).status_code == 200

    pid = client.get("/api/v1/auth/passkeys", headers=h).json()[0]["id"]
    assert client.delete(f"/api/v1/auth/passkeys/{pid}", headers=h).status_code == 200
    assert passkey_login(client, auth).status_code == 401


def test_passkey_rejects_wrong_origin_unknown_key_and_reused_challenge(client):
    make_user("pk@example.com", "Accountant")
    h = login(client, "pk@example.com")
    auth = SoftAuthenticator()
    assert register(client, h, auth).status_code == 201
    assert passkey_login(client, auth, origin="https://evil.example").status_code == 401
    assert passkey_login(client, SoftAuthenticator()).status_code == 401
    o = client.post("/api/v1/auth/passkeys/login/options").json()
    cred = auth.get(o["options"])
    assert client.post("/api/v1/auth/passkeys/login", json={"challenge_id": o["challenge_id"], "credential": cred}).status_code == 200
    replay = client.post("/api/v1/auth/passkeys/login", json={"challenge_id": o["challenge_id"], "credential": cred})
    assert replay.status_code == 400  # challenge already used


def test_passkey_cannot_be_removed_by_someone_else(client):
    make_user("a@example.com", "Accountant")
    make_user("b@example.com", "Accountant")
    ha, hb = login(client, "a@example.com"), login(client, "b@example.com")
    assert register(client, ha, SoftAuthenticator()).status_code == 201
    pid = client.get("/api/v1/auth/passkeys", headers=ha).json()[0]["id"]
    assert client.delete(f"/api/v1/auth/passkeys/{pid}", headers=hb).status_code == 404
    assert PASSWORD  # password sign-in still available alongside passkeys


# ---- invoice PDFs --------------------------------------------------------------------------------

def make_invoice(api):
    prop = api.property()
    unit = api.unit(prop["id"], code="R101", rent="150000")
    tenant = api.tenant(name="Jean <Mugisha> & Co", phone="0788123456")
    api.agreement(tenant["id"], unit["id"], start=MONTH_START.isoformat(), end=None, due_day=28)
    api.generate(THIS_MONTH)
    return api.ok(api.get("/invoices"))["items"][0]


def test_invoice_pdf_download_and_whatsapp_share(api, client):
    inv = make_invoice(api)
    r = client.get(f"/api/v1/invoices/{inv['id']}/pdf", headers=api.h)
    assert r.status_code == 200 and r.content.startswith(b"%PDF")
    assert f'invoice-{inv["invoice_number"]}.pdf' in r.headers["content-disposition"]

    share = api.ok(api.post(f"/invoices/{inv['id']}/share"))
    assert share["whatsapp_number"] == "250788123456"
    assert inv["invoice_number"] in share["message"] and "150,000 RWF" in share["message"]
    public = client.get(share["path"])  # no Authorization header
    assert public.status_code == 200 and public.content.startswith(b"%PDF")
    assert public.headers["content-disposition"].startswith("inline")

    tampered = share["path"][:-3] + ("aaa" if not share["path"].endswith("aaa") else "bbb")
    assert client.get(tampered).status_code == 404
    assert client.get("/api/v1/public/invoice-pdf/not-a-token").status_code == 404


def test_invoice_share_requires_sign_in(api, client):
    inv = make_invoice(api)
    from conftest import make_user as mk

    mk("noinv@example.com", "Viewer")  # Viewer has invoices.view → allowed
    h = login(client, "noinv@example.com")
    assert client.post(f"/api/v1/invoices/{inv['id']}/share", headers=h).status_code == 200
    assert client.post(f"/api/v1/invoices/{inv['id']}/share").status_code == 401


def test_whatsapp_number_formats():
    assert whatsapp_number("+250 788 123 456") == "250788123456"
    assert whatsapp_number("0788123456") == "250788123456"
    assert whatsapp_number("250788123456") == "250788123456"
