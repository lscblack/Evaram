import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin, UUIDPrimaryKey


class UserRole(str, enum.Enum):
    """Ordered least → most privileged; `rank` drives the RBAC comparisons."""

    USER = "user"
    AGENT = "agent"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"

    @property
    def rank(self) -> int:
        return _ROLE_RANK[self]


_ROLE_RANK = {
    UserRole.USER: 0,
    UserRole.AGENT: 1,
    UserRole.ADMIN: 2,
    UserRole.SUPER_ADMIN: 3,
}


class UserStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    DISABLED = "disabled"


class OtpPurpose(str, enum.Enum):
    LOGIN = "login"
    EMAIL_VERIFY = "email_verify"
    PASSWORD_RESET = "password_reset"


class User(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "users"
    __table_args__ = (
        Index("ix_users_role_status", "role", "status"),
        Index("ix_users_full_name_trgm", "full_name", postgresql_using="gin",
              postgresql_ops={"full_name": "gin_trgm_ops"}),
    )

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32), index=True)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, name="user_role", values_callable=lambda e: [m.value for m in e]),
        default=UserRole.USER,
        nullable=False,
        index=True,
    )
    status: Mapped[UserStatus] = mapped_column(
        SAEnum(UserStatus, name="user_status", values_callable=lambda e: [m.value for m in e]),
        default=UserStatus.ACTIVE,
        nullable=False,
    )

    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    #: Every role can be forced through OTP; super admin always is.
    otp_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # ---- agent / staff profile (surfaced on the public team page) ----
    job_title: Mapped[str | None] = mapped_column(String(120))
    division: Mapped[str | None] = mapped_column(String(40), index=True)
    bio: Mapped[str | None] = mapped_column(Text)
    photo_url: Mapped[str | None] = mapped_column(String(512))
    languages: Mapped[list[str] | None] = mapped_column(JSONB)
    specialties: Mapped[list[str] | None] = mapped_column(JSONB)
    covers: Mapped[list[str] | None] = mapped_column(JSONB)
    linkedin_url: Mapped[str | None] = mapped_column(String(512))
    joined_year: Mapped[str | None] = mapped_column(String(8))
    rating: Mapped[float | None] = mapped_column()
    deals_closed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    #: Show this person in the public /team listing.
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    failed_login_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    otp_codes: Mapped[list["OtpCode"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", passive_deletes=True
    )

    @property
    def is_staff(self) -> bool:
        return self.role.rank >= UserRole.AGENT.rank

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"<User {self.email} {self.role.value}>"


class OtpCode(Base, UUIDPrimaryKey, TimestampMixin):
    """Short-lived one-time codes. Only the hash is stored."""

    __tablename__ = "otp_codes"
    __table_args__ = (Index("ix_otp_user_purpose_active", "user_id", "purpose", "consumed_at"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    code_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    purpose: Mapped[OtpPurpose] = mapped_column(
        SAEnum(OtpPurpose, name="otp_purpose", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    #: Bound to the pre-auth challenge token so a code cannot be replayed.
    challenge: Mapped[str] = mapped_column(String(64), index=True, nullable=False)

    user: Mapped[User] = relationship(back_populates="otp_codes")


class RefreshToken(Base, UUIDPrimaryKey, TimestampMixin):
    __tablename__ = "refresh_tokens"
    __table_args__ = (Index("ix_refresh_user_revoked", "user_id", "revoked_at"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    user_agent: Mapped[str | None] = mapped_column(String(320))
    ip_address: Mapped[str | None] = mapped_column(String(64))

    user: Mapped[User] = relationship(back_populates="refresh_tokens")


class CaptchaChallenge(Base, UUIDPrimaryKey, TimestampMixin):
    """
    Server-issued challenge for the in-house captcha. The answer never leaves
    the server; the client posts the token plus its attempted answer.
    """

    __tablename__ = "captcha_challenges"
    __table_args__ = (UniqueConstraint("token", name="uq_captcha_token"),)

    token: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    answer_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    ip_address: Mapped[str | None] = mapped_column(String(64), index=True)
    scope: Mapped[str] = mapped_column(String(40), default="generic", nullable=False)
