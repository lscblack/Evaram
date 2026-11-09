from __future__ import annotations

from datetime import date, datetime
from enum import StrEnum
from typing import Any

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from evaramu.db.base import Base, TimestampMixin, enum_check


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = (Index("ix_audit_logs_entity", "entity_type", "entity_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    action: Mapped[str] = mapped_column(String(64), index=True)
    entity_type: Mapped[str] = mapped_column(String(48))
    entity_id: Mapped[str | None] = mapped_column(String(48))
    summary: Mapped[str] = mapped_column(String(500))
    changes: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    ip_address: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    actor = relationship("User", lazy="joined")


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        Index("ix_notifications_user_unread", "user_id", "read_at"),
        # Prevents the daily job from repeating the same alert to the same user.
        Index("uq_notifications_user_dedupe", "user_id", "dedupe_key", unique=True),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    kind: Mapped[str] = mapped_column(String(48))
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text, default="")
    link: Mapped[str] = mapped_column(String(255), default="")
    dedupe_key: Mapped[str | None] = mapped_column(String(160))
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AppSetting(TimestampMixin, Base):
    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(String(80), primary_key=True)
    value: Mapped[Any] = mapped_column(JSONB)
    label: Mapped[str] = mapped_column(String(120), default="")
    group: Mapped[str] = mapped_column(String(48), default="general")
    #: Public settings (company contact details) are served to the website.
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))


class InquiryStatus(StrEnum):
    NEW = "new"
    CONTACTED = "contacted"
    SCHEDULED = "scheduled"
    CLOSED = "closed"


class Inquiry(TimestampMixin, Base):
    """Viewing request / question submitted from the public website."""

    __tablename__ = "inquiries"
    __table_args__ = (enum_check("status", InquiryStatus),)

    id: Mapped[int] = mapped_column(primary_key=True)
    unit_id: Mapped[int | None] = mapped_column(ForeignKey("rental_units.id", ondelete="SET NULL"), index=True)
    full_name: Mapped[str] = mapped_column(String(160))
    phone: Mapped[str] = mapped_column(String(32))
    email: Mapped[str | None] = mapped_column(String(255))
    message: Mapped[str] = mapped_column(Text, default="")
    preferred_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(16), default=InquiryStatus.NEW.value, index=True)
    staff_notes: Mapped[str] = mapped_column(Text, default="")
    handled_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))

    unit = relationship("RentalUnit", lazy="joined")


class NumberSequence(Base):
    """Gap-tolerant document numbering (invoices, payments, agreements).

    Rows are locked with SELECT ... FOR UPDATE so concurrent requests never
    issue the same number.
    """

    __tablename__ = "number_sequences"

    name: Mapped[str] = mapped_column(String(48), primary_key=True)
    last_value: Mapped[int] = mapped_column(Integer, default=0)
