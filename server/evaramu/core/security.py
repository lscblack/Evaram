"""Password hashing and token primitives."""

from __future__ import annotations

import hashlib
import secrets
from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from evaramu.core.config import get_settings

_hasher = PasswordHasher()

#: Hash of a random password, verified against when a login names an unknown
#: account so the response time does not reveal whether the account exists.
_DUMMY_HASH = _hasher.hash(secrets.token_urlsafe(16))


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    try:
        return _hasher.verify(password_hash or _DUMMY_HASH, password) and password_hash is not None
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def needs_rehash(password_hash: str) -> bool:
    return _hasher.check_needs_rehash(password_hash)


def validate_password_strength(password: str) -> None:
    if len(password) < 10:
        raise ValueError("Password must be at least 10 characters long")
    classes = sum(
        [
            any(c.islower() for c in password),
            any(c.isupper() for c in password),
            any(c.isdigit() for c in password),
            any(not c.isalnum() for c in password),
        ]
    )
    if classes < 3:
        raise ValueError(
            "Password must mix at least three of: lowercase, uppercase, digits, symbols"
        )


def create_access_token(user_id: int, token_version: int) -> tuple[str, int]:
    s = get_settings()
    ttl = s.ACCESS_TOKEN_TTL_MINUTES * 60
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "ver": token_version,
        "type": "access",
        "iat": now,
        "exp": now + timedelta(seconds=ttl),
    }
    return jwt.encode(payload, s.signing_key, algorithm=s.JWT_ALGORITHM), ttl


def decode_access_token(token: str) -> dict | None:
    s = get_settings()
    try:
        payload = jwt.decode(token, s.signing_key, algorithms=[s.JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None
    if payload.get("type") != "access":
        return None
    return payload


def new_refresh_token() -> tuple[str, str]:
    """Return (raw token for the cookie, sha256 digest for storage)."""
    raw = secrets.token_urlsafe(48)
    return raw, hash_token(raw)


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()
