"""Parcel geometry: reading boundaries, measuring them, and judging their shape.

Boundaries arrive in whatever format the surveyor's software produced — WKT,
GeoJSON, or corners pasted out of a report. They are all normalised to one
internal form, `[[lat, lng], …]`, so the rest of the codebase never has to ask
which format a parcel came in as.

Coordinate order is the trap here. WKT and GeoJSON both put **longitude
first** by specification, while the pasted-corner format this console has always
used is **latitude first**. The same four numbers therefore mean different
places depending on the format they arrived in, so the order is decided per
format rather than guessed — with a Rwanda-shaped sanity check behind it for the
free-text case, where there is no specification to appeal to.
"""

from __future__ import annotations

import json
import math
import re
from typing import Any

from shapely.geometry import Point, Polygon
from shapely.validation import explain_validity

#: Rwanda's bounding box, used only to catch transposed free-text coordinates.
#: Latitude and longitude here cannot be confused: no Rwandan latitude reaches
#: 28, and no Rwandan longitude falls below it.
RW_LAT = (-3.0, -0.9)
RW_LNG = (28.8, 31.0)

_WKT_POLYGON = re.compile(r"^\s*(MULTI)?POLYGON\s*(Z|M|ZM)?\s*\(", re.IGNORECASE)
_NUMBER = r"[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?"
_PAIR = re.compile(rf"({_NUMBER})\s+({_NUMBER})")


class BoundaryError(ValueError):
    """The text was meant to be a boundary but could not be read as one."""


# --------------------------------------------------------------------- parse
def _looks_like_rwanda(lat: float, lng: float) -> bool:
    return RW_LAT[0] <= lat <= RW_LAT[1] and RW_LNG[0] <= lng <= RW_LNG[1]


def _order_free_text(pairs: list[tuple[float, float]]) -> list[list[float]]:
    """Decide whether pasted pairs are `lat, lng` or `lng, lat`.

    The documented format is `lat, lng`, so that is what is assumed. It is only
    overridden when the numbers say otherwise — a first value beyond ±90 cannot
    be a latitude at all, and a set that lands in Rwanda only when swapped
    almost certainly was.
    """
    as_written = [(a, b) for a, b in pairs]
    swapped = [(b, a) for a, b in pairs]

    if any(abs(a) > 90 for a, _ in as_written):
        return [[lat, lng] for lat, lng in swapped]

    hits_written = sum(1 for lat, lng in as_written if _looks_like_rwanda(lat, lng))
    hits_swapped = sum(1 for lat, lng in swapped if _looks_like_rwanda(lat, lng))
    if hits_swapped > hits_written:
        return [[lat, lng] for lat, lng in swapped]
    return [[lat, lng] for lat, lng in as_written]


def _from_wkt(text: str) -> list[list[float]]:
    """Read the outer ring of a WKT polygon. Longitude first, per OGC."""
    # The first parenthesised run of coordinate pairs is the exterior ring;
    # anything after it is a hole or a further polygon, neither of which a
    # parcel boundary uses.
    pairs = [(float(x), float(y)) for x, y in _PAIR.findall(text)]
    if not pairs:
        raise BoundaryError("No coordinates found in that WKT polygon")
    return [[lat, lng] for lng, lat in pairs]


def _from_geojson(data: Any) -> list[list[float]]:
    """Read the outer ring of GeoJSON. Longitude first, per RFC 7946."""
    if isinstance(data, dict) and data.get("type") == "FeatureCollection":
        features = data.get("features") or []
        if not features:
            raise BoundaryError("That FeatureCollection has no features")
        data = features[0]
    if isinstance(data, dict) and data.get("type") == "Feature":
        data = data.get("geometry")
    if not isinstance(data, dict) or "coordinates" not in data:
        raise BoundaryError("That GeoJSON has no geometry")

    kind = data.get("type")
    coords = data["coordinates"]
    if kind == "Polygon":
        ring = coords[0]
    elif kind == "MultiPolygon":
        ring = coords[0][0]
    else:
        raise BoundaryError(f"A parcel boundary must be a polygon, not {kind}")

    return [[float(pt[1]), float(pt[0])] for pt in ring]


