"""Sign in without a password: emailed one-time codes and passkeys (WebAuthn).

Both end in the same session as a password sign-in (access token + rotating
refresh cookie) and respect account deactivation and lockout.

* Email codes: 6 digits, valid LOGIN_CODE_TTL_MINUTES, single use, 5 wrong
  tries per code, only an HMAC of the code is stored, and the request
  endpoint answers the same whether or not the address has an account.
* Passkeys: discoverable credentials with user verification required; each
  ceremony uses a single-use server-side challenge that expires in 5 minutes.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import secrets
from datetime import UTC, datetime, timedelta
from html import escape
from typing import Any
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session
from webauthn import (
    generate_authentication_options,
    generate_registration_options,
    options_to_json,
    verify_authentication_response,
    verify_registration_response,
)
from webauthn.helpers import base64url_to_bytes
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    PublicKeyCredentialDescriptor,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)

from evaramu.core.config import get_settings
from evaramu.core.deps import DB, CurrentUser
from evaramu.core.errors import DomainError, NotFound, Unauthorized
from evaramu.core.mail import send_mail
from evaramu.core.ratelimit import rate_limit
from evaramu.core.schemas import Message
from evaramu.modules.identity import service
from evaramu.modules.identity.models import LoginCode, Passkey, User, WebAuthnChallenge
from evaramu.modules.identity.schemas import TokenOut
from evaramu.modules.system.models import AppSetting
from evaramu.modules.system.services import audit

router = APIRouter()

CODE_ATTEMPTS = 5
CODES_PER_WINDOW = 3          # per account
CODE_WINDOW_MINUTES = 15
CHALLENGE_TTL = timedelta(minutes=5)
GENERIC_SENT = "If that address belongs to an active account, a sign-in code is on its way."


def _now() -> datetime:
    return datetime.now(UTC)


def _finish_sign_in(db: Session, user: User, request: Request, response: Response, method: str) -> TokenOut:
    """Same ending as a password sign-in (imported lazily to avoid a cycle with router.py)."""
    from evaramu.modules.identity.router import _me, _set_refresh_cookie

    if not user.is_active:
        raise Unauthorized("This account has been deactivated", code="account_inactive")
    if user.locked_until and user.locked_until > _now():
        raise Unauthorized("Too many failed attempts. The account is temporarily locked; try again later.",
                           code="account_locked")
    user.failed_login_count = 0
    user.locked_until = None
    user.last_login_at = _now()
    access, ttl, raw = service.issue_tokens(db, user, request.headers.get("user-agent"))
    audit(db, actor=user, action="auth.login", entity_type="user", entity_id=user.id,
          summary=f"{user.email} signed in with {method}", request=request)
    db.commit()
    _set_refresh_cookie(response, raw)
    return TokenOut(access_token=access, expires_in=ttl, user=_me(user))


# ---- which methods are available -----------------------------------------------------------------

class SignInMethods(BaseModel):
    password: bool = True
    email_code: bool
    passkey: bool = True


@router.get("/methods", response_model=SignInMethods)
def sign_in_methods():
    return SignInMethods(email_code=get_settings().mail_enabled)


# ---- email codes ---------------------------------------------------------------------------------

class CodeRequest(BaseModel):
    email: EmailStr


class CodeVerify(BaseModel):
    email: EmailStr
    code: str = Field(pattern=r"^\s*\d{6}\s*$")


def _code_hash(user_id: int, code: str) -> str:
    key = get_settings().SECRET_KEY.encode()
    return hmac.new(key, f"login-code:{user_id}:{code}".encode(), hashlib.sha256).hexdigest()


def _find_user(db: Session, email: str) -> User | None:
    return db.execute(select(User).where(func.lower(User.email) == email.lower())).scalar_one_or_none()


def _company(db: Session) -> str:
    s = db.get(AppSetting, "company.name")
    return str(s.value) if s is not None and s.value else "Evaramu"


@router.post("/email-code", response_model=Message, dependencies=[Depends(rate_limit("email-code", 5, 600))])
def request_email_code(body: CodeRequest, db: DB):
    s = get_settings()
    if not s.mail_enabled:
        raise DomainError("Email sign-in is not available. Sign in with your password.")
    user = _find_user(db, body.email)
    if user is None or not user.is_active:
        return Message(detail=GENERIC_SENT)
    recent = db.execute(select(func.count()).select_from(LoginCode).where(
        LoginCode.user_id == user.id, LoginCode.created_at > _now() - timedelta(minutes=CODE_WINDOW_MINUTES))).scalar_one()
    if recent >= CODES_PER_WINDOW:
        return Message(detail=GENERIC_SENT)
    # A new code replaces any earlier unused one.
    db.execute(delete(LoginCode).where(LoginCode.user_id == user.id, LoginCode.used_at.is_(None)))
    code = f"{secrets.randbelow(1_000_000):06d}"
    db.add(LoginCode(user_id=user.id, code_hash=_code_hash(user.id, code),
                     expires_at=_now() + timedelta(minutes=s.LOGIN_CODE_TTL_MINUTES)))
    db.commit()
    company = _company(db)
    minutes = s.LOGIN_CODE_TTL_MINUTES
    text = (f"Hello {user.full_name},\n\nYour {company} sign-in code is: {code}\n\n"
            f"It expires in {minutes} minutes and can be used once. If you did not ask for it, ignore this email; "
            f"your password has not changed.\n")
    html = f"""<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#0f172a">
