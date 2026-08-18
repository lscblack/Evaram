"""Clients, commissions, investments and manually-entered past sales."""

import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import Date, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_admin, require_agent, require_super_admin
from app.models.crm import (
    Client,
    ClientKind,
    Commission,
    CommissionBasis,
    CommissionStatus,
    Investment,
)
from app.models.property import Property, PropertySaleRecord
from app.models.user import User
from app.schemas.common import Message, Page
from app.schemas.crm import (
    ClientCreate,
    ClientDealSummary,
    ClientDetail,
    ClientOption,
    ClientOut,
    ClientUpdate,
    CommissionCreate,
    CommissionOut,
    CommissionUpdate,
    InvestmentCreate,
    InvestmentOut,
    InvestmentUpdate,
    PastSaleCreate,
)
from app.services.audit import diff, record

router = APIRouter(prefix="/admin", tags=["admin:crm"])


def _display_name(payload) -> str:
    if payload.kind is ClientKind.COMPANY:
        return (payload.company_name or "").strip()
    return (payload.full_name or "").strip()


# =================================================================== clients
@router.get("/clients", response_model=Page[ClientOut], summary="Everyone we deal with")
async def list_clients(
    q: str | None = Query(None, description="Name, phone, email, TIN or national ID"),
    kind: ClientKind | None = None,
    active: bool | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(24, ge=1, le=96),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_agent),
) -> Page[ClientOut]:
    stmt = select(Client)
    if kind:
        stmt = stmt.where(Client.kind == kind)
    if active is not None:
        stmt = stmt.where(Client.is_active.is_(active))
    if q:
        needle = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Client.display_name.ilike(needle),
                Client.phone.ilike(needle),
                Client.email.ilike(needle),
                Client.tin.ilike(needle),
                Client.national_id.ilike(needle),
                Client.company_name.ilike(needle),
                Client.full_name.ilike(needle),
            )
        )

    total = await db.scalar(
        select(func.count()).select_from(stmt.order_by(None).with_only_columns(Client.id).subquery())
    ) or 0
    rows = (
        await db.scalars(
            stmt.order_by(Client.display_name).offset((page - 1) * per_page).limit(per_page)
        )
    ).all()
    return Page.build([ClientOut.model_validate(r) for r in rows], total, page, per_page)


@router.get(
    "/clients/options",
    response_model=list[ClientOption],
    summary="Clients for a dropdown",
)
async def client_options(
    q: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_agent),
) -> list[ClientOption]:
    """Feeds the seller picker on the property form.

    Declared before `/clients/{client_id}` so "options" is not read as a UUID.
    """
    stmt = select(Client).where(Client.is_active.is_(True))
    if q:
        stmt = stmt.where(Client.display_name.ilike(f"%{q.strip()}%"))
    rows = (await db.scalars(stmt.order_by(Client.display_name).limit(200))).all()
    return [ClientOption.model_validate(r) for r in rows]