def parse_boundary(raw: str | dict | list | None) -> list[list[float]]:
    """Read a boundary in any accepted format into `[[lat, lng], …]`.

    Accepts WKT (`POLYGON ((lng lat, …))`), a GeoJSON Feature, FeatureCollection
    or bare geometry, an already-parsed `[[lat, lng], …]` ring, or corners
    pasted one per line.
    """
    if raw is None:
        return []

    if isinstance(raw, list):
        pairs = [(float(p[0]), float(p[1])) for p in raw if len(p) >= 2]
        return _order_free_text(pairs)

    if isinstance(raw, dict):
        return _close(_from_geojson(raw))

    text = raw.strip()
    if not text:
        return []

    if _WKT_POLYGON.match(text):
        return _close(_from_wkt(text))

    if text.startswith("{") or text.startswith("["):
        try:
            return _close(_from_geojson(json.loads(text)))
        except json.JSONDecodeError as exc:
            raise BoundaryError("That looked like GeoJSON but is not valid JSON") from exc

    # Free text: one corner per line, separated by a comma or whitespace.
    pairs: list[tuple[float, float]] = []
    for line in text.splitlines():
        line = line.strip().strip(",")
        if not line:
            continue
        bits = [b for b in re.split(r"[,\s]+", line) if b]
        if len(bits) < 2:
            continue
        try:
            pairs.append((float(bits[0]), float(bits[1])))
        except ValueError:
            continue
    if not pairs:
        raise BoundaryError("No coordinate pairs could be read from that text")
    return _close(_order_free_text(pairs))


def _close(ring: list[list[float]]) -> list[list[float]]:
    """Drop a repeated closing point.

    Stored rings are open — the closing point is implied. Keeping it would
    double-count a corner everywhere the ring is measured or drawn.
    """
    if len(ring) > 1 and _same_point(ring[0], ring[-1]):
        ring = ring[:-1]
    return ring


def _same_point(a: list[float], b: list[float], tol: float = 1e-9) -> bool:
    return abs(a[0] - b[0]) < tol and abs(a[1] - b[1]) < tol


# ------------------------------------------------------------------ geometry
def to_geojson(ring: list[list[float]]) -> dict | None:
    """`[[lat, lng], …]` back out to a GeoJSON polygon, longitude first."""
    if not ring or len(ring) < 3:
        return None
    coords = [[lng, lat] for lat, lng in ring]
    coords.append(coords[0])
    return {"type": "Polygon", "coordinates": [coords]}


def _shapely(ring: list[list[float]]) -> Polygon | None:
    if not ring or len(ring) < 3:
        return None
    return Polygon([(lng, lat) for lat, lng in ring])


def centroid(ring: list[list[float]]) -> tuple[float, float] | None:
    """The parcel's middle, as `(lat, lng)` — where its map pin belongs."""
    poly = _shapely(ring)
    if poly is None or poly.is_empty:
        return None
    point = poly.centroid
    return (point.y, point.x)


def _metres_per_degree(lat_deg: float) -> tuple[float, float]:
    """Length of one degree of latitude and of longitude at this latitude.

    A degree of latitude and a degree of longitude are not the same distance —
    using one figure for both is what makes a naive flat projection overstate
    area by the better part of a percent, which on a priced-by-the-square-metre
    plot is real money. These are the standard WGS84 series expansions.
    """
    phi = math.radians(lat_deg)
    lat_m = 111_132.92 - 559.82 * math.cos(2 * phi) + 1.175 * math.cos(4 * phi)
    lng_m = 111_412.84 * math.cos(phi) - 93.5 * math.cos(3 * phi)
    return lat_m, lng_m


def _to_metres(ring: list[list[float]]) -> list[tuple[float, float]]:
    """Project to a local flat plane, in metres.

    An equirectangular projection centred on the parcel. Over a plot a few
    hundred metres across the residual error is far below survey tolerance, and
    it keeps area and perimeter computable without a database round trip.
    PostGIS remains the authority for stored figures.
    """
    lat0 = sum(p[0] for p in ring) / len(ring)
    lat_m, lng_m = _metres_per_degree(lat0)
    return [(lng * lng_m, lat * lat_m) for lat, lng in ring]


def area_sqm(ring: list[list[float]]) -> float | None:
    pts = _to_metres(ring) if ring and len(ring) >= 3 else None
    if not pts:
        return None
    return abs(Polygon(pts).area)


def perimeter_m(ring: list[list[float]]) -> float | None:
    if not ring or len(ring) < 3:
        return None
    pts = _to_metres(ring)
    return Polygon(pts).length


def bounds(ring: list[list[float]]) -> tuple[float, float, float, float] | None:
    """`(min_lat, min_lng, max_lat, max_lng)`."""
    if not ring:
        return None
    lats = [p[0] for p in ring]
    lngs = [p[1] for p in ring]
    return (min(lats), min(lngs), max(lats), max(lngs))


# -------------------------------------------------------------- shape checks
#: Below this Polsby-Popper score a parcel is long and thin rather than compact.
#: 1.0 is a circle; a square scores 0.79; a 1:10 strip scores about 0.26.
SLIVER_SCORE = 0.22
#: An interior angle this sharp is usually a stray point, not a real corner.
SPIKE_DEGREES = 12.0
#: How far the measured area may drift from the declared size before it is
#: worth flagging. Survey and title figures rarely agree to the metre.
AREA_TOLERANCE = 0.10


