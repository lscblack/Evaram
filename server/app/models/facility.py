"""Infrastructure near a parcel: what is around it, and how far.

Land in Rwanda is priced as much by what surrounds it as by what it is — a plot
five minutes from a tarmac road and a secondary school is not the same asset as
an identical plot an hour up a track. These rows are what turns that from an
agent's assertion into a measured distance.

Sourced from OpenStreetMap. Each row keeps its `osm_id` so a re-import updates
what is already here instead of stacking duplicates.
"""

from __future__ import annotations

import enum
from typing import Any

from geoalchemy2 import Geometry
from sqlalchemy import Boolean, Float, String, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKey


class FacilityKind(str, enum.Enum):
    """What a place is, grouped the way a buyer actually asks about it."""

    # --- daily life
    SCHOOL = "school"
    HOSPITAL = "hospital"
    CLINIC = "clinic"
    PHARMACY = "pharmacy"
    MARKET = "market"
    SHOP = "shop"
    BANK = "bank"
    RESTAURANT = "restaurant"
    BAR = "bar"
    HOTEL = "hotel"
    PLACE_OF_WORSHIP = "place_of_worship"

    # --- getting about
    BUS_STATION = "bus_station"
    TAXI_STAND = "taxi_stand"
    FUEL = "fuel"
    AIRPORT = "airport"
    ROAD = "road"

    # --- services
    POLICE = "police"
    FIRE_STATION = "fire_station"
    POST_OFFICE = "post_office"
    GOVERNMENT = "government"
    UNIVERSITY = "university"

    # --- land and water, the constraints rather than the conveniences
    WETLAND = "wetland"
    RIVER = "river"
    LAKE = "lake"
    FOREST = "forest"
    PARK = "park"
    QUARRY = "quarry"
    LANDFILL = "landfill"
    POWER_LINE = "power_line"
    CEMETERY = "cemetery"
    INDUSTRIAL = "industrial"


#: Kinds a buyer usually wants *distance from* rather than *closeness to*.
#: A wetland boundary constrains what can be built; a quarry is noise and dust.
CONSTRAINT_KINDS = frozenset({
    FacilityKind.WETLAND,
    FacilityKind.RIVER,
    FacilityKind.LAKE,
    FacilityKind.QUARRY,
    FacilityKind.LANDFILL,
    FacilityKind.POWER_LINE,
    FacilityKind.CEMETERY,
    FacilityKind.INDUSTRIAL,
})


class Facility(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "facilities"
    __table_args__ = (
        # One row per OSM object. Re-imports update rather than duplicate.
        UniqueConstraint("source", "source_id", name="uq_facility_source"),
        # No composite (kind, geom) index: btree and GiST cannot share one
        # without the btree_gist extension, and Postgres combines the separate
        # indexes with a bitmap scan anyway.
    )

    name: Mapped[str | None] = mapped_column(String(200))
    #: Stored as text rather than a database enum: the OSM tag vocabulary grows,
    #: and a new kind of place should be an import away, not a migration.
    kind: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    #: For roads — `trunk`, `primary`, `residential`. Distance to *a* road means
    #: little; distance to a tarmac road means a great deal.
    subkind: Mapped[str | None] = mapped_column(String(60), index=True)

    #: Points, lines and areas all live here. A wetland is an area and its edge
    #: is what matters, so distance is measured to the geometry, not to a pin.
    geom: Mapped[Any] = mapped_column(
        Geometry(geometry_type="GEOMETRY", srid=4326, spatial_index=True), nullable=False
    )

    district: Mapped[str | None] = mapped_column(String(80), index=True)
    sector: Mapped[str | None] = mapped_column(String(80))

    source: Mapped[str] = mapped_column(String(20), default="osm", nullable=False)
    source_id: Mapped[str] = mapped_column(String(40), nullable=False)
    tags: Mapped[dict | None] = mapped_column(JSONB)

    #: Lets a bad import be hidden without deleting it and losing the id.
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default=text("true"), nullable=False
    )
    #: Cached so a list of facilities can be ranked without recomputing.
    importance: Mapped[float | None] = mapped_column(Float)

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"<Facility {self.kind}:{self.name or self.source_id}>"
