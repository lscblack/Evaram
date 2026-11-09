from conftest import PASSWORD, Api, login, make_user

CSRF = {"X-Requested-With": "evaramu"}


def _get(client):
    return next(c.value for c in client.cookies.jar if c.name == "evaramu_refresh")


def _set(client, value):
    client.cookies.clear()
    client.cookies.set("evaramu_refresh", value, path="/api/v1/auth")


def test_login_returns_token_and_permissions(client):
    make_user("a@example.com", "Administrator")
    r = client.post("/api/v1/auth/login", json={"email": "A@Example.com", "password": PASSWORD})
    assert r.status_code == 200
    body = r.json()
    assert body["access_token"] and body["expires_in"] > 0
    assert "payments.approve" in body["user"]["permissions"]
    assert "password_hash" not in r.text
    cookie = r.headers["set-cookie"]
    assert "evaramu_refresh=" in cookie and "HttpOnly" in cookie and "samesite=strict" in cookie.lower()


def test_wrong_password_and_unknown_user_give_same_error(client):
    make_user("a@example.com", "Administrator")
    r1 = client.post("/api/v1/auth/login", json={"email": "a@example.com", "password": "nope"})
    r2 = client.post("/api/v1/auth/login", json={"email": "ghost@example.com", "password": "nope"})
    assert r1.status_code == r2.status_code == 401
    assert r1.json()["detail"] == r2.json()["detail"]


def test_account_locks_after_repeated_failures(client):
    make_user("a@example.com", "Administrator")
    for _ in range(5):
        client.post("/api/v1/auth/login", json={"email": "a@example.com", "password": "bad-password"})
    r = client.post("/api/v1/auth/login", json={"email": "a@example.com", "password": PASSWORD})
    assert r.status_code == 401 and r.json()["code"] == "account_locked"


def test_login_endpoint_is_rate_limited(client):
    codes = [client.post("/api/v1/auth/login", json={"email": "x@example.com", "password": "x"}).status_code
             for _ in range(12)]
    assert 429 in codes


def test_protected_routes_require_authentication(client):
    assert client.get("/api/v1/properties").status_code == 401
    assert client.get("/api/v1/auth/me", headers={"Authorization": "Bearer garbage"}).status_code == 401


def test_refresh_rotates_and_detects_reuse(client):
    make_user("a@example.com", "Administrator")
    client.post("/api/v1/auth/login", json={"email": "a@example.com", "password": PASSWORD})
    old = _get(client)
    assert client.post("/api/v1/auth/refresh").status_code == 403  # missing CSRF header
    r = client.post("/api/v1/auth/refresh", headers=CSRF)
    assert r.status_code == 200
    new = _get(client)
    assert new and new != old
    # Immediate re-use (concurrent refresh race) is refused but harmless.
    _set(client, old)
    r = client.post("/api/v1/auth/refresh", headers=CSRF)
    assert r.status_code == 401 and r.json()["code"] == "refresh_race"
    _set(client, new)
    r = client.post("/api/v1/auth/refresh", headers=CSRF)
    assert r.status_code == 200
    newer = _get(client)
    # Re-use after the grace window is treated as theft: every session ends.
    from datetime import UTC, datetime, timedelta

    from sqlalchemy import text

    from evaramu.core.database import SessionLocal
    with SessionLocal() as s:
        s.execute(text("UPDATE refresh_tokens SET revoked_at = :t WHERE revoked_at IS NOT NULL"),
                  {"t": datetime.now(UTC) - timedelta(minutes=5)})
        s.commit()
    _set(client, old)
    assert client.post("/api/v1/auth/refresh", headers=CSRF).status_code == 401
    _set(client, newer)
    assert client.post("/api/v1/auth/refresh", headers=CSRF).status_code == 401


def test_logout_revokes_refresh_token(client):
    make_user("a@example.com", "Administrator")
    client.post("/api/v1/auth/login", json={"email": "a@example.com", "password": PASSWORD})
    token = client.cookies.get("evaramu_refresh")
    assert client.post("/api/v1/auth/logout", headers=CSRF).status_code == 200
    client.cookies.set("evaramu_refresh", token, path="/api/v1/auth")
    assert client.post("/api/v1/auth/refresh", headers=CSRF).status_code == 401


def test_password_change_invalidates_existing_tokens(client):
    make_user("a@example.com", "Administrator")
    h = login(client, "a@example.com")
    r = client.post("/api/v1/auth/change-password", headers=h,
                    json={"current_password": PASSWORD, "new_password": "weak"})
    assert r.status_code == 422
    r = client.post("/api/v1/auth/change-password", headers=h,
                    json={"current_password": PASSWORD, "new_password": "N3w!Secure-Pass"})
    assert r.status_code == 200
    assert client.get("/api/v1/auth/me", headers=h).status_code == 401


def test_admin_manages_staff_and_cannot_remove_last_admin(client, admin):
    api = Api(client, admin)
    roles = {r["name"]: r["id"] for r in api.ok(api.get("/roles"))}
    u = api.ok(api.post("/users", {"email": "pm@example.com", "full_name": "Pat Manager",
                                   "role_id": roles["Property Manager"], "password": PASSWORD}), 201)
    assert u["role"]["name"] == "Property Manager"
    assert api.post("/users", {"email": "pm@example.com", "full_name": "Dup", "role_id": roles["Viewer"],
                               "password": "Pm!Passw0rd-1"}).status_code == 409
    me = api.ok(api.get("/auth/me"))
    assert api.patch(f"/users/{me['id']}", {"is_active": False}).status_code == 409
    # Deactivating a user ends their sessions.
    pm = login(client, "pm@example.com")
    api.ok(api.patch(f"/users/{u['id']}", {"is_active": False}))
    assert client.get("/api/v1/auth/me", headers=pm).status_code == 401


def test_administrator_role_cannot_lose_permissions(api):
    admin_role = next(r for r in api.ok(api.get("/roles")) if r["name"] == "Administrator")
    assert api.patch(f"/roles/{admin_role['id']}", {"permission_codes": []}).status_code == 409
    custom = api.ok(api.post("/roles", {"name": "Caretaker", "permission_codes": ["properties.view"]}), 201)
    assert custom["permissions"] == ["properties.view"]
    assert api.post("/roles", {"name": "Bad", "permission_codes": ["nope.nope"]}).status_code == 400
