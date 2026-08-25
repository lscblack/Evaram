"""Finding and creating client records.

A seller who fills in the public form is a client whether or not anyone has
typed them into the CRM yet, so the form creates the record. The whole value of
that is in *not* creating a second one for someone we already know, which makes
matching the real work here.
"""

from __future__ import annotations

import re
import uuid
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.crm import Client, ClientKind

#: Rwanda's country code, and the length of a local subscriber number.
_RW_CODE = "250"
_LOCAL_LEN = 9


def normalise_phone(raw: str | None) -> str | None:
    """Reduce a Rwandan number to its nine local digits.

    The same person writes their number as `0788123456`, `+250 788 123 456`,
    `250788123456` and `788123456` depending on the form. Matched as typed,
    each of those is a different client — which is how a CRM ends up with four
    records for one seller.
    """
    if not raw:
        return None

    digits = re.sub(r"\D", "", raw)
    if not digits:
        return None

    if digits.startswith(_RW_CODE) and len(digits) > _LOCAL_LEN:
        digits = digits[len(_RW_CODE):]
    digits = digits.lstrip("0")

    # Reduced to the last nine digits, which is the part that identifies a
    # subscriber here. A diaspora seller's foreign number is reduced the same
    # way — imperfect, but the comparison is symmetric, so a number always
    # matches itself and only collides with one sharing its final nine digits.
    return digits[-_LOCAL_LEN:] if len(digits) >= _LOCAL_LEN else digits


def _clean(value: str | None) -> str | None:
    value = (value or "").strip()
    return value or None


async def find_existing(
    db: AsyncSession,
    *,
    phone: str | None = None,
    email: str | None = None,
    national_id: str | None = None,
    user_id: uuid.UUID | None = None,
) -> Client | None:
    """The client this person already is, if we know them.

    Checked strongest identifier first. A national ID is unique to a person; an
    email nearly so; a phone number is shared often enough between a couple or
    a family that it is the weakest of the three, but still far better than a
    name.
    """
    if user_id:
        found = await db.scalar(select(Client).where(Client.user_id == user_id))
        if found:
            return found

    national_id = _clean(national_id)
    if national_id:
        found = await db.scalar(
            select(Client).where(Client.national_id == national_id)
        )
        if found:
            return found

    email = _clean(email)
    if email:
        found = await db.scalar(
            select(Client).where(func.lower(Client.email) == email.lower())
        )
        if found:
            return found

    local = normalise_phone(phone)
    if local:
        # Both sides reduced the same way, so a record saved as `+250 788…`
        # matches one typed as `0788…` — and a suffix cannot accidentally match
        # a longer number that merely ends the same way.
        def last_digits(column: Any) -> Any:
            return func.right(func.regexp_replace(func.coalesce(column, ""), r"\D", "", "g"), len(local))

        found = await db.scalar(
            select(Client).where(
                or_(last_digits(Client.phone) == local, last_digits(Client.whatsapp) == local)
            )
        )
        if found:
            return found

    return None


async def find_or_create(
    db: AsyncSession,
    *,
    full_name: str,
    phone: str | None = None,
    email: str | None = None,
    national_id: str | None = None,
    district: str | None = None,
    user_id: uuid.UUID | None = None,
    source: str = "public-form",
    note: str | None = None,
) -> tuple[Client, bool]:
    """Return the client, creating them if we do not already have one.

    The second element says whether the record is new, so a caller can tell an
    agent "added to clients" rather than implying it did nothing.

    A client created this way is tagged with where it came from. Self-declared
    details from a public form are not the same as details an agent has checked
    against an ID, and an agent looking at the record should be able to see the
    difference at a glance.
    """
    existing = await find_existing(
        db, phone=phone, email=email, national_id=national_id, user_id=user_id
    )
    if existing:
        # Fill in blanks from the new submission without overwriting anything
        # an agent has already recorded — the person in front of us is the
        # better source only where we hold nothing.
        existing.email = existing.email or _clean(email)
        existing.phone = existing.phone or _clean(phone)
        existing.national_id = existing.national_id or _clean(national_id)
        existing.district = existing.district or _clean(district)
        existing.user_id = existing.user_id or user_id
        return existing, False

    client = Client(
        kind=ClientKind.INDIVIDUAL,
        display_name=full_name.strip(),
        full_name=full_name.strip(),
        phone=_clean(phone),
        email=_clean(email),
        national_id=_clean(national_id),
        district=_clean(district),
        user_id=user_id,
        tags=[source],
        notes=note,
        is_active=True,
    )
    db.add(client)
    await db.flush()
    return client, True
