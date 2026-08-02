import hashlib
import hmac
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from jose import JWTError, jwt

from app.core.config import settings

# Tuned for an interactive login: ~50ms on commodity hardware.
_hasher = PasswordHasher(time_cost=2, memory_cost=64 * 1024, parallelism=2)

TokenType = Literal["access", "refresh", "pre_auth"]


# ---------------------------------------------------------------- passwords
def hash_password(raw: str) -> str:
    return _hasher.hash(raw)


def verify_password(raw: str, hashed: str) -> bool:
    try:
        return _hasher.verify(hashed, raw)
    except (VerifyMismatchError, InvalidHashError, Exception):
        return False


def password_needs_rehash(hashed: str) -> bool:
    try:
        return _hasher.check_needs_rehash(hashed)
    except Exception:
        return False


PASSWORD_RULES = (
    "Password must be at least 10 characters and include an uppercase letter, "
    "a lowercase letter, a digit and a symbol."
)


def validate_password_strength(raw: str) -> str | None:
    """Returns an error message, or None when the password is acceptable."""
    if len(raw) < 10:
        return PASSWORD_RULES
    checks = (
        any(c.isupper() for c in raw),
        any(c.islower() for c in raw),
        any(c.isdigit() for c in raw),
        any(not c.isalnum() for c in raw),
    )
    return None if all(checks) else PASSWORD_RULES


# ---------------------------------------------------------------- tokens
def _create_token(
    subject: str, token_type: TokenType, expires_delta: timedelta, extra: dict | None = None
) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
        "jti": secrets.token_urlsafe(16),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_access_token(subject: str, role: str, extra: dict | None = None) -> str:
    return _create_token(
        subject,
        "access",
        timedelta(minutes=settings.ACCESS_TOKEN_TTL_MINUTES),
        {"role": role, **(extra or {})},
    )


def create_refresh_token(subject: str) -> str:
    return _create_token(subject, "refresh", timedelta(days=settings.REFRESH_TOKEN_TTL_DAYS))


def create_pre_auth_token(subject: str, challenge: str) -> str:
    """Issued after a correct password but before the OTP step."""
    return _create_token(
        subject, "pre_auth", timedelta(seconds=settings.OTP_TTL_SECONDS), {"cha": challenge}
    )


def decode_token(token: str, expected_type: TokenType | None = None) -> dict | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return None
    if expected_type and payload.get("type") != expected_type:
        return None
    return payload


# ---------------------------------------------------------------- opaque secrets
def sha256_hex(value: str) -> str:
    """Refresh tokens and OTPs are stored as digests, never in the clear."""
    return hashlib.sha256(value.encode()).hexdigest()


def constant_time_equals(a: str, b: str) -> bool:
    return hmac.compare_digest(a, b)


#: Uppercase + digits, minus the glyphs people misread when retyping a code
#: from an email: 0/O, 1/I/L, 5/S, 8/B, 2/Z.
OTP_ALPHABET = "ACDEFGHJKMNPQRTUVWXY34679"


def generate_otp(length: int | None = None) -> str:
    """
    Alphanumeric one-time code. A 6-character code over this 25-symbol
    alphabet is ~244 million combinations against ~1 million for six digits,
    so the same 5-attempt cap is far harder to brute force.
    """
    length = length or settings.OTP_LENGTH
    return "".join(secrets.choice(OTP_ALPHABET) for _ in range(length))


def normalise_otp(value: str) -> str:
    """Codes are case-insensitive and tolerate spaces or dashes when pasted."""
    return value.strip().upper().replace(" ", "").replace("-", "")


def generate_reference(prefix: str = "EVR", length: int = 8) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return f"{prefix}-{''.join(secrets.choice(alphabet) for _ in range(length))}"


def generate_token(nbytes: int = 32) -> str:
    return secrets.token_urlsafe(nbytes)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)