async def _summarise(db: AsyncSession, client_id: uuid.UUID) -> ClientDealSummary:
    """What this client is worth to us, computed rather than stored.

    Storing running totals would drift the first time a sale is corrected; these
    are small aggregate queries over indexed columns.
    """
    listings_total = await db.scalar(
        select(func.count(Property.id)).where(Property.seller_client_id == client_id)
    ) or 0
    listings_live = await db.scalar(
        select(func.count(Property.id)).where(
            Property.seller_client_id == client_id, Property.is_archived.is_(False)
        )
    ) or 0

    sold = (
        await db.execute(
            select(func.count(PropertySaleRecord.id), func.coalesce(func.sum(PropertySaleRecord.sold_price), 0))
            .where(PropertySaleRecord.seller_client_id == client_id)
        )
    ).one()
    bought = (
        await db.execute(
            select(func.count(PropertySaleRecord.id), func.coalesce(func.sum(PropertySaleRecord.sold_price), 0))
            .where(PropertySaleRecord.buyer_client_id == client_id)
        )
    ).one()

    commission_total = await db.scalar(
        select(func.coalesce(func.sum(Commission.amount), 0)).where(
            Commission.client_id == client_id, Commission.status != CommissionStatus.WRITTEN_OFF
        )
    ) or 0
    commission_received = await db.scalar(
        select(func.coalesce(func.sum(Commission.amount), 0)).where(
            Commission.client_id == client_id, Commission.status == CommissionStatus.RECEIVED
        )
    ) or 0
    invested = await db.scalar(
        select(func.coalesce(func.sum(Investment.amount), 0)).where(Investment.client_id == client_id)
    ) or 0

    # Cast to date in SQL, not in Python. `sold_at` is timestamptz and comes
    # back normalised to UTC, so a midnight Kigali sale (00:00+02) arrives as
    # 22:00 the previous day — and `.date()` then reports the wrong day.
    # Postgres applies the session timezone when casting, which is what the
    # business means by "the day of the sale".
    dates = (
        await db.execute(
            select(
                func.min(func.cast(PropertySaleRecord.sold_at, Date)),
                func.max(func.cast(PropertySaleRecord.sold_at, Date)),
            ).where(
                or_(
                    PropertySaleRecord.seller_client_id == client_id,
                    PropertySaleRecord.buyer_client_id == client_id,
                )
            )
        )
    ).one()

    return ClientDealSummary(
        listings_total=listings_total,
        listings_live=listings_live,
        sold_count=sold[0] or 0,
        sold_value=float(sold[1] or 0),
        bought_count=bought[0] or 0,
        bought_value=float(bought[1] or 0),
        commission_total=float(commission_total),
        commission_received=float(commission_received),
        commission_pending=float(commission_total) - float(commission_received),
        invested_total=float(invested),
        first_deal_on=dates[0],
        last_deal_on=dates[1],
    )


@router.get("/clients/{client_id}", response_model=ClientDetail, summary="One client and their history")
async def get_client(
    client_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_agent),
) -> ClientDetail:
    row = await db.scalar(select(Client).where(Client.id == client_id))
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Client not found")
    return ClientDetail(
        **ClientOut.model_validate(row).model_dump(),
        summary=await _summarise(db, client_id),
    )


@router.post(
    "/clients",
    response_model=ClientOut,
    status_code=status.HTTP_201_CREATED,
    summary="Add a client",
)
async def create_client(
    request: Request,
    payload: ClientCreate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_agent),
) -> ClientOut:
    row = Client(
        **payload.model_dump(),
        display_name=_display_name(payload),
        created_by_id=actor.id,
    )
    db.add(row)
    await db.flush()
    await record(
        db, actor=actor, action="client.create", entity_type="client", entity_id=row.id,
        summary=f"Added {row.kind.value} client {row.display_name!r}", request=request,
    )
    await db.commit()
    await db.refresh(row)
    return ClientOut.model_validate(row)


@router.patch("/clients/{client_id}", response_model=ClientOut, summary="Edit a client")
async def update_client(
    request: Request,
    client_id: uuid.UUID,
    payload: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_agent),
) -> ClientOut:
    row = await db.scalar(select(Client).where(Client.id == client_id))
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Client not found")

    changes = payload.model_dump(exclude_unset=True)
    before = {k: getattr(row, k) for k in changes}
    for field, value in changes.items():
        setattr(row, field, value)

    # The denormalised label has to follow whichever name field moved.
    if {"full_name", "company_name", "kind"} & changes.keys():
        row.display_name = (
            (row.company_name or "").strip()
            if row.kind is ClientKind.COMPANY
            else (row.full_name or "").strip()
        ) or row.display_name

    await record(
        db, actor=actor, action="client.update", entity_type="client", entity_id=row.id,
        summary=f"Edited client {row.display_name!r}", changes=diff(before, changes), request=request,
    )
    await db.commit()
    await db.refresh(row)
    return ClientOut.model_validate(row)


