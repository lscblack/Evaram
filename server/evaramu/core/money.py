"""Money helpers.

Amounts are ``Decimal`` end to end and stored as NUMERIC(14, 2). Each currency
has its own precision: Rwandan francs have no minor unit in practice, so RWF
amounts are whole numbers; US dollars keep cents. Amounts in different
currencies are never added together anywhere in the system.
"""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from enum import StrEnum


class Currency(StrEnum):
    RWF = "RWF"
    USD = "USD"


_EXPONENT = {Currency.RWF: Decimal("1"), Currency.USD: Decimal("0.01")}

ZERO = Decimal("0")


def quantize(amount: Decimal | int | float | str, currency: Currency | str) -> Decimal:
    cur = Currency(currency)
    return Decimal(str(amount)).quantize(_EXPONENT[cur], rounding=ROUND_HALF_UP)


def validate_amount(amount: Decimal, currency: Currency | str, *, allow_zero: bool = False) -> Decimal:
    cur = Currency(currency)
    if amount < 0 or (amount == 0 and not allow_zero):
        raise ValueError("Amount must be greater than zero")
    q = quantize(amount, cur)
    if q != amount:
        if cur == Currency.RWF:
            raise ValueError("RWF amounts must be whole francs")
        raise ValueError("USD amounts can have at most 2 decimal places")
    return q
