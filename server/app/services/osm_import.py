"""Pull nearby infrastructure from OpenStreetMap.

Distances to schools, roads and wetlands are only as good as the places we know
about, and nobody is going to key them in by hand. Overpass is the practical
source for Rwanda: it is current, it is free, and its tagging for the things
buyers ask about is good.

Run it per district rather than for the whole country — Overpass is a shared
public service and a nationwide query for every tag at once is both slow and
rude. `python -m app.services.osm_import --district Gasabo` is the intended use.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
from typing import Any

import httpx
from sqlalchemy import func, select, text
from sqlalchemy.dialects.postgresql import insert

from app.core.database import SessionLocal
from app.models.facility import Facility

logger = logging.getLogger("evaramu.osm")

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

#: OSM tag → our kind. The left side is `key=value` as OSM writes it; several
#: tags can map to one kind, which is why this is a list of pairs rather than a
#: dict keyed by kind.
TAG_MAP: list[tuple[str, str, str]] = [
    # key,          value,              our kind
    ("amenity", "school", "school"),
    ("amenity", "college", "school"),
    ("amenity", "kindergarten", "school"),
    ("amenity", "university", "university"),
    ("amenity", "hospital", "hospital"),
    ("amenity", "clinic", "clinic"),
    ("amenity", "doctors", "clinic"),
    ("amenity", "pharmacy", "pharmacy"),
    ("amenity", "marketplace", "market"),
    ("amenity", "bank", "bank"),
    ("amenity", "atm", "bank"),
    ("amenity", "restaurant", "restaurant"),
    ("amenity", "cafe", "restaurant"),
    ("amenity", "bar", "bar"),
    ("amenity", "pub", "bar"),
    ("amenity", "nightclub", "bar"),
    ("amenity", "place_of_worship", "place_of_worship"),
    ("amenity", "police", "police"),
    ("amenity", "fire_station", "fire_station"),
    ("amenity", "post_office", "post_office"),
    ("amenity", "fuel", "fuel"),
    ("amenity", "bus_station", "bus_station"),
    ("amenity", "taxi", "taxi_stand"),
    ("amenity", "townhall", "government"),
    ("amenity", "grave_yard", "cemetery"),
    ("highway", "bus_stop", "bus_station"),
    ("public_transport", "station", "bus_station"),
    ("shop", "*", "shop"),
    ("tourism", "hotel", "hotel"),
    ("tourism", "guest_house", "hotel"),
    ("office", "government", "government"),
    ("aeroway", "aerodrome", "airport"),
    ("landuse", "cemetery", "cemetery"),
    ("landuse", "industrial", "industrial"),
    ("landuse", "quarry", "quarry"),
    ("landuse", "landfill", "landfill"),
    ("landuse", "forest", "forest"),
    ("leisure", "park", "park"),
    ("natural", "wetland", "wetland"),
    ("natural", "water", "lake"),
    ("natural", "wood", "forest"),
    ("waterway", "river", "river"),
    ("waterway", "stream", "river"),
    ("power", "line", "power_line"),
]

#: Road classes worth measuring to. A footpath is not what "near a road" means
#: when the question is whether a lorry can deliver blocks to the site.
ROAD_CLASSES = ("motorway", "trunk", "primary", "secondary", "tertiary", "unclassified",
                "residential")


def _overpass_query(south: float, west: float, north: float, east: float) -> str:
    bbox = f"{south},{west},{north},{east}"
    parts: list[str] = []
    seen: set[str] = set()
    for key, value, _ in TAG_MAP:
        selector = f'["{key}"]' if value == "*" else f'["{key}"="{value}"]'
        if selector in seen:
            continue
        seen.add(selector)
        for element in ("node", "way", "relation"):
            parts.append(f"  {element}{selector}({bbox});")
    for cls in ROAD_CLASSES:
        parts.append(f'  way["highway"="{cls}"]({bbox});')

    body = "\n".join(parts)
    # `out center` gives ways and relations a single representative point, which
    # keeps the response small; geometry is fetched for areas that need it.
    return f"[out:json][timeout:180];\n(\n{body}\n);\nout center tags;"


def _classify(tags: dict[str, str]) -> tuple[str, str | None] | None:
    if "highway" in tags and tags["highway"] in ROAD_CLASSES:
        return "road", tags["highway"]
    for key, value, kind in TAG_MAP:
        if key not in tags:
            continue
        if value == "*" or tags[key] == value:
            return kind, tags[key] if value == "*" else None
    return None


#: Overpass refuses a generic client outright with 406 — it wants to know who is
#: asking, so a run that hammers it can be traced back and told to stop.
USER_AGENT = "EvaramuGroup/1.0 (+https://evaramu.rw; tech@nexventures.net)"


#: Overpass answers 429 when it is busy and 504 when a query is too heavy for
#: the slot it was given. Both clear on their own; both are fatal to an import
#: that gives up on the first one.
RETRY_STATUSES = (429, 502, 503, 504)


async def fetch(
    south: float, west: float, north: float, east: float, attempts: int = 4
) -> list[dict[str, Any]]:
    query = _overpass_query(south, west, north, east)
    async with httpx.AsyncClient(timeout=300, headers={"User-Agent": USER_AGENT}) as client:
        for attempt in range(1, attempts + 1):
            response = await client.post(OVERPASS_URL, data={"data": query})
            if response.status_code in RETRY_STATUSES and attempt < attempts:
                # Backing off further each time — a public instance that just
                # said "too many requests" is not helped by asking again at once.
                wait = 20 * attempt
                logger.info("  Overpass returned %d, retrying in %ds", response.status_code, wait)
                await asyncio.sleep(wait)
                continue
            response.raise_for_status()
            return response.json().get("elements", [])
    return []


async def store(elements: list[dict[str, Any]], district: str | None = None) -> dict[str, int]:
    """Upsert what Overpass returned. Re-running updates rather than duplicates."""
    counts: dict[str, int] = {}
    rows: list[dict[str, Any]] = []

    for element in elements:
        tags = element.get("tags") or {}
        classified = _classify(tags)
        if not classified:
            continue
        kind, subkind = classified

        centre = element.get("center") or element
        lat, lon = centre.get("lat"), centre.get("lon")
        if lat is None or lon is None:
            continue

        rows.append({
            "name": (tags.get("name") or tags.get("operator") or "")[:200] or None,
            "kind": kind,
            "subkind": (subkind or "")[:60] or None,
            "geom": f"SRID=4326;POINT({lon} {lat})",
            "district": district,
            "source": "osm",
            "source_id": f"{element['type'][0]}{element['id']}",
            "tags": tags,
        })
        counts[kind] = counts.get(kind, 0) + 1

    if not rows:
        return counts

    async with SessionLocal() as db:
        # Chunked: a single statement with tens of thousands of rows is a
        # needlessly large transaction to hold open.
        for start in range(0, len(rows), 500):
            chunk = rows[start:start + 500]
            statement = insert(Facility).values(chunk)
            await db.execute(
                statement.on_conflict_do_update(
                    constraint="uq_facility_source",
                    set_={
                        "name": statement.excluded.name,
                        "kind": statement.excluded.kind,
                        "subkind": statement.excluded.subkind,
                        "geom": statement.excluded.geom,
                        "tags": statement.excluded.tags,
                        "updated_at": func.now(),
                    },
                )
            )
        await db.commit()

    return counts


async def import_bbox(south: float, west: float, north: float, east: float,
                      district: str | None = None) -> dict[str, int]:
    logger.info("querying Overpass for %s", district or f"{south},{west},{north},{east}")
    elements = await fetch(south, west, north, east)
    logger.info("%d elements returned", len(elements))
    return await store(elements, district)


async def import_around_listings(pad_km: float = 5.0) -> dict[str, int]:
    """Import around wherever we actually have parcels.

    Far cheaper than covering the country: the only places these distances are
    ever asked about are the places we have listings.
    """
    from app.models.property import Property

    async with SessionLocal() as db:
        box = (
            await db.execute(
                select(
                    func.min(Property.latitude), func.min(Property.longitude),
                    func.max(Property.latitude), func.max(Property.longitude),
                ).where(Property.latitude.isnot(None), Property.is_archived.is_(False))
            )
        ).one()

    if box[0] is None:
        logger.warning("no listings have coordinates yet — nothing to import around")
        return {}

    pad = pad_km / 111.0
    return await import_bbox(box[0] - pad, box[1] - pad, box[2] + pad, box[3] + pad)


#: Bounding boxes for all thirty districts.
#:
#: Deliberately generous — boxes overlap at the edges, and a place picked up
#: twice is deduplicated by its OSM id rather than stored twice. Missing a
#: school on a district border would be the worse failure.
DISTRICTS: dict[str, tuple[float, float, float, float]] = {
    # ---- Kigali City
    "Nyarugenge": (-2.02, 29.96, -1.88, 30.12),
    "Gasabo": (-1.99, 30.00, -1.74, 30.27),
    "Kicukiro": (-2.06, 30.04, -1.92, 30.21),
    # ---- Southern
    "Nyanza": (-2.47, 29.63, -2.23, 29.87),
    "Gisagara": (-2.67, 29.73, -2.38, 29.97),
    "Nyaruguru": (-2.80, 29.33, -2.48, 29.72),
    "Huye": (-2.70, 29.63, -2.43, 29.87),
    "Nyamagabe": (-2.62, 29.28, -2.28, 29.67),
    "Ruhango": (-2.32, 29.63, -2.03, 29.92),
    "Muhanga": (-2.22, 29.63, -1.93, 29.97),
    "Kamonyi": (-2.12, 29.83, -1.88, 30.12),
    # ---- Western
    "Karongi": (-2.22, 29.18, -1.88, 29.57),
    "Rutsiro": (-1.97, 29.18, -1.63, 29.57),
    "Rubavu": (-1.82, 29.18, -1.53, 29.47),
    "Nyabihu": (-1.82, 29.38, -1.53, 29.67),
    "Ngororero": (-2.07, 29.43, -1.73, 29.77),
    "Rusizi": (-2.67, 28.83, -2.28, 29.22),
    "Nyamasheke": (-2.47, 29.03, -2.08, 29.42),
    # ---- Northern
    "Rulindo": (-1.87, 29.88, -1.53, 30.17),
    "Gakenke": (-1.87, 29.63, -1.53, 29.97),
    "Musanze": (-1.62, 29.43, -1.33, 29.77),
    "Burera": (-1.62, 29.68, -1.28, 30.02),
    "Gicumbi": (-1.77, 29.93, -1.38, 30.27),
    # ---- Eastern
    "Rwamagana": (-2.12, 30.28, -1.83, 30.57),
    "Nyagatare": (-1.52, 30.13, -1.03, 30.62),
    "Gatsibo": (-1.87, 30.23, -1.43, 30.62),
    "Kayonza": (-2.07, 30.33, -1.58, 30.87),
    "Kirehe": (-2.47, 30.48, -2.03, 30.97),
    "Ngoma": (-2.37, 30.18, -2.03, 30.62),
    "Bugesera": (-2.47, 29.93, -2.03, 30.37),
}


async def import_all(pause_s: float = 8.0, only: list[str] | None = None) -> dict[str, int]:
    """Every district, one query at a time.

    Sequential with a pause between: Overpass is a shared public service, and a
    burst of thirty parallel nationwide queries is how an IP gets blocked. This
    takes a while — it is meant to be run once and then occasionally.
    """
    totals: dict[str, int] = {}
    wanted = {k: v for k, v in DISTRICTS.items() if only is None or k in only}
    for index, (name, box) in enumerate(wanted.items(), start=1):
        logger.info("[%d/%d] %s", index, len(wanted), name)
        try:
            counts = await import_bbox(*box, district=name)
        except Exception as exc:  # noqa: BLE001 - one bad district must not stop the rest
            logger.warning("  %s failed: %s", name, exc)
            continue
        for kind, count in counts.items():
            totals[kind] = totals.get(kind, 0) + count
        logger.info("  %s: %d places", name, sum(counts.values()))
        if index < len(wanted):
            await asyncio.sleep(pause_s)
    return totals


def main() -> None:
    parser = argparse.ArgumentParser(description="Import OSM facilities")
    parser.add_argument("--district", choices=sorted(DISTRICTS), help="a known district")
    parser.add_argument("--bbox", help="south,west,north,east")
    parser.add_argument("--around-listings", action="store_true",
                        help="cover wherever we currently have parcels")
    parser.add_argument("--all", action="store_true", help="every district in the country")
    parser.add_argument("--districts", help="comma-separated district names")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(message)s")

    if args.districts:
        wanted = [d.strip() for d in args.districts.split(",") if d.strip()]
        unknown = [d for d in wanted if d not in DISTRICTS]
        if unknown:
            parser.error(f"unknown district(s): {', '.join(unknown)}")
        counts = asyncio.run(import_all(only=wanted))
    elif args.all:
        counts = asyncio.run(import_all())
    elif args.around_listings:
        counts = asyncio.run(import_around_listings())
    elif args.district:
        counts = asyncio.run(import_bbox(*DISTRICTS[args.district], district=args.district))
    elif args.bbox:
        south, west, north, east = (float(v) for v in args.bbox.split(","))
        counts = asyncio.run(import_bbox(south, west, north, east))
    else:
        parser.error("pass --district, --bbox or --around-listings")
        return

    total = sum(counts.values())
    for kind, count in sorted(counts.items(), key=lambda kv: -kv[1]):
        print(f"  {kind:20} {count:6,}")
    print(f"  {'total':20} {total:6,}")


if __name__ == "__main__":
    main()