@router.delete("/clients/{client_id}", response_model=Message, summary="Delete a client")
async def delete_client(
    request: Request,
    client_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_super_admin),
) -> Message:
    """Refuses while anything still points at them.

    Deactivating keeps the trading history readable; deleting a client that owns
    sale records would leave those records anonymous.
    """
    row = await db.scalar(select(Client).where(Client.id == client_id))
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Client not found")

    linked = (
        (await db.scalar(select(func.count(Property.id)).where(Property.seller_client_id == client_id)) or 0)
        + (await db.scalar(select(func.count(PropertySaleRecord.id)).where(
            or_(PropertySaleRecord.seller_client_id == client_id,
                PropertySaleRecord.buyer_client_id == client_id))) or 0)
        + (await db.scalar(select(func.count(Commission.id)).where(Commission.client_id == client_id)) or 0)
    )
    if linked:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"{row.display_name} is attached to {linked} record(s). Deactivate them instead.",
        )

    name = row.display_name
    await record(
        db, actor=actor, action="client.delete", entity_type="client", entity_id=row.id,
        summary=f"Deleted client {name!r}", request=request,
    )
    await db.delete(row)
    await db.commit()
    return Message(detail=f"{name} deleted")


# =============================================================== commissions
async def _decorate_commissions(db: AsyncSession, rows: list[Commission]) -> list[CommissionOut]:
    """Attach the names a list has to show, in three queries rather than 3×N."""
    client_ids = {r.client_id for r in rows if r.client_id}
    agent_ids = {r.agent_id for r in rows if r.agent_id}
    property_ids = {r.property_id for r in rows if r.property_id}

    clients = {
        c.id: c.display_name
        for c in (await db.scalars(select(Client).where(Client.id.in_(client_ids)))).all()
    } if client_ids else {}
    agents = {
        u.id: u.full_name
        for u in (await db.scalars(select(User).where(User.id.in_(agent_ids)))).all()
    } if agent_ids else {}
    properties = {
        p.id: p.reference_number
        for p in (await db.scalars(select(Property).where(Property.id.in_(property_ids)))).all()
    } if property_ids else {}

    out = []
    for r in rows:
        item = CommissionOut.model_validate(r)
        item.client_name = clients.get(r.client_id)
        item.agent_name = agents.get(r.agent_id)
        item.property_reference = properties.get(r.property_id)
        out.append(item)
    return out


@router.get("/commissions", response_model=Page[CommissionOut], summary="Commission ledger")
async def list_commissions(
    commission_status: CommissionStatus | None = Query(None, alias="status"),
    client_id: uuid.UUID | None = None,
    agent_id: uuid.UUID | None = None,
    since: date | None = None,
    until: date | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(24, ge=1, le=96),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> Page[CommissionOut]:
    stmt = select(Commission)
    if commission_status:
        stmt = stmt.where(Commission.status == commission_status)
    if client_id:
        stmt = stmt.where(Commission.client_id == client_id)
    if agent_id:
        stmt = stmt.where(Commission.agent_id == agent_id)
    if since:
        stmt = stmt.where(Commission.earned_on >= since)
    if until:
        stmt = stmt.where(Commission.earned_on <= until)

    total = await db.scalar(
        select(func.count()).select_from(
            stmt.order_by(None).with_only_columns(Commission.id).subquery()
        )
    ) or 0
    rows = (
        await db.scalars(
            stmt.order_by(Commission.earned_on.desc()).offset((page - 1) * per_page).limit(per_page)
        )
    ).all()
    return Page.build(await _decorate_commissions(db, list(rows)), total, page, per_page)


@router.get("/commissions/summary", summary="Totals for the dashboard")
async def commission_summary(
    since: date | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> dict:
    stmt = select(Commission.status, func.count(Commission.id), func.coalesce(func.sum(Commission.amount), 0))
    if since:
        stmt = stmt.where(Commission.earned_on >= since)
    rows = (await db.execute(stmt.group_by(Commission.status))).all()

    by_status = {s.value: {"count": c, "amount": float(a)} for s, c, a in rows}
    earned = sum(v["amount"] for k, v in by_status.items() if k != CommissionStatus.WRITTEN_OFF.value)
    return {
        "by_status": by_status,
        "earned_total": earned,
        "received_total": by_status.get(CommissionStatus.RECEIVED.value, {}).get("amount", 0.0),
        "pending_total": earned - by_status.get(CommissionStatus.RECEIVED.value, {}).get("amount", 0.0),
    }


@router.post(
    "/commissions",
    response_model=CommissionOut,
    status_code=status.HTTP_201_CREATED,
    summary="Book a commission",
)
async def create_commission(
    request: Request,
    payload: CommissionCreate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_admin),
) -> CommissionOut:
    row = Commission(**payload.model_dump(), recorded_by_id=actor.id)
    db.add(row)
    await db.flush()
    await record(
        db, actor=actor, action="commission.create", entity_type="commission", entity_id=row.id,
        summary=f"Booked {row.currency} {float(row.amount):,.0f} commission", request=request,
    )
    await db.commit()
    await db.refresh(row)
    return (await _decorate_commissions(db, [row]))[0]


@router.patch("/commissions/{commission_id}", response_model=CommissionOut, summary="Edit a commission")
async def update_commission(
    request: Request,
    commission_id: uuid.UUID,
    payload: CommissionUpdate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_admin),
) -> CommissionOut:
    row = await db.scalar(select(Commission).where(Commission.id == commission_id))
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Commission not found")

    changes = payload.model_dump(exclude_unset=True)
    before = {k: getattr(row, k) for k in changes}
    for field, value in changes.items():
        setattr(row, field, value)

    # Marking it received without a date makes the ageing report meaningless.
    if row.status is CommissionStatus.RECEIVED and row.received_on is None:
        row.received_on = date.today()

    await record(
        db, actor=actor, action="commission.update", entity_type="commission", entity_id=row.id,
        summary=f"Edited commission {row.reference or row.id}",
        changes=diff(before, changes), request=request,
    )
    await db.commit()
    await db.refresh(row)
    return (await _decorate_commissions(db, [row]))[0]


