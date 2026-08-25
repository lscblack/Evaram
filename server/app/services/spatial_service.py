"""Spatial questions about a parcel, answered by the database.

Everything here leans on PostGIS rather than on arithmetic in Python. Distance
between two points on a sphere is easy to get slightly wrong by hand, and
"slightly wrong" is not good enough when the answer decides whether a plot is
inside a wetland buffer.

Distances are metres, computed on the *geography* type so they are true ground
distances rather than degrees.
"""

from __future__ import annotations

import json
from typing import Any

from geoalchemy2 import Geography
from sqlalchemy import cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.facility import CONSTRAINT_KINDS, Facility
from app.models.property import Property, PropertyStatus
from app.services import geometry_service as geo

#: How far out to look for facilities before deciding there are none nearby.
DEFAULT_RADIUS_M = 5_000
#: Roads are everywhere; anything beyond this is not "near a road" in any
#: useful sense and the query is faster for saying so.
ROAD_RADIUS_M = 3_000


# ------------------------------------------------------------------ keeping
# the geometry columns in step with what the agent typed
def refresh_geometry(prop: Property) -> None:
    """Rebuild every derived geometry field from `boundary_points`.

    Called on create and on update so the outline the browser draws, the
    geometry the database searches, the area, the centre pin and the shape
    warnings can never drift apart. The typed corners are the single source of
    truth; everything else here is derived from them.
    """
    ring = prop.boundary_points or []

    if len(ring) < 3:
        prop.boundary_geom = None
        prop.centre_geom = None
        prop.boundary_geojson = None
        prop.boundary_issues = None
        return

    polygon = geo.to_geojson(ring)
    prop.boundary_geojson = polygon
    # `ST_MakeValid` rather than a plain cast: a boundary that crosses itself is
    # still worth storing and showing — the shape warnings tell the buyer about
    # it — but an invalid geometry would make every later spatial query error.
    prop.boundary_geom = func.ST_MakeValid(
        func.ST_SetSRID(func.ST_GeomFromGeoJSON(json.dumps(polygon)), 4326)
    )
    prop.centre_geom = func.ST_PointOnSurface(prop.boundary_geom)

    analysis = geo.analyse_shape(ring, declared_size=prop.size)
    prop.boundary_issues = analysis["issues"] or None
    measured = analysis["metrics"].get("area_sqm")
    if measured:
        prop.boundary_area_sqm = measured

    centre = geo.centroid(ring)
    if centre:
        # A typed pin is kept where it is — an agent standing at the gate knows
        # better than the centre of a polygon where the entrance is. But a pin
        # that falls outside the boundary is not a refinement, it is left over
        # from a previous shape, and leaving it there would put the listing on
        # the map in one district while its outline sits in another.
        stale = prop.latitude is None or prop.longitude is None or not geo.contains(
            ring, prop.latitude, prop.longitude
        )
        if stale:
            prop.latitude = round(centre[0], 7)
            prop.longitude = round(centre[1], 7)


def origin_of(prop: Property) -> Any | None:
    """The geometry to measure *from*: the outline if there is one, else the pin.

    Taken as a subquery on the row rather than as the loaded geometry object.
    A geometry read back from the database is WKB, and handing that to Postgres
    as a bind parameter has it parsed as text — the shape survives the round
    trip only if it never leaves the database in the first place.
    """
    if prop.boundary_geom is not None:
        return (
            select(Property.boundary_geom).where(Property.id == prop.id).scalar_subquery()
        )
    if prop.latitude is not None and prop.longitude is not None:
        return func.ST_SetSRID(func.ST_MakePoint(prop.longitude, prop.latitude), 4326)
    return None


# ---------------------------------------------------------------- proximity
async def nearby_facilities(
    db: AsyncSession,
    prop: Property,
    *,
    radius_m: int = DEFAULT_RADIUS_M,
    per_kind: int = 3,
) -> list[dict]:
    """What is around this parcel, and how far away, nearest first.

    Measured edge to edge rather than centre to centre: the distance that
    matters for a wetland is to its boundary, not to the middle of it.
    """
    origin = origin_of(prop)
    if origin is None:
        return []

    # Cast to geography so ST_Distance returns metres on the ground rather
    # than degrees, which mean different distances at different latitudes.
    geog = cast(origin, Geography)
    distance = func.ST_Distance(cast(Facility.geom, Geography), geog)

    # One query, ranked per kind, so a hundred nearby shops cannot crowd out the
    # single nearby hospital.
    ranked = (
        select(
            Facility.id,
            Facility.name,
            Facility.kind,
            Facility.subkind,
            distance.label("distance_m"),
            func.ST_Y(func.ST_PointOnSurface(Facility.geom)).label("lat"),
            func.ST_X(func.ST_PointOnSurface(Facility.geom)).label("lng"),
            func.row_number()
            .over(partition_by=Facility.kind, order_by=distance)
            .label("rank"),
        )
        .where(
            Facility.is_active.is_(True),
            func.ST_DWithin(cast(Facility.geom, Geography), geog, radius_m),
        )
        .subquery()
    )

    rows = (
        await db.execute(
            select(ranked).where(ranked.c.rank <= per_kind).order_by(ranked.c.distance_m)
        )
    ).all()

    return [
        {
            "id": str(r.id),
            "name": r.name,
            "kind": r.kind,
            "subkind": r.subkind,
            "distance_m": round(float(r.distance_m)),
            "walk_minutes": _walk_minutes(float(r.distance_m)),
            "latitude": r.lat,
            "longitude": r.lng,
            #: Whether being *close* is good news or a constraint to check.
            "is_constraint": r.kind in {k.value for k in CONSTRAINT_KINDS},
        }
        for r in rows
    ]


def _walk_minutes(metres: float) -> int | None:
    """Rough walking time at 5 km/h. Omitted past 3 km, where nobody walks."""
    if metres > 3_000:
        return None
    return max(1, round(metres / 83.3))


async def overlapping_listings(db: AsyncSession, prop: Property) -> list[dict]:
    """Other live listings whose outline overlaps this one.

    Two parcels on the market claiming the same ground is the single most
    consequential thing a boundary can tell us, so it is checked against the
    database rather than inferred from the shape alone.
    """
    if prop.boundary_geom is None:
        return []

    mine = select(Property.boundary_geom).where(Property.id == prop.id).scalar_subquery()
    overlap_area = func.ST_Area(
        cast(func.ST_Intersection(Property.boundary_geom, mine), Geography)
    )
    rows = (
        await db.execute(
            select(
                Property.id,
                Property.reference_number,
                Property.title,
                Property.slug,
                overlap_area.label("overlap_sqm"),
            ).where(
                Property.id != prop.id,
                Property.is_archived.is_(False),
                Property.boundary_geom.isnot(None),
                func.ST_Overlaps(Property.boundary_geom, mine),
            )
        )
    ).all()

    return [
        {
            "id": str(r.id),
            "reference_number": r.reference_number,
            "title": r.title,
            "slug": r.slug,
            "overlap_sqm": round(float(r.overlap_sqm or 0), 1),
        }
        for r in rows
        # A shared boundary line produces a hairline intersection that is an
        # artefact of survey precision, not two people selling the same land.
        if float(r.overlap_sqm or 0) > 1.0
    ]
