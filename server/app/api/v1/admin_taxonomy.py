"""Category / sub-category / form-field management."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core import cache
from app.core.database import get_db
from app.core.deps import require_admin
from app.models.property import Property
from app.models.taxonomy import (
    District,
    OptionSet,
    PropertyCategory,
    PropertyFormField,
    PropertySubCategory,
)
from app.models.user import User
from app.schemas.common import Message
from app.schemas.taxonomy import (
    CategoryCreate,
    CategoryOut,
    CategoryUpdate,
    DistrictOut,
    FormFieldCreate,
    FormFieldOut,
    FormFieldUpdate,
    OptionSetCreate,
    OptionSetOut,
    OptionSetUpdate,
    ReorderRequest,
    SubCategoryCreate,
    SubCategoryOut,
    SubCategoryUpdate,
)
from app.services.audit import diff, record

router = APIRouter(prefix="/admin/taxonomy", tags=["admin:taxonomy"])


async def _invalidate() -> None:
    await cache.invalidate("public:taxonomy", "public:categories", "public:bootstrap")


# ------------------------------------------------------------------ categories
@router.get("/categories", response_model=list[CategoryOut])
async def list_categories(
    include_inactive: bool = True,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[CategoryOut]:
    stmt = (
        select(PropertyCategory)
        .options(
            selectinload(PropertyCategory.subcategories).selectinload(PropertySubCategory.fields)
        )
        .order_by(PropertyCategory.display_order)
    )
    if not include_inactive:
        stmt = stmt.where(PropertyCategory.is_active.is_(True))
    rows = (await db.scalars(stmt)).unique().all()
    return [CategoryOut.model_validate(r) for r in rows]


@router.post("/categories", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
async def create_category(
    request: Request,
    payload: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_admin),
) -> CategoryOut:
    if await db.scalar(select(PropertyCategory.id).where(PropertyCategory.slug == payload.slug)):
        raise HTTPException(status.HTTP_409_CONFLICT, "That category slug already exists")

    category = PropertyCategory(**payload.model_dump())
    db.add(category)
    await record(
        db, actor=actor, action="taxonomy.category.create", entity_type="category",
        entity_id=payload.slug, summary=f"Created category {payload.label}", request=request,
    )
    await db.commit()
    await db.refresh(category, ["subcategories"])
    await _invalidate()
    return CategoryOut.model_validate(category)


@router.patch("/categories/{category_id}", response_model=CategoryOut)
async def update_category(
    request: Request,
    category_id: uuid.UUID,
    payload: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_admin),
) -> CategoryOut:
    category = await db.scalar(
        select(PropertyCategory)
        .where(PropertyCategory.id == category_id)
        .options(
            selectinload(PropertyCategory.subcategories).selectinload(PropertySubCategory.fields)
        )
    )
    if category is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Category not found")

    before = category.as_dict()
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(category, key, value)

    await record(
        db, actor=actor, action="taxonomy.category.update", entity_type="category",
        entity_id=str(category_id), summary=f"Updated {category.label}",
        changes=diff(before, category.as_dict()), request=request,
    )
    await db.commit()
    await _invalidate()
    return CategoryOut.model_validate(category)


@router.delete("/categories/{category_id}", response_model=Message)
async def delete_category(
    request: Request,
    category_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_admin),
) -> Message:
    category = await db.scalar(
        select(PropertyCategory).where(PropertyCategory.id == category_id)
    )
    if category is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Category not found")

    in_use = await db.scalar(
        select(Property.id).where(Property.category_id == category_id).limit(1)
    )
    if in_use:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Properties are still filed under this category. Deactivate it instead of deleting.",
        )

    await record(
        db, actor=actor, action="taxonomy.category.delete", entity_type="category",
        entity_id=str(category_id), summary=f"Deleted {category.label}", request=request,
    )
    await db.delete(category)
    await db.commit()
    await _invalidate()
    return Message(detail="Category deleted")


# ------------------------------------------------------------------ subcategories
@router.post(
    "/categories/{category_id}/subcategories",
    response_model=SubCategoryOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_subcategory(
    request: Request,
    category_id: uuid.UUID,
    payload: SubCategoryCreate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_admin),
) -> SubCategoryOut:
    if not await db.scalar(select(PropertyCategory.id).where(PropertyCategory.id == category_id)):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Category not found")

    exists = await db.scalar(
        select(PropertySubCategory.id).where(
            PropertySubCategory.category_id == category_id,
            PropertySubCategory.slug == payload.slug,
        )
    )
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, "That form slug already exists here")

    sub = PropertySubCategory(category_id=category_id, **payload.model_dump())
    db.add(sub)
    await record(
        db, actor=actor, action="taxonomy.subcategory.create", entity_type="subcategory",
        entity_id=payload.slug, summary=f"Created form {payload.label}", request=request,
    )
    await db.commit()
    await db.refresh(sub, ["fields"])
    await _invalidate()
    return SubCategoryOut.model_validate(sub)


@router.patch("/subcategories/{subcategory_id}", response_model=SubCategoryOut)
async def update_subcategory(
    request: Request,
    subcategory_id: uuid.UUID,
    payload: SubCategoryUpdate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_admin),
) -> SubCategoryOut:
    sub = await db.scalar(
        select(PropertySubCategory)
        .where(PropertySubCategory.id == subcategory_id)
        .options(selectinload(PropertySubCategory.fields))
    )
    if sub is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Form not found")

    before = sub.as_dict()
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(sub, key, value)

    await record(
        db, actor=actor, action="taxonomy.subcategory.update", entity_type="subcategory",
        entity_id=str(subcategory_id), changes=diff(before, sub.as_dict()), request=request,
    )
    await db.commit()
    await _invalidate()
    return SubCategoryOut.model_validate(sub)


@router.delete("/subcategories/{subcategory_id}", response_model=Message)
async def delete_subcategory(
    request: Request,
    subcategory_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_admin),
) -> Message:
    sub = await db.scalar(
        select(PropertySubCategory).where(PropertySubCategory.id == subcategory_id)
    )
    if sub is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Form not found")

    in_use = await db.scalar(
        select(Property.id).where(Property.subcategory_id == subcategory_id).limit(1)
    )
    if in_use:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Properties still use this form. Deactivate it instead of deleting.",
        )

    await record(
        db, actor=actor, action="taxonomy.subcategory.delete", entity_type="subcategory",
        entity_id=str(subcategory_id), summary=f"Deleted {sub.label}", request=request,
    )
    await db.delete(sub)
    await db.commit()
    await _invalidate()
    return Message(detail="Form deleted")


# ------------------------------------------------------------------ fields
async def _resolve_options(
    db: AsyncSession, options: list[str] | None, option_set_key: str | None
) -> list[str] | None:
    """A field may carry literal options or borrow a shared OptionSet."""
    if option_set_key:
        row = await db.scalar(select(OptionSet).where(OptionSet.key == option_set_key))
        if row is None:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND, f"Option set '{option_set_key}' not found"
            )
        return list(row.values)
    return options


@router.post(
    "/subcategories/{subcategory_id}/fields",
    response_model=FormFieldOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_field(
    request: Request,
    subcategory_id: uuid.UUID,
    payload: FormFieldCreate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_admin),
) -> FormFieldOut:
    if not await db.scalar(
        select(PropertySubCategory.id).where(PropertySubCategory.id == subcategory_id)
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Form not found")

    exists = await db.scalar(
        select(PropertyFormField.id).where(
            PropertyFormField.subcategory_id == subcategory_id,
            PropertyFormField.name == payload.name,
        )
    )
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, "A field with that name already exists")

    data = payload.model_dump(exclude={"option_set_key", "conditional"})
    data["options"] = await _resolve_options(db, payload.options, payload.option_set_key)
    data["conditional"] = payload.conditional.model_dump() if payload.conditional else None

    field = PropertyFormField(subcategory_id=subcategory_id, **data)
    db.add(field)
    await record(
        db, actor=actor, action="taxonomy.field.create", entity_type="form_field",
        entity_id=payload.name, summary=f"Added field {payload.label}", request=request,
    )
    await db.commit()
    await db.refresh(field)
    await _invalidate()
    return FormFieldOut.model_validate(field)


@router.patch("/fields/{field_id}", response_model=FormFieldOut)
async def update_field(
    request: Request,
    field_id: uuid.UUID,
    payload: FormFieldUpdate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_admin),
) -> FormFieldOut:
    field = await db.scalar(select(PropertyFormField).where(PropertyFormField.id == field_id))
    if field is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Field not found")

    before = field.as_dict()
    updates = payload.model_dump(exclude_unset=True, exclude={"option_set_key", "conditional"})

    if payload.option_set_key is not None or payload.options is not None:
        updates["options"] = await _resolve_options(db, payload.options, payload.option_set_key)
    if "conditional" in payload.model_fields_set:
        updates["conditional"] = (
            payload.conditional.model_dump() if payload.conditional else None
        )

    for key, value in updates.items():
        setattr(field, key, value)

    await record(
        db, actor=actor, action="taxonomy.field.update", entity_type="form_field",
        entity_id=str(field_id), changes=diff(before, field.as_dict()), request=request,
    )
    await db.commit()
    await _invalidate()
    return FormFieldOut.model_validate(field)


@router.delete("/fields/{field_id}", response_model=Message)
async def delete_field(
    request: Request,
    field_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_admin),
) -> Message:
    field = await db.scalar(select(PropertyFormField).where(PropertyFormField.id == field_id))
    if field is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Field not found")

    await record(
        db, actor=actor, action="taxonomy.field.delete", entity_type="form_field",
        entity_id=str(field_id), summary=f"Removed field {field.label}", request=request,
    )
    await db.delete(field)
    await db.commit()
    await _invalidate()
    return Message(detail="Field deleted")


@router.post("/fields/reorder", response_model=Message)
async def reorder_fields(
    payload: ReorderRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> Message:
    """One round trip for a drag-and-drop reorder."""
    for item in payload.items:
        await db.execute(
            PropertyFormField.__table__.update()
            .where(PropertyFormField.id == uuid.UUID(item["id"]))
            .values(display_order=int(item["display_order"]))
        )
    await db.commit()
    await _invalidate()
    return Message(detail="Order saved")


# ------------------------------------------------------------------ option sets
@router.get("/option-sets", response_model=list[OptionSetOut])
async def list_option_sets(
    db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)
) -> list[OptionSetOut]:
    rows = (await db.scalars(select(OptionSet).order_by(OptionSet.key))).all()
    return [OptionSetOut.model_validate(r) for r in rows]


@router.post("/option-sets", response_model=OptionSetOut, status_code=status.HTTP_201_CREATED)
async def create_option_set(
    payload: OptionSetCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> OptionSetOut:
    if await db.scalar(select(OptionSet.id).where(OptionSet.key == payload.key)):
        raise HTTPException(status.HTTP_409_CONFLICT, "That option set key already exists")
    row = OptionSet(**payload.model_dump())
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return OptionSetOut.model_validate(row)


@router.patch("/option-sets/{option_set_id}", response_model=OptionSetOut)
async def update_option_set(
    option_set_id: uuid.UUID,
    payload: OptionSetUpdate,
    propagate: bool = True,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> OptionSetOut:
    row = await db.scalar(select(OptionSet).where(OptionSet.id == option_set_id))
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Option set not found")

    previous_values = list(row.values)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, key, value)

    # Keep every field that was built from this list in step with it.
    if propagate and payload.values is not None:
        fields = (
            await db.scalars(
                select(PropertyFormField).where(PropertyFormField.options == previous_values)
            )
        ).all()
        for field in fields:
            field.options = list(row.values)

    await db.commit()
    await _invalidate()
    return OptionSetOut.model_validate(row)


# ------------------------------------------------------------------ districts
@router.get("/districts", response_model=list[DistrictOut])
async def list_districts(
    db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)
) -> list[DistrictOut]:
    rows = (await db.scalars(select(District).order_by(District.display_order))).all()
    return [DistrictOut.model_validate(r) for r in rows]
