"""Import Rwanda's administrative geography from geoBoundaries.

Provinces, districts and sectors, with their boundaries. Run once and then only
when the boundaries change — which for administrative geography is rarely, and
never quietly.

    python -m app.services.locality_import

The parent of each district and sector is worked out *spatially* rather than
read from the file: geoBoundaries publishes each level as a flat list with no
link to the one above it, and the only honest way to say which district a sector
belongs to is to check which district actually contains it.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import tempfile
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import httpx
import ijson
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert

from app.core.database import SessionLocal
from app.models.locality import Locality, LocalityLevel

logger = logging.getLogger("evaramu.localities")

API = "https://www.geoboundaries.org/api/current/gbOpen/RWA"

#: geoBoundaries' level names, what each is called in Rwanda, and how hard to
#: simplify its boundaries.
#:
#: Simplification is per level because the levels differ by orders of magnitude
#: in both size and count: a province can lose 50 m of detail and look the same,
#: while a village is often only a few hundred metres across and would collapse.
LEVELS: list[tuple[str, LocalityLevel, float]] = [
    ("ADM1", LocalityLevel.PROVINCE, 50.0),
    ("ADM2", LocalityLevel.DISTRICT, 40.0),
    ("ADM3", LocalityLevel.SECTOR, 25.0),
    ("ADM4", LocalityLevel.CELL, 12.0),
    ("ADM5", LocalityLevel.VILLAGE, 6.0),
]

#: Which level sits inside which. Parents are resolved in this order, so a
#: village is only matched once its cell exists.
NESTING: list[tuple[LocalityLevel, LocalityLevel]] = [
    (LocalityLevel.DISTRICT, LocalityLevel.PROVINCE),
    (LocalityLevel.SECTOR, LocalityLevel.DISTRICT),
    (LocalityLevel.CELL, LocalityLevel.SECTOR),
    (LocalityLevel.VILLAGE, LocalityLevel.CELL),
]

#: Village boundaries are a 124 MB download. Every level is streamed feature by
#: feature rather than parsed whole — the parsed form of that file is several
#: gigabytes of Python objects, and the machine doing the import is not always
#: a big one.

#: Attribution is a condition of the licence, not a courtesy.
ATTRIBUTION = "Boundaries © geoBoundaries (CC BY 4.0)"


async def _fetch_url(client: httpx.AsyncClient, level: str) -> str:
    meta = (await client.get(f"{API}/{level}/")).json()
    if isinstance(meta, list):
        meta = meta[0]
    return meta["gjDownloadURL"]


async def _download_to(client: httpx.AsyncClient, url: str, path: Path) -> int:
    """Stream to disk. These files reach 124 MB; none of them belong in memory."""
    size = 0
    with path.open("wb") as handle:
        async with client.stream("GET", url, follow_redirects=True) as response:
            response.raise_for_status()
            async for chunk in response.aiter_bytes(1 << 20):
                handle.write(chunk)
                size += len(chunk)
    return size


def _features(path: Path) -> Iterator[dict[str, Any]]:
    """Yield features one at a time, whatever the file's size."""
    with path.open("rb") as handle:
        yield from ijson.items(handle, "features.item", use_float=True)


def _clean(name: str) -> str:
    """`Gasabo District` → `Gasabo`. The level is a column, not part of a name."""
    for suffix in (" District", " Province", " Sector", " Cell", " Village", " City"):
        if name.endswith(suffix):
            return name[: -len(suffix)].strip()
    return name.strip()


def _geometry(feature: dict[str, Any], simplify_m: float) -> Any:
    """A feature's geometry, made valid, polygon-only and simplified."""
    geom = func.ST_Multi(
        func.ST_CollectionExtract(
            func.ST_MakeValid(
                func.ST_SetSRID(func.ST_GeomFromGeoJSON(json.dumps(feature["geometry"])), 4326)
            ),
            3,  # polygons only — a boundary that degenerates to a line is not
                # something we can shade or search
        )
    )
    if simplify_m:
        # The tolerance is in degrees, so it is converted from metres at
        # Rwanda's latitude rather than guessed.
        return func.ST_SimplifyPreserveTopology(geom, simplify_m / 111_320)
    return geom


