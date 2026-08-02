"""Offers on a property, and closing a listing out into the sale history."""

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.property import (
    BidStatus,
    Property,
    PropertyBid,
    PropertySaleRecord,
    PropertyStatus,
)
from app.schemas.property import BidSummary, SaleRecordCreate

#: Statuses that still count towards the public "highest offer".
LIVE_BID_STATUSES = (BidStatus.PENDING, BidStatus.ACCEPTED)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def bidding_is_open(prop: Property) -> bool:
    if not prop.allow_bidding or prop.is_archived:
        return False
    if prop.status not in (PropertyStatus.AVAILABLE, PropertyStatus.UNDER_OFFER):
        return False
    if prop.bidding_closes_at and prop.bidding_closes_at <= _now():
        return False
    return True


async def summarise(db: AsyncSession, prop: Property) -> BidSummary | None:
    """The aggregate the public page is allowed to show.

    Deliberately returns the highest figure and a count only. Who bid, and what
    each of them offered, never leaves the console.
    """
    if not prop.allow_bidding:
        return None

    row = (
        await db.execute(
            select(func.max(PropertyBid.amount), func.count(PropertyBid.id)).where(
                PropertyBid.property_id == prop.id,
                PropertyBid.status.in_(LIVE_BID_STATUSES),
            )
        )
    ).one()

    highest, count = row
    return BidSummary(
        highest=float(highest) if highest is not None else None,
        count=count or 0,
        currency=prop.currency,
        closes_at=prop.bidding_closes_at,
        is_open=bidding_is_open(prop),
    )


async def floor_for(db: AsyncSession, prop: Property) -> float:
    """The smallest offer we will accept right now.

    A bid has to beat both the seller's floor and whatever is already on the
    table — otherwise the "highest offer" figure could go backwards.
    """
    seller_floor = float(prop.min_bid) if prop.min_bid is not None else 0.0
    highest = await db.scalar(
        select(func.max(PropertyBid.amount)).where(
            PropertyBid.property_id == prop.id,
            PropertyBid.status.in_(LIVE_BID_STATUSES),
        )
    )
    return max(seller_floor, float(highest) + 1 if highest is not None else 0.0)


async def place_bid(
    db: AsyncSession,
    prop: Property,
    bidder_id: uuid.UUID,
    amount: float,
    message: str | None,
    ip_address: str | None,
) -> PropertyBid:
    if not bidding_is_open(prop):
        raise HTTPException(
            status.HTTP_409_CONFLICT, "This property is not accepting offers right now"
        )

    floor = await floor_for(db, prop)
    if amount < floor:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            f"Your offer must be at least {prop.currency} {floor:,.0f}",
        )

    # One live offer per person: raising a bid replaces the previous one rather
    # than stacking, so the count reflects interested people, not keystrokes.
    previous = (
        await db.scalars(
            select(PropertyBid).where(
                PropertyBid.property_id == prop.id,
                PropertyBid.bidder_id == bidder_id,
                PropertyBid.status == BidStatus.PENDING,
            )
        )
    ).all()
    for row in previous:
        row.status = BidStatus.WITHDRAWN

    bid = PropertyBid(
        property_id=prop.id,
        bidder_id=bidder_id,
        amount=amount,
        currency=prop.currency,
        message=message,
        ip_address=ip_address,
    )
    db.add(bid)
    await db.flush()
    return bid


async def decide(
    db: AsyncSession,
    bid: PropertyBid,
    prop: Property,
    *,
    accept: bool,
    actor_id: uuid.UUID,
    note: str | None,
) -> None:
    if bid.status is not BidStatus.PENDING:
        raise HTTPException(status.HTTP_409_CONFLICT, "That offer has already been decided")

    bid.status = BidStatus.ACCEPTED if accept else BidStatus.REJECTED
    bid.decided_at = _now()
    bid.decided_by_id = actor_id
    bid.decision_note = note

    if accept:
        # Accepting one offer takes the property off the market and marks the
        # rest as outbid, so nobody is left waiting on a dead thread.
        prop.status = PropertyStatus.UNDER_OFFER
        others = (
            await db.scalars(
                select(PropertyBid).where(
                    PropertyBid.property_id == prop.id,
                    PropertyBid.id != bid.id,
                    PropertyBid.status == BidStatus.PENDING,
                )
            )
        ).all()
        for row in others:
            row.status = BidStatus.OUTBID