<div style="background:#032a4e;color:#fff;padding:18px 24px;border-radius:12px 12px 0 0;font-weight:bold">{escape(company)}</div>
<div style="border:1px solid #dbe3ec;border-top:0;padding:24px;border-radius:0 0 12px 12px">
<p>Hello {escape(user.full_name)},</p><p>Your sign-in code is:</p>
<p style="font-size:32px;letter-spacing:8px;font-weight:bold;color:#032a4e;margin:16px 0">{code}</p>
<p style="color:#64748b;font-size:13px">It expires in {minutes} minutes and can be used once. If you did not ask for it,
ignore this email; your password has not changed.</p></div></div>"""
    send_mail(user.email, f"{code} is your {company} sign-in code", text, html)
    return Message(detail=GENERIC_SENT)


@router.post("/email-code/verify", response_model=TokenOut,
             dependencies=[Depends(rate_limit("email-code-verify", 10, 300))])
def verify_email_code(body: CodeVerify, request: Request, response: Response, db: DB):
    wrong = Unauthorized("That code is not valid or has expired. Ask for a new one.", code="bad_code")
    user = _find_user(db, body.email)
    if user is None:
        raise wrong
    row = db.execute(select(LoginCode).where(LoginCode.user_id == user.id, LoginCode.used_at.is_(None))
                     .order_by(LoginCode.created_at.desc()).limit(1)).scalar_one_or_none()
    if row is None or row.expires_at <= _now() or row.attempts >= CODE_ATTEMPTS:
        raise wrong
    if not hmac.compare_digest(row.code_hash, _code_hash(user.id, body.code.strip())):
        row.attempts += 1
        db.commit()
        raise wrong
    row.used_at = _now()
    return _finish_sign_in(db, user, request, response, "an emailed code")


# ---- passkeys ------------------------------------------------------------------------------------

def _user_handle(user: User) -> bytes:
    """Opaque, stable WebAuthn user id (does not reveal the database id)."""
    key = get_settings().SECRET_KEY.encode()
    return hmac.new(key, f"webauthn-user:{user.id}".encode(), hashlib.sha256).digest()


def _new_challenge(db: Session, purpose: str, user_id: int | None) -> tuple[str, bytes]:
    db.execute(delete(WebAuthnChallenge).where(WebAuthnChallenge.expires_at < _now()))
    cid = secrets.token_urlsafe(32)
    challenge = secrets.token_bytes(32)
    db.add(WebAuthnChallenge(id=cid, challenge=challenge, purpose=purpose, user_id=user_id,
                             expires_at=_now() + CHALLENGE_TTL))
    db.commit()
    return cid, challenge


def _take_challenge(db: Session, cid: str, purpose: str, user_id: int | None = None) -> bytes:
    row = db.get(WebAuthnChallenge, cid)
    if row is None or row.purpose != purpose or row.expires_at <= _now() or (user_id and row.user_id != user_id):
        raise DomainError("This passkey request has expired. Please try again.")
    challenge = row.challenge
    db.delete(row)  # single use
    db.flush()
    return challenge


class PasskeyOptionsOut(BaseModel):
    challenge_id: str
    options: dict[str, Any]


class PasskeyRegister(BaseModel):
    challenge_id: str = Field(max_length=64)
    credential: dict[str, Any]
    name: str = Field(default="", max_length=80)


class PasskeyLogin(BaseModel):
    challenge_id: str = Field(max_length=64)
    credential: dict[str, Any]


class PasskeyOut(BaseModel):
    id: int
    name: str
    created_at: datetime
    last_used_at: datetime | None
    backed_up: bool


def _relying_party(request: Request) -> tuple[str, list[str]]:
    """(RP ID, accepted origins) for this request.

    WEBAUTHN_RP_ID / WEBAUTHN_ORIGINS win when set. Otherwise the page's own
    origin is used — but only when it is a trusted site origin (CORS_ORIGINS or
    PUBLIC_SITE_URL), so a production server whose PUBLIC_SITE_URL was left at a
    development value still offers passkeys for https://evaramu.rw. "www." is
    dropped so evaramu.rw and www.evaramu.rw share the same passkeys.
    """
    s = get_settings()
    if s.WEBAUTHN_RP_ID:
        return s.WEBAUTHN_RP_ID, s.webauthn_origins
    trusted = {o.rstrip("/") for o in [*s.cors_origins, *s.webauthn_origins]}
    origin = (request.headers.get("origin") or "").rstrip("/")
    if origin in trusted:
        host = urlsplit(origin).hostname or ""
        if host:
            rp = host[4:] if host.startswith("www.") and host.count(".") >= 2 else host
            same_site = sorted(o for o in trusted if (urlsplit(o).hostname or "") in (rp, f"www.{rp}"))
            return rp, same_site or [origin]
    return s.webauthn_rp_id, s.webauthn_origins


@router.get("/passkeys", response_model=list[PasskeyOut])
def list_passkeys(user: CurrentUser, db: DB):
    return list(db.execute(select(Passkey).where(Passkey.user_id == user.id).order_by(Passkey.created_at)).scalars())


@router.post("/passkeys/register/options", response_model=PasskeyOptionsOut,
             dependencies=[Depends(rate_limit("passkey-reg", 20, 300))])
def passkey_register_options(request: Request, user: CurrentUser, db: DB):
    s = get_settings()
    rp_id, _origins = _relying_party(request)
    existing = db.execute(select(Passkey.credential_id).where(Passkey.user_id == user.id)).scalars().all()
    cid, challenge = _new_challenge(db, "register", user.id)
    opts = generate_registration_options(
        rp_id=rp_id, rp_name=s.WEBAUTHN_RP_NAME, user_id=_user_handle(user), user_name=user.email,
        user_display_name=user.full_name, challenge=challenge,
        authenticator_selection=AuthenticatorSelectionCriteria(
            resident_key=ResidentKeyRequirement.REQUIRED, user_verification=UserVerificationRequirement.REQUIRED),
        exclude_credentials=[PublicKeyCredentialDescriptor(id=c) for c in existing],
    )
    return PasskeyOptionsOut(challenge_id=cid, options=json.loads(options_to_json(opts)))


@router.post("/passkeys/register", response_model=PasskeyOut, status_code=201,
             dependencies=[Depends(rate_limit("passkey-reg", 20, 300))])
def passkey_register(body: PasskeyRegister, request: Request, user: CurrentUser, db: DB):
    rp_id, origins = _relying_party(request)
    challenge = _take_challenge(db, body.challenge_id, "register", user.id)
    try:
        v = verify_registration_response(credential=body.credential, expected_challenge=challenge,
                                         expected_rp_id=rp_id, expected_origin=origins,
                                         require_user_verification=True)
    except Exception as exc:
        db.commit()
        raise DomainError("The passkey could not be verified. Please try again.") from exc
    transports = body.credential.get("response", {}).get("transports") or []
    pk = Passkey(user_id=user.id, credential_id=v.credential_id, public_key=v.credential_public_key,
                 sign_count=v.sign_count, transports=[str(t) for t in transports][:8],
                 name=body.name.strip() or f"Passkey added {_now():%d %b %Y}", backed_up=bool(v.credential_backed_up))
    db.add(pk)
    audit(db, actor=user, action="auth.passkey_added", entity_type="user", entity_id=user.id,
          summary=f"{user.email} added a passkey ({pk.name})", request=request)
    db.commit()
    return pk


@router.delete("/passkeys/{passkey_id}", response_model=Message)
def passkey_delete(passkey_id: int, request: Request, user: CurrentUser, db: DB):
    pk = db.get(Passkey, passkey_id)
    if pk is None or pk.user_id != user.id:
        raise NotFound("Passkey not found")
    audit(db, actor=user, action="auth.passkey_removed", entity_type="user", entity_id=user.id,
          summary=f"{user.email} removed a passkey ({pk.name})", request=request)
    db.delete(pk)
    db.commit()
    return Message(detail="Passkey removed")


@router.post("/passkeys/login/options", response_model=PasskeyOptionsOut,
             dependencies=[Depends(rate_limit("passkey-login", 20, 60))])
def passkey_login_options(request: Request, db: DB):
    cid, challenge = _new_challenge(db, "login", None)
    opts = generate_authentication_options(rp_id=_relying_party(request)[0], challenge=challenge,
                                           user_verification=UserVerificationRequirement.REQUIRED)
    return PasskeyOptionsOut(challenge_id=cid, options=json.loads(options_to_json(opts)))


@router.post("/passkeys/login", response_model=TokenOut, dependencies=[Depends(rate_limit("passkey-login", 20, 60))])
def passkey_login(body: PasskeyLogin, request: Request, response: Response, db: DB):
    rp_id, origins = _relying_party(request)
    challenge = _take_challenge(db, body.challenge_id, "login")
    failed = Unauthorized("That passkey is not registered here. Sign in another way, then add it from your account.",
                          code="bad_passkey")
    try:
        raw_id = base64url_to_bytes(str(body.credential.get("rawId") or body.credential.get("id") or ""))
    except Exception as exc:
        db.commit()
        raise failed from exc
    pk = db.execute(select(Passkey).where(Passkey.credential_id == raw_id)).unique().scalar_one_or_none()
    if pk is None:
        db.commit()
        raise failed
    handle = body.credential.get("response", {}).get("userHandle")
    try:
        if handle and base64url_to_bytes(handle) != _user_handle(pk.user):
            raise ValueError("user handle mismatch")
        v = verify_authentication_response(credential=body.credential, expected_challenge=challenge,
                                           expected_rp_id=rp_id, expected_origin=origins,
                                           credential_public_key=pk.public_key,
                                           credential_current_sign_count=pk.sign_count, require_user_verification=True)
    except Exception as exc:
        db.commit()
        raise failed from exc
    pk.sign_count = v.new_sign_count
    pk.last_used_at = _now()
    return _finish_sign_in(db, pk.user, request, response, "a passkey")

