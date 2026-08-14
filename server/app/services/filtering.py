"""
Generic, column-level filtering for admin list endpoints.

The console needs to slice listings by anything in the table — district, price,
verification, agent, date — without a bespoke query parameter per column. The
filter is therefore expressed as `column:operator:value`, e.g.

    ?filter=district:eq:Gasabo&filter=price:gte:20000000&filter=is_verified:eq:true

Two rules make this safe to expose:

  * the column must appear in an explicit allow-list per model. Reflecting over
    `__table__.columns` would happily expose `hashed_password` on some future
    model, and "every column" is not the same promise as "every column that is
    safe and useful to filter on".
  * the value is always bound as a parameter, never interpolated, so the worst a
    caller can do with a malformed value is get a 422.
"""

from datetime import date, datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import Column, and_, not_, or_
from sqlalchemy.sql.elements import ColumnElement

#: Columns of `Property` an admin may filter on, and how each is parsed.
#:
#: Deliberately excludes the free-text blobs (`description`, `search_text`) —
#: those are what `q` is for — and anything internal such as upload tokens.
PROPERTY_FILTERS: dict[str, str] = {
    "reference_number": "str",
    "upi": "str",
    "title": "str",
    "location": "str",
    "province": "str",
    "district": "str",
    "sector": "str",
    "cell": "str",
    "village": "str",
    "land_use": "str",
    "right_type": "str",
    "status": "str",
    "intent": "str",
    "currency": "str",
    "uploader_type": "str",
    "owner_name": "str",
    "vr_tour_provider": "str",
    "size": "float",
    "built_area": "float",
    "price": "float",
    "rent_amount": "float",
    "amount_paid": "float",
    "projected_yield": "float",
    "appreciation": "float",
    "latitude": "float",
    "longitude": "float",
    "bedrooms": "int",
    "bathrooms": "int",
    "view_count": "int",
    "is_verified": "bool",
    "is_featured": "bool",
    "is_negotiable": "bool",
    "is_archived": "bool",
    "show_on_public": "bool",
    "show_on_map": "bool",
    "allow_bidding": "bool",
    "category_id": "uuid",
    "subcategory_id": "uuid",
    "agent_id": "uuid",
    "uploaded_by_id": "uuid",
    "verified_by_id": "uuid",
    "published_at": "date",
    "created_at": "datetime",
    "updated_at": "datetime",
    "verified_at": "datetime",
}

#: Operators, and which value kinds they make sense for.
_TEXT_ONLY = {"contains", "startswith", "endswith"}
_OPERATORS = {"eq", "ne", "gt", "gte", "lt", "lte", "in", "isnull", *_TEXT_ONLY}

_TRUE = {"true", "1", "yes", "on"}
_FALSE = {"false", "0", "no", "off"}


def _coerce(raw: str, kind: str, column: str) -> Any:
    """Parse one value, or explain precisely which part was wrong."""
    try:
        if kind == "int":
            return int(raw)
        if kind == "float":
            return float(raw)
        if kind == "bool":
            lowered = raw.strip().lower()
            if lowered in _TRUE:
                return True
            if lowered in _FALSE:
                return False
            raise ValueError("expected true or false")
        if kind == "uuid":
            import uuid as _uuid

            return _uuid.UUID(raw)
        if kind == "date":
            return date.fromisoformat(raw)
        if kind == "datetime":
            # Accept a plain date too — "created_at after the 3rd" is the common ask.
            return datetime.fromisoformat(raw) if "T" in raw or " " in raw else date.fromisoformat(raw)
        return raw
    except (ValueError, AttributeError) as exc:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"{raw!r} is not a valid {kind} for {column!r} ({exc})",
        ) from exc


def build_condition(model: Any, allowed: dict[str, str], expression: str) -> ColumnElement[bool]:
    """Turn one `column:operator:value` string into a SQLAlchemy condition."""
    parts = expression.split(":", 2)
    if len(parts) < 2:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Filter {expression!r} must read column:operator:value",
        )

    name, operator = parts[0].strip(), parts[1].strip().lower()
    raw = parts[2] if len(parts) == 3 else ""

    if name not in allowed:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"{name!r} cannot be filtered on. Allowed: {', '.join(sorted(allowed))}",
        )
    if operator not in _OPERATORS:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"{operator!r} is not a supported operator. Use: {', '.join(sorted(_OPERATORS))}",
        )

    kind = allowed[name]
    column: Column = getattr(model, name)

    if operator in _TEXT_ONLY and kind != "str":
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"{operator!r} only applies to text columns, and {name!r} is {kind}",
        )

    if operator == "isnull":
        wants_null = _coerce(raw or "true", "bool", name)
        return column.is_(None) if wants_null else column.is_not(None)
    if operator == "in":
        values = [_coerce(v, kind, name) for v in raw.split(",") if v.strip()]
        if not values:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY, f"{name}:in needs at least one value"
            )
        return column.in_(values)

    # ilike rather than like: an admin typing "gasabo" means Gasabo.
    if operator == "contains":
        return column.ilike(f"%{raw}%")
    if operator == "startswith":
        return column.ilike(f"{raw}%")
    if operator == "endswith":
        return column.ilike(f"%{raw}")

    value = _coerce(raw, kind, name)

    # Branches rather than a dict of comparisons: a dict literal builds every
    # value before one is chosen, and SQLAlchemy raises on `column > True` — so
    # a perfectly valid `is_verified:eq:true` blew up while constructing the
    # ordering operators it was never going to use.
    if operator == "eq":
        return column.is_(value) if isinstance(value, bool) else column == value
    if operator == "ne":
        return column.is_not(value) if isinstance(value, bool) else column != value
    if operator == "gt":
        return column > value
    if operator == "gte":
        return column >= value
    if operator == "lt":
        return column < value
    return column <= value


def apply_filters(
    stmt: Any, model: Any, allowed: dict[str, str], expressions: list[str] | None, match: str = "all"
) -> Any:
    """AND (or OR) every expression onto an existing select."""
    if not expressions:
        return stmt
    conditions = [build_condition(model, allowed, e) for e in expressions if e.strip()]
    if not conditions:
        return stmt
    combined = or_(*conditions) if match == "any" else and_(*conditions)
    return stmt.where(combined)


def describe(allowed: dict[str, str]) -> list[dict[str, Any]]:
    """What the console renders its filter builder from."""
    return [
        {
            "column": name,
            "kind": kind,
            "operators": sorted(_OPERATORS - (set() if kind == "str" else _TEXT_ONLY)),
        }
        for name, kind in sorted(allowed.items())
    ]


__all__ = ["PROPERTY_FILTERS", "apply_filters", "build_condition", "describe", "not_"]