@router.delete("/commissions/{commission_id}", response_model=Message)
async def delete_commission(
    request: Request,
    commission_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_super_admin),
) -> Message:
    row = await db.scalar(select(Commission).where(Commission.id == commission_id))
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Commission not found")
    await record(
        db, actor=actor, action="commission.delete", entity_type="commission", entity_id=row.id,
        summary=f"Deleted commission of {row.currency} {float(row.amount):,.0f}", request=request,
    )
    await db.delete(row)
    await db.commit()
    return Message(detail="Commission deleted")


# =============================================================== investments
@router.get("/investments", response_model=Page[InvestmentOut], summary="What we have put in")
async def list_investments(
    property_id: uuid.UUID | None = None,
    client_id: uuid.UUID | None = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(24, ge=1, le=96),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> Page[InvestmentOut]:
    stmt = select(Investment)
    if property_id:
        stmt = stmt.where(Investment.property_id == property_id)
    if client_id:
        stmt = stmt.where(Investment.client_id == client_id)

    total = await db.scalar(
        select(func.count()).select_from(
            stmt.order_by(None).with_only_columns(Investment.id).subquery()
        )
    ) or 0
    rows = (
        await db.scalars(
            stmt.order_by(Investment.spent_on.desc()).offset((page - 1) * per_page).limit(per_page)
        )
    ).all()

    clients = {
        c.id: c.display_name for c in (await db.scalars(select(Client))).all()
    }
    properties = {
        p.id: p.reference_number for p in (await db.scalars(select(Property))).all()
    }
    items = []
    for r in rows:
        item = InvestmentOut.model_validate(r)
        item.client_name = clients.get(r.client_id)
        item.property_reference = properties.get(r.property_id)
        items.append(item)
    return Page.build(items, total, page, per_page)


@router.post(
    "/investments",
    response_model=InvestmentOut,
    status_code=status.HTTP_201_CREATED,
    summary="Record money put into a property",
)
async def create_investment(
    request: Request,
    payload: InvestmentCreate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_admin),
) -> InvestmentOut:
    row = Investment(**payload.model_dump(), recorded_by_id=actor.id)
    db.add(row)
    await db.flush()
    await record(
        db, actor=actor, action="investment.create", entity_type="investment", entity_id=row.id,
        summary=f"{row.kind.value}: {row.currency} {float(row.amount):,.0f} — {row.label}",
        request=request,
    )
    await db.commit()
    await db.refresh(row)
    return InvestmentOut.model_validate(row)


