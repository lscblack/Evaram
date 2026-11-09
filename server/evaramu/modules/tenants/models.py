from __future__ import annotations

from datetime import date, datetime
from enum import StrEnum

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    false,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from evaramu.db.base import Base, TimestampMixin, enum_check


class IdType(StrEnum):
    NATIONAL_ID = "national_id"
    PASSPORT = "passport"
    REFUGEE_ID = "refugee_id"
    OTHER = "other"


class Tenant(TimestampMixin, Base):
    __tablename__ = "tenants"
    __table_args__ = (
        enum_check("id_type", IdType),
        Index("ix_tenants_full_name_lower", func.lower(text("full_name"))),
        Index("ix_tenants_is_demo", "is_demo", postgresql_where=text("is_demo")),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(160))
    phone: Mapped[str] = mapped_column(String(32), index=True)
    email: Mapped[str | None] = mapped_column(String(255), index=True)
    # Identification is sensitive: only returned to holders of
    # tenants.view_sensitive, and never written to the audit log.
    id_type: Mapped[str | None] = mapped_column(String(32))
    id_number: Mapped[str | None] = mapped_column(String(64))
    nationality: Mapped[str] = mapped_column(String(80), default="")
    occupation: Mapped[str] = mapped_column(String(120), default="")
    emergency_contact_name: Mapped[str] = mapped_column(String(160), default="")
    emergency_contact_phone: Mapped[str] = mapped_column(String(32), default="")
    emergency_contact_relationship: Mapped[str] = mapped_column(String(64), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    registered_on: Mapped[date] = mapped_column(Date, server_default=func.current_date())
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    #: Sample record loaded from Settings → Demo data (removable as a set).
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false())
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
