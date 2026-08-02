import enum
import uuid

from sqlalchemy import (
    Boolean,
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


class FieldType(str, enum.Enum):
    TEXT = "text"
    NUMBER = "number"
    SELECT = "select"
    RADIO = "radio"
    CHECKBOX = "checkbox"
    MULTISELECT = "multiselect"
    SECTION_HEADER = "section_header"
    DATE = "date"
    TEXTAREA = "textarea"


class FieldWidth(str, enum.Enum):
    FULL = "full"
    HALF = "half"
    THIRD = "third"


class PropertyCategory(Base, UUIDPrimaryKey, TimestampMixin):
    """Top-level land-use category. Fully manageable from the admin UI."""

    __tablename__ = "property_categories"
    __table_args__ = (Index("ix_categories_active_order", "is_active", "display_order"),)

    #: Stable machine key used by the front end (e.g. "agricultural").
    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    label_rw: Mapped[str | None] = mapped_column(String(120))
    label_fr: Mapped[str | None] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(Text)
    #: Lucide icon name.
    icon: Mapped[str | None] = mapped_column(String(64))
    cover_image_url: Mapped[str | None] = mapped_column(String(512))
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    subcategories: Mapped[list["PropertySubCategory"]] = relationship(
        back_populates="category",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="PropertySubCategory.display_order",
    )


class PropertySubCategory(Base, UUIDPrimaryKey, TimestampMixin):
    """One listing form — the 20 forms from the specification live here."""

    __tablename__ = "property_subcategories"
    __table_args__ = (
        UniqueConstraint("category_id", "slug", name="uq_subcategory_slug_per_category"),
        Index("ix_subcategories_active_order", "is_active", "display_order"),
    )

    category_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("property_categories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    slug: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    label: Mapped[str] = mapped_column(String(160), nullable=False)
    label_rw: Mapped[str | None] = mapped_column(String(160))
    label_fr: Mapped[str | None] = mapped_column(String(160))
    description: Mapped[str | None] = mapped_column(Text)
    icon: Mapped[str | None] = mapped_column(String(64))
    #: True when this form describes bare land rather than a structure.
    is_land: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    category: Mapped[PropertyCategory] = relationship(back_populates="subcategories")
    fields: Mapped[list["PropertyFormField"]] = relationship(
        back_populates="subcategory",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="PropertyFormField.display_order",
    )


class PropertyFormField(Base, UUIDPrimaryKey, TimestampMixin):
    """
    A single question on a listing form. Mirrors the front-end `FormField`
    contract exactly, so the client renders whatever the admin configures
    without a deploy.
    """

    __tablename__ = "property_form_fields"
    __table_args__ = (
        UniqueConstraint("subcategory_id", "name", name="uq_field_name_per_subcategory"),
        Index("ix_fields_subcat_order", "subcategory_id", "display_order"),
    )

    subcategory_id: Mapped[uuid.UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("property_subcategories.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    label: Mapped[str] = mapped_column(String(240), nullable=False)
    label_rw: Mapped[str | None] = mapped_column(String(240))
    label_fr: Mapped[str | None] = mapped_column(String(240))
    help_text: Mapped[str | None] = mapped_column(Text)
    placeholder: Mapped[str | None] = mapped_column(String(240))

    type: Mapped[FieldType] = mapped_column(
        SAEnum(FieldType, name="form_field_type", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    width: Mapped[FieldWidth] = mapped_column(
        SAEnum(FieldWidth, name="form_field_width", values_callable=lambda e: [m.value for m in e]),
        default=FieldWidth.FULL,
        nullable=False,
    )
    #: Choice list for select / radio / multiselect.
    options: Mapped[list[str] | None] = mapped_column(JSONB)
    is_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    #: `{"field": "has_fence", "value": "Yes"}` — shown only when it matches.
    conditional: Mapped[dict | None] = mapped_column(JSONB)
    #: Optional numeric bounds for `number` fields.
    min_value: Mapped[float | None] = mapped_column()
    max_value: Mapped[float | None] = mapped_column()
    unit: Mapped[str | None] = mapped_column(String(24))

    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    subcategory: Mapped[PropertySubCategory] = relationship(back_populates="fields")


class OptionSet(Base, UUIDPrimaryKey, TimestampMixin):
    """
    Named, reusable choice lists (YES_NO, FENCE_MATERIALS, …). Editing one here
    updates every field that references it, which is how the admin keeps the
    twenty forms consistent.
    """

    __tablename__ = "option_sets"

    key: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    label: Mapped[str] = mapped_column(String(160), nullable=False)
    values: Mapped[list[str]] = mapped_column(JSONB, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class District(Base, UUIDPrimaryKey, TimestampMixin):
    """Rwandan administrative districts, editable by an admin."""

    __tablename__ = "districts"

    name: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    province: Mapped[str | None] = mapped_column(String(80), index=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