def snapshot_of(prop: Property) -> dict:
    """Everything needed to rebuild this listing later, field by field."""
    return {
        "reference_number": prop.reference_number,
        "upi": prop.upi,
        "title": prop.title,
        "summary": prop.summary,
        "description": prop.description,
        "category_id": str(prop.category_id),
        "subcategory_id": str(prop.subcategory_id),
        "location": prop.location,
        "province": prop.province,
        "district": prop.district,
        "sector": prop.sector,
        "cell": prop.cell,
        "village": prop.village,
        "latitude": prop.latitude,
        "longitude": prop.longitude,
        "boundary_geojson": prop.boundary_geojson,
        "boundary_points": prop.boundary_points,
        "boundary_area_sqm": prop.boundary_area_sqm,
        "parcel_id": prop.parcel_id,
        "size": prop.size,
        "built_area": prop.built_area,
        "land_use": prop.land_use,
        "right_type": prop.right_type,
        "bedrooms": prop.bedrooms,
        "bathrooms": prop.bathrooms,
        "intent": prop.intent.value,
        "currency": prop.currency,
        "price": float(prop.price) if prop.price is not None else None,
        "details": prop.details,
        "parcel_information": prop.parcel_information,
        "tags": prop.tags,
        "amenities": prop.amenities,
        "owner_name": prop.owner_name,
        "owner_contact": prop.owner_contact,
        "media": [
            {"kind": m.kind.value, "url": m.url, "is_cover": m.is_cover,
             "display_order": m.display_order}
            for m in prop.media
        ],
    }


async def record_sale(
    db: AsyncSession,
    prop: Property,
    payload: SaleRecordCreate,
    actor_id: uuid.UUID,
) -> PropertySaleRecord:
    """Close the listing out.

    The property is archived rather than deleted, which both preserves the audit
    trail and releases its reference and UPI — so the same parcel can be listed
    again later without colliding with its own history.
    """
    if prop.is_archived:
        raise HTTPException(status.HTTP_409_CONFLICT, "That listing is already closed")

    sold_price = payload.sold_price
    winning_bid = None
    if payload.winning_bid_id:
        winning_bid = await db.scalar(
            select(PropertyBid).where(
                PropertyBid.id == payload.winning_bid_id,
                PropertyBid.property_id == prop.id,
            )
        )
        if winning_bid is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "That offer is not on this property")
        if sold_price is None:
            sold_price = float(winning_bid.amount)
        winning_bid.status = BidStatus.ACCEPTED
        winning_bid.decided_at = _now()
        winning_bid.decided_by_id = actor_id

    if sold_price is None and prop.price is not None:
        sold_price = float(prop.price)

    record = PropertySaleRecord(
        property_id=prop.id,
        reference_number=prop.reference_number,
        upi=prop.upi,
        title=prop.title,
        category_id=prop.category_id,
        subcategory_id=prop.subcategory_id,
        location=prop.location,
        district=prop.district,
        sector=prop.sector,
        size=prop.size,
        sold_price=sold_price,
        currency=prop.currency,
        sold_at=payload.sold_at or _now(),
        owner_name=prop.owner_name,
        owner_contact=prop.owner_contact,
        buyer_name=payload.buyer_name,
        buyer_contact=payload.buyer_contact,
        agent_id=prop.agent_id,
        winning_bid_id=winning_bid.id if winning_bid else None,
        snapshot=snapshot_of(prop),
        notes=payload.notes,
    )
    db.add(record)

    prop.status = PropertyStatus.SOLD
    prop.is_archived = True
    prop.archived_at = _now()
    prop.show_on_public = False
    prop.allow_bidding = False

    # Any offer still open is dead the moment the sale is recorded.
    remaining = (
        await db.scalars(
            select(PropertyBid).where(
                PropertyBid.property_id == prop.id,
                PropertyBid.status == BidStatus.PENDING,
            )
        )
    ).all()
    for row in remaining:
        row.status = BidStatus.OUTBID

    await db.flush()
    return record