async def _import_level(
    db: Any, path: Path, kind: LocalityLevel, simplify_m: float, batch: int = 400
) -> int:
    seen = 0
    rows: list[dict[str, Any]] = []

    async def flush() -> None:
        if not rows:
            return
        for row in rows:
            statement = insert(Locality).values(**row)
            await db.execute(
                statement.on_conflict_do_update(
                    constraint="uq_locality_source",
                    set_={
                        "name": statement.excluded.name,
                        "boundary": statement.excluded.boundary,
                        "updated_at": func.now(),
                    },
                )
            )
        await db.commit()
        rows.clear()

    for feature in _features(path):
        props = feature.get("properties") or {}
        name = _clean(props.get("shapeName") or "")
        if not name or not feature.get("geometry"):
            continue

        rows.append({
            "name": name,
            "level": kind.value,
            "source": "geoboundaries",
            "source_id": props.get("shapeID"),
            "boundary": _geometry(feature, simplify_m),
            "parent_id": None,
        })
        seen += 1

        if len(rows) >= batch:
            await flush()
            logger.info("    %s: %d…", kind.value, seen)

    await flush()
    return seen


async def run(levels: list[str] | None = None) -> dict[str, int]:
    """Download and import each level, then resolve the hierarchy."""
    counts: dict[str, int] = {}
    wanted = [(a, k, s) for a, k, s in LEVELS if levels is None or k.value in levels]

    with tempfile.TemporaryDirectory(prefix="evaramu-localities-") as tmp:
        folder = Path(tmp)
        async with httpx.AsyncClient(timeout=900) as client:
            async with SessionLocal() as db:
                for adm, kind, simplify_m in wanted:
                    url = await _fetch_url(client, adm)
                    path = folder / f"{adm}.geojson"
                    size = await _download_to(client, url, path)
                    logger.info("%s (%s): %.0f MB", kind.value, adm, size / (1 << 20))

                    counts[kind.value] = await _import_level(db, path, kind, simplify_m)
                    logger.info("  %s: %d imported", kind.value, counts[kind.value])
                    # Freed before the next level, which may be twice the size.
                    path.unlink(missing_ok=True)

                await _link_parents(db)
                await _fill_centres(db)

    return counts


async def _link_parents(db: Any) -> None:
    from sqlalchemy import text as sql

    """Attach each district to its province, and each sector to its district.

    Matched on the centroid rather than on containment: administrative
    boundaries from different levels of the same dataset do not nest perfectly,
    and a sector that overlaps its district's edge by a metre still belongs to
    exactly one district.
    """
    for child, parent in NESTING:
        # A self-join expressed as UPDATE ... FROM, which the ORM cannot say
        # as plainly.
        await db.execute(
            sql(
                """
                UPDATE localities AS child
                SET parent_id = parent.id
                FROM localities AS parent
                WHERE child.level = :child_level
                  AND parent.level = :parent_level
                  AND parent.boundary IS NOT NULL
                  AND child.boundary IS NOT NULL
                  AND ST_Contains(parent.boundary, ST_PointOnSurface(child.boundary))
                """
            ),
            {"child_level": child.value, "parent_level": parent.value},
        )
        await db.commit()

        orphans = await db.scalar(
            select(func.count())
            .select_from(Locality)
            .where(Locality.level == child.value, Locality.parent_id.is_(None))
        )
        logger.info("  %s → %s: %d without a parent", child.value, parent.value, orphans)


async def _fill_centres(db: Any) -> None:
    from sqlalchemy import text as sql

    await db.execute(
        sql(
            """
            UPDATE localities
            SET latitude = ST_Y(ST_PointOnSurface(boundary)),
                longitude = ST_X(ST_PointOnSurface(boundary))
            WHERE boundary IS NOT NULL
            """
        )
    )
    await db.commit()


def main() -> None:
    parser = argparse.ArgumentParser(description="Import Rwanda's administrative geography")
    parser.add_argument(
        "--levels",
        help="comma-separated levels to import (default: all five)",
    )
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    levels = [l.strip() for l in args.levels.split(",")] if args.levels else None
    counts = asyncio.run(run(levels=levels))
    for level, count in counts.items():
        print(f"  {level:10} {count:4}")
    print(f"\n  {ATTRIBUTION}")


if __name__ == "__main__":
    main()
