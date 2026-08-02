import uuid

from pydantic import BaseModel, Field

from app.models.taxonomy import FieldType, FieldWidth
from app.schemas.common import ORMModel


class ConditionalRule(BaseModel):
    field: str
    value: object


# ---------------------------------------------------------------- fields
class FormFieldOut(ORMModel):
    id: uuid.UUID
    name: str
    label: str
    label_rw: str | None = None
    label_fr: str | None = None
    help_text: str | None = None
    placeholder: str | None = None
    type: FieldType
    width: FieldWidth
    options: list[str] | None = None
    is_required: bool
    conditional: dict | None = None
    min_value: float | None = None
    max_value: float | None = None
    unit: str | None = None
    display_order: int
    is_active: bool


class FormFieldCreate(BaseModel):
    name: str = Field(min_length=1, max_length=64, pattern=r"^[a-z][a-z0-9_]*$")
    label: str = Field(min_length=1, max_length=240)
    label_rw: str | None = None
    label_fr: str | None = None
    help_text: str | None = None
    placeholder: str | None = None
    type: FieldType
    width: FieldWidth = FieldWidth.FULL
    #: Either literal options or a reference to an `OptionSet.key`.
    options: list[str] | None = None
    option_set_key: str | None = None
    is_required: bool = False
    conditional: ConditionalRule | None = None
    min_value: float | None = None
    max_value: float | None = None
    unit: str | None = None
    display_order: int = 0
    is_active: bool = True


class FormFieldUpdate(BaseModel):
    label: str | None = None
    label_rw: str | None = None
    label_fr: str | None = None
    help_text: str | None = None
    placeholder: str | None = None
    type: FieldType | None = None
    width: FieldWidth | None = None
    options: list[str] | None = None
    option_set_key: str | None = None
    is_required: bool | None = None
    conditional: ConditionalRule | None = None
    min_value: float | None = None
    max_value: float | None = None
    unit: str | None = None
    display_order: int | None = None
    is_active: bool | None = None


# ---------------------------------------------------------------- subcategories
class SubCategoryOut(ORMModel):
    id: uuid.UUID
    slug: str
    label: str
    label_rw: str | None = None
    label_fr: str | None = None
    description: str | None = None
    icon: str | None = None
    is_land: bool
    display_order: int
    is_active: bool
    fields: list[FormFieldOut] = []


class SubCategoryCreate(BaseModel):
    slug: str = Field(min_length=1, max_length=64, pattern=r"^[a-z][a-z0-9_]*$")
    label: str = Field(min_length=1, max_length=160)
    label_rw: str | None = None
    label_fr: str | None = None
    description: str | None = None
    icon: str | None = None
    is_land: bool = False
    display_order: int = 0
    is_active: bool = True


class SubCategoryUpdate(BaseModel):
    label: str | None = None
    label_rw: str | None = None
    label_fr: str | None = None
    description: str | None = None
    icon: str | None = None
    is_land: bool | None = None
    display_order: int | None = None
    is_active: bool | None = None


# ---------------------------------------------------------------- categories
class CategoryOut(ORMModel):
    id: uuid.UUID
    slug: str
    label: str
    label_rw: str | None = None
    label_fr: str | None = None
    description: str | None = None
    icon: str | None = None
    cover_image_url: str | None = None
    display_order: int
    is_active: bool
    subcategories: list[SubCategoryOut] = []


class CategorySummary(ORMModel):
    """Lightweight shape for filter rails — no nested form fields."""

    id: uuid.UUID
    slug: str
    label: str
    icon: str | None = None
    display_order: int
    property_count: int = 0


class CategoryCreate(BaseModel):
    slug: str = Field(min_length=1, max_length=64, pattern=r"^[a-zA-Z][a-zA-Z0-9_]*$")
    label: str = Field(min_length=1, max_length=120)
    label_rw: str | None = None
    label_fr: str | None = None
    description: str | None = None
    icon: str | None = None
    cover_image_url: str | None = None
    display_order: int = 0
    is_active: bool = True


class CategoryUpdate(BaseModel):
    label: str | None = None
    label_rw: str | None = None
    label_fr: str | None = None
    description: str | None = None
    icon: str | None = None
    cover_image_url: str | None = None
    display_order: int | None = None
    is_active: bool | None = None


class ReorderRequest(BaseModel):
    """`[{id, display_order}]` — one round trip for a drag-and-drop reorder."""

    items: list[dict]


# ---------------------------------------------------------------- option sets
class OptionSetOut(ORMModel):
    id: uuid.UUID
    key: str
    label: str
    values: list[str]
    description: str | None = None
    is_system: bool


class OptionSetCreate(BaseModel):
    key: str = Field(min_length=1, max_length=64, pattern=r"^[A-Z][A-Z0-9_]*$")
    label: str
    values: list[str]
    description: str | None = None


class OptionSetUpdate(BaseModel):
    label: str | None = None
    values: list[str] | None = None
    description: str | None = None


class DistrictOut(ORMModel):
    id: uuid.UUID
    name: str
    province: str | None = None
    display_order: int
    is_active: bool
