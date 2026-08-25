"""The map: parcels as geography, and what surrounds them.

Everything a map view needs that the ordinary catalogue endpoints cannot give
it — outlines rather than cards, a viewport rather than a page, and distances
to the things that decide what a plot is worth.

Visibility is enforced here exactly as it is on the catalogue, plus one extra
rule: a listing whose seller withheld the pin (`show_on_map` off) never appears
on the map at all, in any form. There is no point publishing an outline that
places a parcel to the metre while claiming to withhold its location.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from geoalchemy2 import Geography
from sqlalchemy import and_, cast, func, or_, select
from sqlalchemy.dialects.postgresql import JSONB as _JSONB
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.facility import CONSTRAINT_KINDS, Facility
from app.models.property import MediaKind, Property, PropertyMedia, PropertySaleRecord
from app.services import property_service, spatial_service

router = APIRouter(prefix="/public/map", tags=["map"])

#: A viewport bigger than this is not a map view, it is a scrape.
MAX_SPAN_DEGREES = 6.0
#: Ceiling on how many outlines one viewport may return.
MAX_FEATURES = 400


def _visible() -> Any:
    """The predicate every map query starts from."""
    return and_(
        Property.status.in_(property_service.PUBLIC_STATUSES),
        Property.show_on_public.is_(True),
        Property.is_archived.is_(False),
        Property.show_on_map.is_(True),
        Property.centre_geom.isnot(None),
    )


def _feature(row: Any) -> dict:
    """One parcel as a GeoJSON feature.

    The outline is the geometry where there is one; a listing with only a pin
    still appears, as a point, rather than being silently dropped from the map.
    """
    return {
        "type": "Feature",
        "geometry": row.geometry,
        "properties": {
            "id": str(row.id),
            "slug": row.slug,
            "reference_number": row.reference_number,
            "title": row.title,
            "district": row.district,
            "sector": row.sector,
            "status": row.status.value if hasattr(row.status, "value") else row.status,
            "intent": row.intent.value if hasattr(row.intent, "value") else row.intent,
            "currency": row.currency,
            "price": float(row.price) if row.price is not None else None,
            "rent_amount": float(row.rent_amount) if row.rent_amount is not None else None,
            "size": row.size,
            "bedrooms": row.bedrooms,
            "cover_url": row.cover_url,
            "is_featured": row.is_featured,
            "is_verified": row.is_verified,
            "latitude": row.lat,
            "longitude": row.lng,
            "has_outline": row.geometry is not None and row.geometry.get("type") == "Polygon",
            "issue_count": len(row.boundary_issues or []),
            "allow_directions": row.allow_directions,
        },
    }


def _cover_url() -> Any:
    """The listing's cover photo, as a correlated subquery.

    `cover_url` is derived from the media rows rather than stored, so the map —
    which never loads the media relationship — has to reach for it directly. The
    flagged cover wins; failing that, the first image in display order.
    """
    return (
        select(PropertyMedia.url)
        .where(
            PropertyMedia.property_id == Property.id,
            PropertyMedia.kind == MediaKind.IMAGE,
        )
        .order_by(PropertyMedia.is_cover.desc(), PropertyMedia.display_order)
        .limit(1)
        .correlate(Property)
        .scalar_subquery()
    )


def _selection() -> Any:
    """Columns every map query returns, including the geometry as GeoJSON."""
    return select(
        Property.id,
        Property.slug,
        Property.reference_number,
        Property.title,
        Property.district,
        Property.sector,
        Property.status,
        Property.intent,
        Property.currency,
        Property.price,
        Property.rent_amount,
        Property.size,
        Property.bedrooms,
        _cover_url().label("cover_url"),
        Property.is_featured,
        Property.is_verified,
        Property.boundary_issues,
        Property.allow_directions,
        func.ST_Y(Property.centre_geom).label("lat"),
        func.ST_X(Property.centre_geom).label("lng"),
        # `ST_AsGeoJSON` returns text; the cast makes asyncpg hand back a dict
        # so the response is not a string of JSON inside JSON.
        func.cast(
            func.coalesce(
                func.ST_AsGeoJSON(Property.boundary_geom),
                func.ST_AsGeoJSON(Property.centre_geom),
            ),
            _JSONB,
        ).label("geometry"),
    )


@router.get("/properties", summary="Parcels in a map viewport, as GeoJSON")
async def parcels_in_view(
    db: Annotated[AsyncSession, Depends(get_db)],
    bbox: Annotated[
        str | None,
        Query(description="`west,south,east,north` in degrees — the visible map"),
    ] = None,
    intent: str | None = None,
    category_id: uuid.UUID | None = None,
    district: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    min_size: float | None = None,
    max_size: float | None = None,
    limit: Annotated[int, Query(le=MAX_FEATURES)] = MAX_FEATURES,
) -> dict:
    query = _selection().where(_visible())

    if bbox:
        try:
            west, south, east, north = (float(v) for v in bbox.split(","))
        except ValueError:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "bbox must be four numbers: west,south,east,north",
            ) from None
        if abs(east - west) > MAX_SPAN_DEGREES or abs(north - south) > MAX_SPAN_DEGREES:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY, "That viewport is too large"
            )
        envelope = func.ST_MakeEnvelope(west, south, east, north, 4326)
        query = query.where(func.ST_Intersects(Property.centre_geom, envelope))

    if intent:
        query = query.where(Property.intent == intent)
    if category_id:
        query = query.where(Property.category_id == category_id)
    if district:
        query = query.where(Property.district.ilike(district))
    if min_price is not None:
        query = query.where(Property.price >= min_price)
    if max_price is not None:
        query = query.where(Property.price <= max_price)
    if min_size is not None:
        query = query.where(Property.size >= min_size)
    if max_size is not None:
        query = query.where(Property.size <= max_size)

    rows = (await db.execute(query.limit(limit))).all()
    return {
        "type": "FeatureCollection",
        "features": [_feature(r) for r in rows],
        # Tells the client the viewport was clipped rather than exhausted, so it
        # can say "zoom in to see the rest" instead of "12 results".
        "truncated": len(rows) >= limit,
    }


@router.get("/nearby", summary="Parcels near a point on the map")
async def parcels_near_point(
    db: Annotated[AsyncSession, Depends(get_db)],
    lat: Annotated[float, Query(ge=-90, le=90)],
    lng: Annotated[float, Query(ge=-180, le=180)],
    radius_m: Annotated[int, Query(ge=50, le=50_000)] = 2_000,
    limit: Annotated[int, Query(le=100)] = 30,
) -> dict:
    """What is for sale around where the buyer just clicked."""
    point = func.ST_SetSRID(func.ST_MakePoint(lng, lat), 4326)
    distance = func.ST_Distance(cast(Property.centre_geom, Geography), cast(point, Geography))

    query = (
        _selection()
        .add_columns(distance.label("distance_m"))
        .where(
            _visible(),
            func.ST_DWithin(cast(Property.centre_geom, Geography), cast(point, Geography), radius_m),
        )
        .order_by(distance)
        .limit(limit)
    )
    rows = (await db.execute(query)).all()

    features = []
    for row in rows:
        feature = _feature(row)
        feature["properties"]["distance_m"] = round(float(row.distance_m))
        features.append(feature)

    return {"type": "FeatureCollection", "features": features,
            "centre": {"latitude": lat, "longitude": lng, "radius_m": radius_m}}


@router.get("/facilities", summary="Infrastructure in a viewport")
async def facilities_in_view(
    db: Annotated[AsyncSession, Depends(get_db)],
    bbox: Annotated[str, Query(description="`west,south,east,north`")],
    kinds: Annotated[str | None, Query(description="comma-separated kinds")] = None,
    limit: Annotated[int, Query(le=1000)] = 500,
) -> dict:
    try:
        west, south, east, north = (float(v) for v in bbox.split(","))
    except ValueError:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "bbox must be west,south,east,north"
        ) from None

    envelope = func.ST_MakeEnvelope(west, south, east, north, 4326)
    query = (
        select(
            Facility.id, Facility.name, Facility.kind, Facility.subkind,
            func.ST_Y(func.ST_PointOnSurface(Facility.geom)).label("lat"),
            func.ST_X(func.ST_PointOnSurface(Facility.geom)).label("lng"),
        )
        .where(Facility.is_active.is_(True), func.ST_Intersects(Facility.geom, envelope))
        .limit(limit)
    )
    if kinds:
        wanted = [k.strip() for k in kinds.split(",") if k.strip()]
        query = query.where(Facility.kind.in_(wanted))
    else:
        # Roads dominate by an order of magnitude and are already drawn by the
        # basemap, so they are opt-in rather than default.
        query = query.where(Facility.kind != "road")

    rows = (await db.execute(query)).all()
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [r.lng, r.lat]},
                "properties": {
                    "id": str(r.id), "name": r.name, "kind": r.kind, "subkind": r.subkind,
                    "is_constraint": r.kind in {k.value for k in CONSTRAINT_KINDS},
                },
            }
            for r in rows
        ],
    }


# ------------------------------------------------------------ proximity search
#: What a buyer can search by, and how each is measured. `prefer` says whether
#: being close is the point ("near a school") or the risk ("near a wetland").
SEARCHABLE = {
    "school": "near", "hospital": "near", "clinic": "near", "pharmacy": "near",
    "market": "near", "shop": "near", "bank": "near", "restaurant": "near",
    "bar": "near", "hotel": "near", "place_of_worship": "near",
    "bus_station": "near", "taxi_stand": "near", "fuel": "near", "airport": "near",
    "road": "near", "police": "near", "university": "near", "park": "near",
    "wetland": "away", "river": "away", "lake": "away", "quarry": "away",
    "landfill": "away", "power_line": "away", "cemetery": "away",
    "industrial": "away", "forest": "near",
}


def _parse_criteria(raw: str) -> list[tuple[str, str, int]]:
    """Read `school:1000,wetland:-200` into (kind, direction, metres).

    A positive distance means *within* — "a school inside a kilometre". A
    negative one means *beyond* — "at least 200 m from any wetland". One
    parameter covers both because a buyer thinks about them the same way: a
    thing, and how far.
    """
    out: list[tuple[str, str, int]] = []
    for chunk in raw.split(","):
        chunk = chunk.strip()
        if not chunk:
            continue
        kind, _, distance = chunk.partition(":")
        kind = kind.strip().lower()
        if kind not in SEARCHABLE:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                f"'{kind}' is not something we can measure. "
                f"Try one of: {', '.join(sorted(SEARCHABLE))}",
            )
        try:
            metres = int(distance) if distance else 1_000
        except ValueError:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                f"'{distance}' is not a distance in metres",
            ) from None
        out.append((kind, "within" if metres >= 0 else "beyond", abs(metres)))
    return out


def _matches_criterion(kind: str, direction: str, metres: int) -> Any:
    """An EXISTS/NOT EXISTS clause for one criterion."""
    near = (
        select(Facility.id)
        .where(
            Facility.is_active.is_(True),
            Facility.kind == kind,
            func.ST_DWithin(
                cast(Facility.geom, Geography),
                cast(Property.centre_geom, Geography),
                metres,
            ),
        )
        .exists()
    )
    # "Beyond 200 m from a wetland" is exactly "no wetland within 200 m", which
    # the same index answers — no second query shape needed.
    return near if direction == "within" else ~near


@router.get("/search", summary="Find parcels by what is around them")
async def search_by_surroundings(
    db: Annotated[AsyncSession, Depends(get_db)],
    near: Annotated[
        str,
        Query(description="`school:1000,road:300,wetland:-200` — metres; negative means *beyond*"),
    ],
    intent: str | None = None,
    district: str | None = None,
    max_price: float | None = None,
    min_size: float | None = None,
    limit: Annotated[int, Query(le=200)] = 60,
) -> dict:
    """Search on surroundings rather than on the listing's own attributes.

    When nothing satisfies every criterion the search does not come back empty.
    It relaxes them one at a time, hardest first, and reports which ones it had
    to drop — a buyer looking for the impossible is better served by the closest
    real thing plus an honest note than by "no results".
    """
    criteria = _parse_criteria(near)
    if not criteria:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "No criteria given")

    base = _selection().where(_visible())
    if intent:
        base = base.where(Property.intent == intent)
    if district:
        base = base.where(Property.district.ilike(district))
    if max_price is not None:
        base = base.where(Property.price <= max_price)
    if min_size is not None:
        base = base.where(Property.size >= min_size)

    async def run(active: list[tuple[str, str, int]]) -> list[Any]:
        query = base
        for kind, direction, metres in active:
            query = query.where(_matches_criterion(kind, direction, metres))
        return (await db.execute(query.limit(limit))).all()

    applied = list(criteria)
    relaxed: list[dict] = []
    rows = await run(applied)

    # Drop criteria from the end of the list — callers put what matters most
    # first, and this keeps that promise.
    while not rows and applied:
        kind, direction, metres = applied.pop()
        relaxed.append({"kind": kind, "direction": direction, "distance_m": metres})
        rows = await run(applied)

    features = [_feature(r) for r in rows]
    return {
        "type": "FeatureCollection",
        "features": features,
        "matched": [
            {"kind": k, "direction": d, "distance_m": m} for k, d, m in applied
        ],
        "relaxed": relaxed,
        "exact": not relaxed,
    }


# ------------------------------------------------------- one parcel in context
async def _visible_parcel(db: AsyncSession, slug: str) -> Property:
    prop = await db.scalar(
        select(Property).where(
            or_(Property.slug == slug, Property.reference_number == slug.upper()),
            Property.status.in_(property_service.PUBLIC_STATUSES),
            Property.show_on_public.is_(True),
            Property.is_archived.is_(False),
        )
    )
    if prop is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Property not found")
    return prop


@router.get("/context/{slug}", summary="What surrounds one parcel, and what is odd about it")
async def parcel_context(
    slug: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    radius_m: Annotated[int, Query(ge=200, le=20_000)] = 5_000,
) -> dict:
    prop = await _visible_parcel(db, slug)

    # A seller who withheld the pin gets the shape report but no surroundings —
    # a list of what is 300 m away would place the parcel just as precisely.
    if not prop.show_on_map:
        return {
            "slug": prop.slug,
            "location_withheld": True,
            "facilities": [],
            "boundary": {"issues": prop.boundary_issues or [], "geometry": None},
            "overlaps": [],
        }

    facilities = await spatial_service.nearby_facilities(db, prop, radius_m=radius_m)

    return {
        "slug": prop.slug,
        "location_withheld": False,
        "latitude": prop.latitude,
        "longitude": prop.longitude,
        "allow_directions": prop.allow_directions,
        "boundary": {
            "geometry": prop.boundary_geojson,
            "area_sqm": prop.boundary_area_sqm,
            "declared_size": prop.size,
            "issues": prop.boundary_issues or [],
        },
        "facilities": facilities,
        "summary": _summarise(facilities),
        "overlaps": await spatial_service.overlapping_listings(db, prop),
    }


def _summarise(facilities: list[dict]) -> dict:
    """The nearest of each kind, which is what a buyer actually reads."""
    nearest: dict[str, dict] = {}
    for facility in facilities:
        if facility["kind"] not in nearest:
            nearest[facility["kind"]] = {
                "name": facility["name"],
                "distance_m": facility["distance_m"],
                "walk_minutes": facility["walk_minutes"],
                "is_constraint": facility["is_constraint"],
            }
    return nearest


# ----------------------------------------------------------------- comparison
#: How each fact is judged when parcels are set side by side. `lower` means a
#: smaller number wins; `higher` the reverse. Weight is how much it counts.
#: Two figures within this fraction of each other are treated as equal. Real
#: differences in land are not measured to the metre.
TIE_TOLERANCE = 0.02

COMPARISON_RULES: list[tuple[str, str, float, str]] = [
    ("price_per_sqm", "lower", 2.0, "Price per square metre"),
    ("size", "higher", 1.0, "Plot size"),
    ("road", "lower", 2.0, "Distance to a road"),
    ("school", "lower", 1.5, "Distance to a school"),
    ("hospital", "lower", 1.5, "Distance to a hospital"),
    ("market", "lower", 1.0, "Distance to a market"),
    ("bus_station", "lower", 1.0, "Distance to public transport"),
    ("pharmacy", "lower", 0.5, "Distance to a pharmacy"),
    ("wetland", "higher", 2.0, "Distance from a wetland"),
    ("landfill", "higher", 1.0, "Distance from a landfill"),
    ("quarry", "higher", 1.0, "Distance from a quarry"),
    ("power_line", "higher", 0.5, "Distance from a power line"),
    ("compactness", "higher", 1.0, "How buildable the shape is"),
    ("issue_count", "lower", 1.5, "Boundary problems"),
]


@router.get("/compare", summary="Set parcels side by side on the facts")
async def compare_parcels(
    db: Annotated[AsyncSession, Depends(get_db)],
    slugs: Annotated[str, Query(description="two to five slugs or references, comma-separated")],
) -> dict:
    """Compare parcels on measured facts rather than on adjectives.

    Every row is something the database can check. Where a parcel simply has no
    figure — no school within range, no outline to measure — it neither wins nor
    loses that row, because an absent measurement is not a bad one.
    """
    wanted = [s.strip() for s in slugs.split(",") if s.strip()][:5]
    if len(wanted) < 2:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, "Give at least two parcels to compare"
        )

    entries: list[dict] = []
    for slug in wanted:
        prop = await _visible_parcel(db, slug)
        facilities = (
            await spatial_service.nearby_facilities(db, prop, per_kind=1)
            if prop.show_on_map
            else []
        )
        nearest = {f["kind"]: f["distance_m"] for f in facilities}

        price = float(prop.price) if prop.price is not None else None
        facts: dict[str, float | None] = {
            "price": price,
            "size": prop.size,
            "price_per_sqm": round(price / prop.size, 1) if price and prop.size else None,
            "compactness": None,
            "issue_count": len(prop.boundary_issues or []),
            **{kind: nearest.get(kind) for kind, *_ in
               [(k,) for k, _, _, _ in COMPARISON_RULES] if kind in SEARCHABLE},
        }
        if prop.boundary_points:
            from app.services import geometry_service as geo

            score = geo.compactness(prop.boundary_points)
            facts["compactness"] = round(score, 3) if score is not None else None

        entries.append({
            "slug": prop.slug,
            "reference_number": prop.reference_number,
            "title": prop.title,
            "district": prop.district,
            "cover_url": _cover_of(prop),
            "currency": prop.currency,
            "location_withheld": not prop.show_on_map,
            "facts": facts,
        })

    rows, scores = _score(entries)
    ranked = sorted(scores.items(), key=lambda kv: -kv[1])
    return {
        "parcels": entries,
        "rows": rows,
        "scores": scores,
        "winner": ranked[0][0] if ranked and ranked[0][1] > 0 else None,
        # A tie is a real answer, and worth saying out loud rather than picking
        # one arbitrarily.
        "tied": len(ranked) > 1 and ranked[0][1] == ranked[1][1],
    }


def _score(entries: list[dict]) -> tuple[list[dict], dict[str, float]]:
    scores = {e["slug"]: 0.0 for e in entries}
    rows: list[dict] = []

    for key, direction, weight, label in COMPARISON_RULES:
        values = {e["slug"]: e["facts"].get(key) for e in entries}
        present = {s: v for s, v in values.items() if v is not None}
        if len(present) < 2:
            continue

        best = min(present.values()) if direction == "lower" else max(present.values())
        # A difference too small to matter is not a win. Two parcels 402 m and
        # 400 m from a school are the same distance from that school, and
        # awarding a point for the 2 m would make the verdict noise.
        margin = abs(best) * TIE_TOLERANCE
        winners = [s for s, v in present.items() if abs(v - best) <= margin]
        # A row everyone ties on separates nobody, so it scores nobody.
        if len(winners) == len(entries):
            winners = []
        for slug in winners:
            scores[slug] += weight

        rows.append({
            "key": key,
            "label": label,
            "direction": direction,
            "weight": weight,
            "values": values,
            "winners": winners,
        })

    return rows, {s: round(v, 2) for s, v in scores.items()}


def _cover_of(prop: Property) -> str | None:
    """Cover photo for an ORM-loaded listing, without touching the relationship."""
    media = prop.__dict__.get("media")
    if not media:
        return None
    images = [m for m in media if m.kind is MediaKind.IMAGE]
    if not images:
        return None
    images.sort(key=lambda m: (not m.is_cover, m.display_order))
    return images[0].url


# ------------------------------------------------------------- sold history
@router.get("/sold", summary="What has already sold around here, and for how much")
async def sold_nearby(
    db: Annotated[AsyncSession, Depends(get_db)],
    bbox: Annotated[str | None, Query(description="`west,south,east,north`")] = None,
    months: Annotated[int, Query(ge=1, le=120)] = 36,
    limit: Annotated[int, Query(le=300)] = 150,
) -> dict:
    """Comparable sales, drawn from the sale history.

    What a parcel is being asked for is an opinion; what the one next door
    actually went for is a fact, and it is the single most useful thing we can
    put on a buyer's map. Only the figure, the month and the location leave the
    console — never who bought or sold.
    """
    since = datetime.now(timezone.utc) - timedelta(days=months * 30)

    # The sale record keeps its own snapshot, but the position has to come from
    # the property it closed out — archived rows keep their geometry.
    query = (
        select(
            PropertySaleRecord.id,
            PropertySaleRecord.reference_number,
            PropertySaleRecord.title,
            PropertySaleRecord.district,
            PropertySaleRecord.sector,
            PropertySaleRecord.size,
            PropertySaleRecord.sold_price,
            PropertySaleRecord.currency,
            PropertySaleRecord.sold_at,
            func.ST_Y(Property.centre_geom).label("lat"),
            func.ST_X(Property.centre_geom).label("lng"),
        )
        .join(Property, Property.id == PropertySaleRecord.property_id)
        .where(
            PropertySaleRecord.sold_at >= since,
            PropertySaleRecord.sold_price.isnot(None),
            Property.centre_geom.isnot(None),
            # A seller who withheld the pin while listing did not agree to it
            # being published the moment the sale completes.
            Property.show_on_map.is_(True),
        )
        .order_by(PropertySaleRecord.sold_at.desc())
        .limit(limit)
    )

    if bbox:
        try:
            west, south, east, north = (float(v) for v in bbox.split(","))
        except ValueError:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY, "bbox must be west,south,east,north"
            ) from None
        query = query.where(
            func.ST_Intersects(
                Property.centre_geom, func.ST_MakeEnvelope(west, south, east, north, 4326)
            )
        )

    rows = (await db.execute(query)).all()
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [r.lng, r.lat]},
                "properties": {
                    "id": str(r.id),
                    "reference_number": r.reference_number,
                    "title": r.title,
                    "district": r.district,
                    "sector": r.sector,
                    "size": r.size,
                    "sold_price": float(r.sold_price),
                    "price_per_sqm": round(float(r.sold_price) / r.size, 1) if r.size else None,
                    "currency": r.currency,
                    "sold_at": r.sold_at.isoformat(),
                },
            }
            for r in rows
        ],
    }


@router.get("/activity", summary="Where we are actually selling")
async def market_activity(
    db: Annotated[AsyncSession, Depends(get_db)],
    months: Annotated[int, Query(ge=1, le=120)] = 36,
) -> dict:
    """Sector-level activity: how much is on the market, and what has sold.

    Rendered as a heat layer so a buyer can see at a glance which corridors are
    moving. Sectors are the right grain — a district is too coarse to say
    anything useful about price, and a parcel too fine to say anything about a
    trend.
    """
    since = datetime.now(timezone.utc) - timedelta(days=months * 30)

    live = (
        await db.execute(
            select(
                Property.district,
                Property.sector,
                func.count().label("listings"),
                func.avg(Property.price / func.nullif(Property.size, 0)).label("asking_per_sqm"),
                func.avg(func.ST_Y(Property.centre_geom)).label("lat"),
                func.avg(func.ST_X(Property.centre_geom)).label("lng"),
            )
            .where(_visible(), Property.sector.isnot(None))
            .group_by(Property.district, Property.sector)
        )
    ).all()

    sold = (
        await db.execute(
            select(
                PropertySaleRecord.district,
                PropertySaleRecord.sector,
                func.count().label("sales"),
                func.avg(
                    PropertySaleRecord.sold_price / func.nullif(PropertySaleRecord.size, 0)
                ).label("sold_per_sqm"),
            )
            .where(
                PropertySaleRecord.sold_at >= since,
                PropertySaleRecord.sold_price.isnot(None),
                PropertySaleRecord.sector.isnot(None),
            )
            .group_by(PropertySaleRecord.district, PropertySaleRecord.sector)
        )
    ).all()

    sold_by_sector = {(r.district, r.sector): r for r in sold}

    features = []
    for row in live:
        if row.lat is None:
            continue
        match = sold_by_sector.get((row.district, row.sector))
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [row.lng, row.lat]},
            "properties": {
                "district": row.district,
                "sector": row.sector,
                "listings": row.listings,
                "sales": match.sales if match else 0,
                "asking_per_sqm": round(float(row.asking_per_sqm), 1) if row.asking_per_sqm else None,
                "sold_per_sqm": (
                    round(float(match.sold_per_sqm), 1) if match and match.sold_per_sqm else None
                ),
            },
        })

    return {"type": "FeatureCollection", "features": features}