def compactness(ring: list[list[float]]) -> float | None:
    """Polsby-Popper: 4πA / P². How circle-like the parcel is, from 0 to 1."""
    area = area_sqm(ring)
    perim = perimeter_m(ring)
    if not area or not perim:
        return None
    return (4 * math.pi * area) / (perim * perim)


def _interior_angles(ring: list[list[float]]) -> list[float]:
    pts = _to_metres(ring)
    n = len(pts)
    angles = []
    for i in range(n):
        ax, ay = pts[i - 1]
        bx, by = pts[i]
        cx, cy = pts[(i + 1) % n]
        v1 = (ax - bx, ay - by)
        v2 = (cx - bx, cy - by)
        m1 = math.hypot(*v1)
        m2 = math.hypot(*v2)
        if m1 == 0 or m2 == 0:
            continue
        cosine = max(-1.0, min(1.0, (v1[0] * v2[0] + v1[1] * v2[1]) / (m1 * m2)))
        angles.append(math.degrees(math.acos(cosine)))
    return angles


def analyse_shape(ring: list[list[float]], declared_size: float | None = None) -> dict:
    """Describe a boundary, and list anything wrong with it.

    Returned rather than raised: an odd shape is usually a real parcel with a
    real quirk, and the buyer is better served by being told what the quirk is
    than by the listing being refused. Severity separates "this is unusual" from
    "these numbers cannot both be true".
    """
    issues: list[dict] = []

    def flag(code: str, severity: str, message: str, **extra: Any) -> None:
        issues.append({"code": code, "severity": severity, "message": message, **extra})

    if not ring:
        return {"issues": [], "metrics": {}}

    distinct = [p for i, p in enumerate(ring) if i == 0 or not _same_point(p, ring[i - 1])]
    if len(distinct) < 3:
        flag("too_few_points", "error",
             f"A boundary needs at least 3 distinct corners — this has {len(distinct)}.")
        return {"issues": issues, "metrics": {"points": len(distinct)}}

    if len(distinct) != len(ring):
        flag("duplicate_points", "warning",
             "Some corners are repeated. They have been ignored when measuring.")

    poly = _shapely(ring)
    area = area_sqm(ring)
    perim = perimeter_m(ring)
    score = compactness(ring)
    angles = _interior_angles(ring)

    metrics = {
        "points": len(distinct),
        "area_sqm": round(area, 2) if area else None,
        "perimeter_m": round(perim, 2) if perim else None,
        "compactness": round(score, 3) if score else None,
        "sharpest_angle": round(min(angles), 1) if angles else None,
        "bounds": bounds(ring),
    }

    if poly is not None and not poly.is_valid:
        flag("self_intersecting", "error",
             f"The outline crosses itself — {explain_validity(poly).split('[')[0].strip()}. "
             "Its area cannot be trusted until the corner order is fixed.")

    if score is not None and score < SLIVER_SCORE:
        flag("sliver", "warning",
             "The parcel is long and narrow. Check the corner order is right, and that it is "
             "wide enough to build on.", compactness=round(score, 3))

    if angles and min(angles) < SPIKE_DEGREES:
        flag("spike", "warning",
             f"One corner turns through only {min(angles):.0f}°, which is usually a stray point "
             "rather than a real boundary corner.", angle=round(min(angles), 1))

    if area is not None:
        if area < 20:
            flag("implausibly_small", "error",
                 f"The outline covers {area:.0f} sqm. That is too small to be a parcel — the "
                 "coordinates may be in the wrong order.")
        elif area > 1_000_000:
            flag("implausibly_large", "warning",
                 f"The outline covers {area / 10_000:.1f} hectares. Worth confirming before it "
                 "goes on the market.")

    if declared_size and area:
        drift = abs(area - declared_size) / declared_size
        if drift > AREA_TOLERANCE:
            flag("area_mismatch", "error" if drift > 0.35 else "warning",
                 f"The outline measures {area:,.0f} sqm but the listing says "
                 f"{declared_size:,.0f} sqm — a {drift * 100:.0f}% difference.",
                 measured=round(area, 1), declared=declared_size, drift=round(drift, 3))

    return {"issues": issues, "metrics": metrics}


def contains(ring: list[list[float]], lat: float | None, lng: float | None) -> bool:
    """Whether a pin falls inside the boundary.

    Used to tell a deliberately-placed gate pin from one left behind by an
    earlier shape. The boundary edge counts as inside — a pin dropped on the
    road frontage is exactly where an entrance belongs.
    """
    if lat is None or lng is None:
        return False
    poly = _shapely(ring)
    if poly is None or poly.is_empty:
        return False
    point = Point(lng, lat)
    return bool(poly.covers(point))