@router.patch("/investments/{investment_id}", response_model=InvestmentOut)
async def update_investment(
    request: Request,
    investment_id: uuid.UUID,
    payload: InvestmentUpdate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_admin),
) -> InvestmentOut:
    row = await db.scalar(select(Investment).where(Investment.id == investment_id))
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Investment not found")
    changes = payload.model_dump(exclude_unset=True)
    before = {k: getattr(row, k) for k in changes}
    for field, value in changes.items():
        setattr(row, field, value)
    await record(
        db, actor=actor, action="investment.update", entity_type="investment", entity_id=row.id,
        summary=f"Edited investment {row.label!r}", changes=diff(before, changes), request=request,
    )
    await db.commit()
    await db.refresh(row)
    return InvestmentOut.model_validate(row)


@router.delete("/investments/{investment_id}", response_model=Message)
async def delete_investment(
    request: Request,
    investment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_super_admin),
) -> Message:
    row = await db.scalar(select(Investment).where(Investment.id == investment_id))
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Investment not found")
    await record(
        db, actor=actor, action="investment.delete", entity_type="investment", entity_id=row.id,
        summary=f"Deleted investment {row.label!r}", request=request,
    )
    await db.delete(row)
    await db.commit()
    return Message(detail="Investment deleted")


# ================================================================ past sales
@router.post(
    "/past-sales",
    response_model=Message,
    status_code=status.HTTP_201_CREATED,
    summary="Enter a deal that closed before the system existed",
)
async def create_past_sale(
    request: Request,
    payload: PastSaleCreate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_admin),
) -> Message:
    """Writes the sale record, and the commission alongside it when given.

    Flagged `is_historic` so month-on-month reporting can exclude backfilled
    deals without anyone having to remember which ones they were.
    """
    sale = PropertySaleRecord(
        reference_number=payload.reference_number,
        title=payload.title,
        upi=payload.upi,
        location=payload.location,
        district=payload.district,
        sector=payload.sector,
        size=payload.size,
        sold_price=payload.sold_price,
        currency=payload.currency,
        sold_at=payload.sold_at,
        owner_name=payload.owner_name,
        buyer_name=payload.buyer_name,
        seller_client_id=payload.seller_client_id,
        buyer_client_id=payload.buyer_client_id,
        agent_id=payload.agent_id,
        notes=payload.notes,
        is_historic=True,
        recorded_by_id=actor.id,
    )
    db.add(sale)
    await db.flush()

    booked = None
    if payload.commission_basis:
        amount = payload.commission_amount
        if amount is None and payload.commission_basis == "percent":
            if payload.commission_rate is None or payload.sold_price is None:
                raise HTTPException(
                    status.HTTP_422_UNPROCESSABLE_ENTITY,
                    "A percent commission needs both a rate and a sale price.",
                )
            amount = round(float(payload.sold_price) * payload.commission_rate / 100, 2)
        if amount is None:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY, "A fixed commission needs an amount."
            )

        booked = Commission(
            sale_record_id=sale.id,
            client_id=payload.seller_client_id,
            agent_id=payload.agent_id,
            basis=CommissionBasis(payload.commission_basis),
            rate=payload.commission_rate,
            base_amount=payload.sold_price,
            amount=amount,
            currency=payload.currency,
            status=CommissionStatus.RECEIVED,
            earned_on=payload.sold_at.date(),
            received_on=payload.sold_at.date(),
            notes="Booked with a backfilled past sale.",
            recorded_by_id=actor.id,
        )
        db.add(booked)

    # The agent's public counter tracks recorded sales, historic ones included.
    if payload.agent_id:
        agent = await db.scalar(select(User).where(User.id == payload.agent_id))
        if agent:
            agent.deals_closed = (agent.deals_closed or 0) + 1

    await record(
        db, actor=actor, action="sale.backfill", entity_type="property_sale_record",
        entity_id=sale.id,
        summary=f"Recorded past sale {sale.reference_number} for {payload.currency} "
                f"{float(payload.sold_price or 0):,.0f}",
        request=request,
    )
    await db.commit()

    detail = f"Past sale {sale.reference_number} recorded"
    if booked is not None:
        detail += f", with {payload.currency} {float(booked.amount):,.0f} commission"
    return Message(detail=detail)
