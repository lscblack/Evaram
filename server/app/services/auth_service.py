import asyncio
import logging
from datetime import timedelta

from fastapi import HTTPException, Request, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.email import send_otp_email
from app.core.security import (
    constant_time_equals,
    create_access_token,
    create_pre_auth_token,
    create_refresh_token,
    decode_token,
    generate_otp,
    normalise_otp,
    generate_token,
    hash_password,
    sha256_hex,
    utcnow,
    verify_password,
)
from app.models.user import (
    OtpCode,
    OtpPurpose,
    RefreshToken,
    User,
    UserRole,
    UserStatus,
)
from app.schemas.auth import LoginChallenge, TokenPair, UserPublic


#: How long the request waits for SMTP before handing the send to the background.
#: Mail servers are slow and unpredictable; the sign-in screen must not be.
OTP_DELIVERY_BUDGET_SECONDS = 1.2


async def _deliver_otp(email: str, full_name: str, code: str) -> bool:
    """Send the code, but never let a slow mail server stall the response.

    Returns False only when SMTP fails *fast* — a send still in flight is
    reported as delivered, because it almost always is, and the user can ask
    for another code either way.
    """
    task = asyncio.create_task(
        send_otp_email(email, full_name, code, settings.OTP_TTL_SECONDS // 60)
    )
    try:
        return await asyncio.wait_for(asyncio.shield(task), OTP_DELIVERY_BUDGET_SECONDS)
    except asyncio.TimeoutError:
        # Still sending. Keep a reference so the task is not garbage-collected.
        _PENDING_SENDS.add(task)
        task.add_done_callback(_PENDING_SENDS.discard)
        return True


#: asyncio only holds weak references to tasks; without this they can vanish.
_PENDING_SENDS: set[asyncio.Task] = set()


logger = logging.getLogger("evaramu.auth")

INVALID_CREDENTIALS = HTTPException(
    status.HTTP_401_UNAUTHORIZED, "Email or password is incorrect"
)


def mask_email(email: str) -> str:
    name, _, domain = email.partition("@")
    head = name[0] if name else "*"
    return f"{head}{'*' * max(len(name) - 1, 3)}@{domain}"


async def _lockout_guard(user: User) -> None:
    if user.locked_until and user.locked_until > utcnow():
        remaining = int((user.locked_until - utcnow()).total_seconds() // 60) + 1
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            f"Too many failed attempts. Try again in {remaining} minute(s).",
        )


async def _register_failure(db: AsyncSession, user: User) -> None:
    user.failed_login_count += 1
    if user.failed_login_count >= settings.LOGIN_MAX_ATTEMPTS:
        user.locked_until = utcnow() + timedelta(minutes=settings.LOGIN_LOCKOUT_MINUTES)
        user.failed_login_count = 0
        logger.warning("account locked after repeated failures: %s", user.email)
    await db.commit()


async def start_login(db: AsyncSession, email: str, password: str) -> tuple[User, LoginChallenge]:
    """
    Verifies the password and issues an OTP. Returns the pre-auth challenge —
    no session is created until the code is confirmed.
    """
    user = await db.scalar(select(User).where(User.email == email.lower().strip()))
    if user is None:
        # Spend roughly the same time as a real verification to blunt user enumeration.
        verify_password(password, hash_password("dummy-password-for-timing"))
        raise INVALID_CREDENTIALS

    await _lockout_guard(user)

    if not verify_password(password, user.hashed_password):
        await _register_failure(db, user)
        raise INVALID_CREDENTIALS

    if user.status is UserStatus.DISABLED:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account has been disabled")
    if user.status is UserStatus.SUSPENDED:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account is suspended")

    user.failed_login_count = 0
    user.locked_until = None

    challenge = generate_token(16)
    code = generate_otp()

    # Invalidate any outstanding login codes for this account.
    await db.execute(
        update(OtpCode)
        .where(
            OtpCode.user_id == user.id,
            OtpCode.purpose == OtpPurpose.LOGIN,
            OtpCode.consumed_at.is_(None),
        )
        .values(consumed_at=utcnow())
    )

    db.add(
        OtpCode(
            user_id=user.id,
            code_hash=sha256_hex(code),
            purpose=OtpPurpose.LOGIN,
            expires_at=utcnow() + timedelta(seconds=settings.OTP_TTL_SECONDS),
            challenge=challenge,
        )
    )
    await db.commit()

    delivered = await _deliver_otp(user.email, user.full_name, code)
    if not delivered and user.role is UserRole.SUPER_ADMIN:
        logger.info(
            "SMTP unavailable; super admin may use the bypass code to sign in as %s",
            user.email,
        )

    return user, LoginChallenge(
        pre_auth_token=create_pre_auth_token(str(user.id), challenge),
        sent_to=mask_email(user.email),
        expires_in=settings.OTP_TTL_SECONDS,
        delivery_failed=not delivered,
    )


async def verify_otp(
    db: AsyncSession, pre_auth_token: str, code: str, request: Request | None = None
) -> TokenPair:
    payload = decode_token(pre_auth_token, expected_type="pre_auth")
    if not payload:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "This sign-in attempt has expired")

    user = await db.scalar(select(User).where(User.id == payload["sub"]))
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Account no longer exists")

    challenge = payload.get("cha", "")
    submitted = normalise_otp(code)

    # The founder keeps a fixed fallback so a broken SMTP relay can never lock
    # them out of their own platform. Scoped strictly to SUPER_ADMIN.
    is_bypass = (
        user.role is UserRole.SUPER_ADMIN
        and constant_time_equals(submitted, settings.SUPER_ADMIN_OTP_BYPASS)
    )

    if not is_bypass:
        otp = await db.scalar(
            select(OtpCode)
            .where(
                OtpCode.user_id == user.id,
                OtpCode.challenge == challenge,
                OtpCode.purpose == OtpPurpose.LOGIN,
                OtpCode.consumed_at.is_(None),
            )
            .order_by(OtpCode.created_at.desc())
            .limit(1)
        )
        if otp is None:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "No pending code for this attempt")
        if otp.expires_at < utcnow():
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "That code has expired")
        if otp.attempts >= settings.OTP_MAX_ATTEMPTS:
            otp.consumed_at = utcnow()
            await db.commit()
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many incorrect codes")

        if not constant_time_equals(otp.code_hash, sha256_hex(submitted)):
            otp.attempts += 1
            await db.commit()
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "That code is not correct")

        otp.consumed_at = utcnow()

    user.last_login_at = utcnow()
    user.email_verified = True
    if user.status is UserStatus.PENDING:
        user.status = UserStatus.ACTIVE

    pair = await _issue_session(db, user, request)
    await db.commit()
    return pair


