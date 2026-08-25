"""Rwanda's administrative geography: provinces, districts and sectors.

The authoritative list of *where* — five provinces, thirty districts, four
hundred and sixteen sectors — with the boundary of each. Kept as real geometry
rather than as a list of names so a parcel's sector can be checked against where
it actually sits, and so the map can shade a sector rather than draw a circle
where its middle roughly is.

Five levels, as Rwanda administers them: province, district, sector, cell,
village — 5, 30, 416, 2,148 and roughly 15,000 of them.

Sourced from geoBoundaries (CC BY 4.0), which is open and carries all five
levels. OpenStreetMap has Rwanda's provinces and districts but nothing below
them, which is why it is not the source here.
"""

from __future__ import annotations

import enum
import uuid
from typing import Any

from geoalchemy2 import Geometry
from sqlalchemy import Boolean, Float, ForeignKey, Index, String, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKey


class LocalityLevel(str, enum.Enum):
    PROVINCE = "province"
    DISTRICT = "district"
    SECTOR = "sector"
    CELL = "cell"
    VILLAGE = "village"


class Locality(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "localities"
    __table_args__ = (
        # Identity is the source's own shape id, not the name. Place names in
        # Rwanda repeat freely — there are two cells called Karama inside one
        # sector — so a name, even qualified by its parent, is not a key.
        UniqueConstraint("source", "source_id", name="uq_locality_source"),
        Index("ix_locality_level_name", "level", "name"),
        Index("ix_locality_parent_level", "parent_id", "level"),
    )

    name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    level: Mapped[str] = mapped_column(String(20), nullable=False, index=True)

    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("localities.id", ondelete="CASCADE"), index=True
    )
    parent: Mapped[Locality | None] = relationship(remote_side="Locality.id", backref="children")

    #: The source's own identifier, so a re-import updates rather than duplicates.
    source: Mapped[str] = mapped_column(String(20), default="geoboundaries", nullable=False)
    source_id: Mapped[str | None] = mapped_column(String(60), index=True)

    boundary: Mapped[Any | None] = mapped_column(
        Geometry(geometry_type="GEOMETRY", srid=4326, spatial_index=True)
    )
    #: Cached centre, so a dropdown can fly the map somewhere without a spatial
    #: query on every keystroke.
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)

    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default=text("true"), nullable=False
    )

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"<Locality {self.level}:{self.name}>"
