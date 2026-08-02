from datetime import timedelta

from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import captcha as captcha_lib
from app.core.config import settings
from app.core.security import sha256_hex, utcnow
from app.models.user import CaptchaChallenge
from app.schemas.auth import CaptchaIssue


async def issue(db: AsyncSession, *, ip: str | None, scope: str = "generic") -> CaptchaIssue:
    challenge = captcha_lib.build_challenge()

    db.add(
        CaptchaChallenge(
            token=challenge.token,
            answer_hash=sha256_hex(captcha_lib.normalise(challenge.answer)),
            expires_at=utcnow() + timedelta(seconds=settings.CAPTCHA_TTL_SECONDS),
            ip_address=ip,
            scope=scope,
        )
    )
    await db.commit()

    return CaptchaIssue(
        token=challenge.token,
        prompt=challenge.prompt,
        image_svg=challenge.svg,
        expires_in=settings.CAPTCHA_TTL_SECONDS,
    )


async def verify(
    db: AsyncSession, token: str | None, answer: str | None, *, scope: str = "generic"
) -> None:
    """
    Consumes the challenge. Raises 400 on any failure so a scraper learns
    nothing about which part was wrong.
    """
    if not settings.CAPTCHA_REQUIRED:
        return

    if not token or not answer:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Verification challenge required")

    row = await db.scalar(select(CaptchaChallenge).where(CaptchaChallenge.token == token))
    invalid = HTTPException(status.HTTP_400_BAD_REQUEST, "Verification failed, please try again")

    if row is None or row.consumed_at is not None:
        raise invalid
    if row.expires_at < utcnow():
        await db.delete(row)
        await db.commit()
        raise invalid
    if row.attempts >= 3:
        await db.delete(row)
        await db.commit()
        raise invalid
    if row.scope != scope:
        raise invalid

    if row.answer_hash != sha256_hex(captcha_lib.normalise(answer)):
        row.attempts += 1
        await db.commit()
        raise invalid

    # Single use.
    row.consumed_at = utcnow()
    await db.commit()


async def purge_expired(db: AsyncSession) -> int:
    result = await db.execute(
        delete(CaptchaChallenge).where(CaptchaChallenge.expires_at < utcnow())
    )
    await db.commit()
    return result.rowcount or 0
