"""Construction work: every job the construction division takes on.

One record per engagement — a land survey, a set of drawings, a permit run, a
full build — from the first enquiry to the finished, photographed result. The
same row is the construction manager's job card, the client's status, and
(once marked showcased) a project on the public portfolio.
"""

from __future__ import annotations

import enum
import uuid
from datetime import date
from typing import Any

from sqlalchemy import (
    Boolean,
    Date,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKey


class ProjectKind(str, enum.Enum):
    """What kind of work it is. Broad on purpose — the title says the rest."""

    LAND_SURVEY = "land_survey"
    ARCHITECTURAL_DRAWING = "architectural_drawing"
    STRUCTURAL_DESIGN = "structural_design"
    BILL_OF_QUANTITIES = "bill_of_quantities"
    PERMIT = "permit"
    CONSTRUCTION = "construction"
    RENOVATION = "renovation"
    SUPERVISION = "supervision"
    INTERIOR = "interior"
    OTHER = "other"


class ProjectStatus(str, enum.Enum):
    """The life of a job, in order. `on_hold` and `cancelled` can happen from anywhere."""

    ENQUIRY = "enquiry"
    QUOTED = "quoted"
    APPROVED = "approved"
    IN_PROGRESS = "in_progress"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


#: Statuses that count as "still being worked on" in the manager's queue.
OPEN_STATUSES = (
    ProjectStatus.ENQUIRY,
    ProjectStatus.QUOTED,
    ProjectStatus.APPROVED,
    ProjectStatus.IN_PROGRESS,
    ProjectStatus.ON_HOLD,
)


class ConstructionProject(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "construction_projects"
    __table_args__ = (
        Index("ix_construction_status_kind", "status", "kind"),
        Index("ix_construction_showcase", "is_showcased", "completed_on"),
    )

    #: `CON-2026-0001` — quoted to the client and written on the job file.
    reference: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    kind: Mapped[ProjectKind] = mapped_column(
        Enum(ProjectKind, name="construction_kind", values_callable=lambda e: [x.value for x in e]),
        default=ProjectKind.OTHER, nullable=False,
    )
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[ProjectStatus] = mapped_column(
        Enum(ProjectStatus, name="construction_status", values_callable=lambda e: [x.value for x in e]),
        default=ProjectStatus.ENQUIRY, nullable=False, index=True,
    )

    # ---------------- who it is for
    client_name: Mapped[str | None] = mapped_column(String(160))
    client_phone: Mapped[str | None] = mapped_column(String(48))
    client_email: Mapped[str | None] = mapped_column(String(255))
    #: Linked to the CRM once the job is real, so it joins the client's history.
    client_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("clients.id", ondelete="SET NULL"), index=True
    )

    # ---------------- where
    district: Mapped[str | None] = mapped_column(String(80))
    sector: Mapped[str | None] = mapped_column(String(80))
    address: Mapped[str | None] = mapped_column(String(240))
    #: The listing it concerns, when the client bought the land through us.
    property_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("properties.id", ondelete="SET NULL"), index=True
    )

    # ---------------- who is doing it
    #: The engineer or surveyor on the job — a staff account where there is
    #: one, or just a name where the work is subcontracted.
    engineer_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    engineer_name: Mapped[str | None] = mapped_column(String(160))

    # ---------------- money and time
    currency: Mapped[str] = mapped_column(String(3), default="RWF", nullable=False)
    quote_amount: Mapped[float | None] = mapped_column(Numeric(16, 2))
    amount_paid: Mapped[float | None] = mapped_column(Numeric(16, 2))
    started_on: Mapped[date | None] = mapped_column(Date)
    due_on: Mapped[date | None] = mapped_column(Date)
    completed_on: Mapped[date | None] = mapped_column(Date)
    progress_percent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # ---------------- the public face
    is_showcased: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false"), nullable=False
    )
    #: What the portfolio says about it — written for a prospective client.
    showcase_summary: Mapped[str | None] = mapped_column(Text)
    #: `[{"url": "/media/…", "caption": "…"}, …]`, first is the cover.
    photos: Mapped[list | None] = mapped_column(JSONB)

    # ---------------- housekeeping
    #: How it reached us: website, phone, walk_in, referral, staff.
    source: Mapped[str] = mapped_column(String(32), default="staff", nullable=False)
    #: Internal notes, never public.
    notes: Mapped[str | None] = mapped_column(Text)
    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )

    updates: Mapped[list[ConstructionUpdate]] = relationship(
        back_populates="project", cascade="all, delete-orphan",
        order_by="desc(ConstructionUpdate.created_at)",
    )

    def as_dict(self) -> dict[str, Any]:
        return {
            c.name: getattr(self, c.name)
            for c in self.__table__.columns
            if c.name not in ("created_at", "updated_at")
        }


class ConstructionUpdate(Base, UUIDPrimaryKey, TimestampMixin):
    """One line in a job's history: a site visit, a drawing issued, a delay."""

    __tablename__ = "construction_updates"
    __table_args__ = (Index("ix_construction_update_project", "project_id", "created_at"),)

    project_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("construction_projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    author_id: Mapped[uuid.UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    author_name: Mapped[str | None] = mapped_column(String(160))
    note: Mapped[str] = mapped_column(Text, nullable=False)
    #: The status the job was moved to with this note, if it moved.
    status: Mapped[ProjectStatus | None] = mapped_column(
        Enum(ProjectStatus, name="construction_status", values_callable=lambda e: [x.value for x in e],
             create_type=False)
    )
    progress_percent: Mapped[int | None] = mapped_column(Integer)

    project: Mapped[ConstructionProject] = relationship(back_populates="updates")