async def _issue_session(
    db: AsyncSession, user: User, request: Request | None = None
) -> TokenPair:
    refresh_raw = create_refresh_token(str(user.id))
    record = RefreshToken(
        user_id=user.id,
        token_hash=sha256_hex(refresh_raw),
        expires_at=utcnow() + timedelta(days=settings.REFRESH_TOKEN_TTL_DAYS),
    )
    if request is not None:
        record.user_agent = request.headers.get("user-agent", "")[:320]
        forwarded = request.headers.get("x-forwarded-for")
        record.ip_address = (
            forwarded.split(",")[0].strip()
            if forwarded
            else (request.client.host if request.client else None)
        )
    db.add(record)

    return TokenPair(
        access_token=create_access_token(str(user.id), user.role.value),
        refresh_token=refresh_raw,
        expires_in=settings.ACCESS_TOKEN_TTL_MINUTES * 60,
        user=UserPublic.model_validate(user),
    )


async def refresh_session(
    db: AsyncSession, refresh_raw: str, request: Request | None = None
) -> TokenPair:
    payload = decode_token(refresh_raw, expected_type="refresh")
    if not payload:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token")

    token_hash = sha256_hex(refresh_raw)
    record = await db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))

    if record is None or record.revoked_at is not None or record.expires_at < utcnow():
        # Reuse of a revoked token means the family is compromised — drop them all.
        if record is not None and record.revoked_at is not None:
            await db.execute(
                update(RefreshToken)
                .where(RefreshToken.user_id == record.user_id, RefreshToken.revoked_at.is_(None))
                .values(revoked_at=utcnow())
            )
            await db.commit()
            logger.warning("refresh token reuse detected for user %s", record.user_id)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired, please sign in again")

    user = await db.scalar(select(User).where(User.id == record.user_id))
    if user is None or user.status is not UserStatus.ACTIVE:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Account unavailable")

    # Rotate.
    record.revoked_at = utcnow()
    pair = await _issue_session(db, user, request)
    await db.commit()
    return pair


async def revoke_session(db: AsyncSession, refresh_raw: str) -> None:
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.token_hash == sha256_hex(refresh_raw))
        .values(revoked_at=utcnow())
    )
    await db.commit()


async def revoke_all_sessions(db: AsyncSession, user_id) -> None:
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=utcnow())
    )
    await db.commit()


async def resend_otp(db: AsyncSession, pre_auth_token: str) -> LoginChallenge:
    payload = decode_token(pre_auth_token, expected_type="pre_auth")
    if not payload:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "This sign-in attempt has expired")

    user = await db.scalar(select(User).where(User.id == payload["sub"]))
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Account no longer exists")

    challenge = payload.get("cha", "")
    code = generate_otp()

    await db.execute(
        update(OtpCode)
        .where(
            OtpCode.user_id == user.id,
            OtpCode.purpose == OtpPurpose.LOGIN,
            OtpCode.consumed_at.is_(None),
        )
        .values(consumed_at=utcnow())
    )
    db.add(
        OtpCode(
            user_id=user.id,
            code_hash=sha256_hex(code),
            purpose=OtpPurpose.LOGIN,
            expires_at=utcnow() + timedelta(seconds=settings.OTP_TTL_SECONDS),
            challenge=challenge,
        )
    )
    await db.commit()

    delivered = await _deliver_otp(user.email, user.full_name, code)
    return LoginChallenge(
        pre_auth_token=pre_auth_token,
        sent_to=mask_email(user.email),
        expires_in=settings.OTP_TTL_SECONDS,
        delivery_failed=not delivered,
    )
