"""Demo data: a realistic sample portfolio for trying the product, removable as a set.

Everything is created through the normal domain services (so it obeys the same
rules as real data) and flagged with ``is_demo`` on the property / tenant.
``clear_demo`` removes demo properties and every record attached to their units,
plus demo tenants that have nothing left. Real records are never touched; the
audit log is append-only and keeps its history.
"""

from __future__ import annotations

import io
import random
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal

from fastapi import Request
from PIL import Image, ImageDraw, ImageFilter
from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.orm import Session

from evaramu.core.errors import Conflict
from evaramu.core.storage import save_image
from evaramu.modules.agreements import service as agreements
from evaramu.modules.agreements.models import AgreementDocument, DepositTransaction, RentalAgreement
from evaramu.modules.billing import service as billing
from evaramu.modules.billing.models import (
    FinancialAdjustment,
    Invoice,
    Payment,
    PaymentAllocation,
)
from evaramu.modules.identity.models import User
from evaramu.modules.properties import service as properties
from evaramu.modules.properties.models import (
    Property,
    PropertyImage,
    RentalUnit,
    ReservedCode,
    UnitStatusHistory,
)
from evaramu.modules.system.models import Inquiry, Notification
from evaramu.modules.system.services import audit
from evaramu.modules.tenants.models import Tenant

# ------------------------------------------------------------------ images ----

_PALETTES = [  # (sky top, sky bottom, facade, accent)
    ((120, 170, 220), (226, 238, 248), (236, 229, 216), (3, 42, 78)),
    ((242, 170, 120), (252, 228, 196), (226, 214, 196), (120, 72, 40)),
    ((94, 140, 196), (204, 224, 240), (214, 220, 226), (40, 70, 100)),
    ((150, 196, 226), (236, 244, 248), (246, 240, 228), (188, 122, 38)),
]


def _illustration(seed: int, width: int = 1280, height: int = 840) -> bytes:
    """A soft architectural illustration — stands in for a photograph."""
    rnd = random.Random(seed)
    sky_top, sky_bottom, facade, accent = _PALETTES[seed % len(_PALETTES)]
    img = Image.new("RGB", (width, height))
    d = ImageDraw.Draw(img)
    for y in range(height):
        t = y / height
        d.line([(0, y), (width, y)], fill=tuple(int(a + (b - a) * t) for a, b in zip(sky_top, sky_bottom, strict=True)))
    # distant hills
    for layer, shade in ((0.62, (130, 160, 120)), (0.70, (96, 132, 92))):
        pts = [(0, height)]
        for x in range(0, width + 80, 80):
            pts.append((x, int(height * layer + rnd.randint(-30, 30))))
        pts.append((width, height))
        d.polygon(pts, fill=shade)
    ground_y = int(height * 0.82)
    d.rectangle([0, ground_y, width, height], fill=(108, 142, 88))
    d.rectangle([0, ground_y + 40, width, height], fill=(170, 160, 146))
    # buildings
    x = rnd.randint(60, 140)
    while x < width - 160:
        bw = rnd.randint(220, 380)
        floors = rnd.randint(2, 6)
        bh = floors * 78 + 40
        top = ground_y - bh
        tint = tuple(max(0, min(255, c + rnd.randint(-14, 10))) for c in facade)
        d.rectangle([x + 10, top + 10, x + bw + 10, ground_y], fill=(0, 0, 0))  # shadow
        d.rectangle([x, top, x + bw, ground_y], fill=tint)
        d.rectangle([x - 8, top - 14, x + bw + 8, top], fill=accent)
        cols = max(2, bw // 70)
        gap = bw / cols
        for f in range(floors):
            wy = top + 34 + f * 78
            for c in range(cols):
                wx = int(x + gap * c + gap * 0.22)
                lit = rnd.random() < 0.25
                glass = (250, 222, 160) if lit else (150, 186, 212)
                d.rectangle([wx, wy, wx + int(gap * 0.56), wy + 44], fill=glass, outline=accent, width=3)
        door_x = x + bw // 2 - 22
        d.rectangle([door_x, ground_y - 70, door_x + 44, ground_y], fill=accent)
        x += bw + rnd.randint(60, 140)
    # trees
    for _ in range(rnd.randint(3, 6)):
        tx = rnd.randint(20, width - 20)
        r = rnd.randint(28, 52)
        d.rectangle([tx - 5, ground_y - r, tx + 5, ground_y + 10], fill=(92, 64, 44))
        d.ellipse([tx - r, ground_y - 2 * r - 20, tx + r, ground_y - 10], fill=(64, 118, 70))
    img = img.filter(ImageFilter.GaussianBlur(0.6))
    buf = io.BytesIO()
    img.save(buf, "PNG")
    return buf.getvalue()


# -------------------------------------------------------------- catalogue ----


@dataclass
class _Unit:
    code: str
    name: str
    unit_type: str
    bedrooms: int
    bathrooms: int
    rent: str
    currency: str
    size: str | None = None
    floor: str = ""
    furnished: bool = False
    featured: bool = False
    status: str = "available"           # available | maintenance | reserved | occupied
    amenities: list[str] = field(default_factory=list)
    description: str = ""
    toilet: str = "private"             # private | shared


@dataclass
class _Property:
    code: str
    name: str
    property_type: str
    district: str
    sector: str
    address: str
    description: str
    amenities: list[str]
    units: list[_Unit]
    usage: str = "residential"          # residential | commercial | mixed


CATALOGUE: list[_Property] = [
    _Property(
        "DEMO-KHA", "Kacyiru Hillside Apartments", "building", "Gasabo", "Kacyiru", "KG 7 Ave, Kacyiru",
        "A modern five-storey apartment block a short walk from the ministries and embassies, with lift access, "
        "secure underground parking and round-the-clock security.",
        ["Parking", "Lift", "Backup generator", "Water tank", "24/7 security"],
        [
            _Unit("DEMO-KHA-A1", "Apartment A1 — two bedrooms", "apartment", 2, 2, "650000", "RWF", "92", "1st floor",
                  featured=True, amenities=["Balcony", "Fitted kitchen"],
                  description="Bright two-bedroom apartment with a city-view balcony and fitted kitchen."),
            _Unit("DEMO-KHA-A2", "Apartment A2 — three bedrooms, furnished", "apartment", 3, 2, "950", "USD", "128",
                  "2nd floor", furnished=True, featured=True, amenities=["Furnished", "Balcony", "Wi-Fi ready"],
                  description="Fully furnished family apartment, ideal for expatriates and long stays."),
            _Unit("DEMO-KHA-A3", "Apartment A3 — one bedroom", "apartment", 1, 1, "420000", "RWF", "58", "3rd floor",
                  status="occupied"),
            _Unit("DEMO-KHA-A4", "Apartment A4 — two bedrooms", "apartment", 2, 2, "600000", "RWF", "90", "3rd floor",
                  status="occupied"),
            _Unit("DEMO-KHA-A5", "Apartment A5 — penthouse", "apartment", 3, 3, "1800", "USD", "160", "5th floor",
                  status="maintenance", description="Penthouse undergoing kitchen renovation."),
        ],
    ),
    _Property(
        "DEMO-NYV", "Nyarutarama Garden Villa", "house", "Gasabo", "Remera", "KG 9 Ave, Nyarutarama",
        "A spacious family villa in a quiet, leafy street near the golf course, with a landscaped garden, "
        "staff quarters and a double garage.",
        ["Garden", "Garage", "Staff quarters", "Borehole"],
        [
            _Unit("DEMO-NYV-H", "Four-bedroom villa with garden", "house", 4, 4, "2400", "USD", "320", "",
                  featured=True, amenities=["Garden", "Fireplace", "Double garage"],
                  description="The whole villa: four en-suite bedrooms, two lounges and a large garden."),
        ],
    ),
    _Property(
        "DEMO-KGR", "Kimihurura Garden Rooms", "house", "Gasabo", "Kimihurura", "KG 5 Ave, Kimihurura",
        "Comfortable private rooms in a shared, fully serviced house — popular with young professionals. "
        "Cleaning, water, electricity and Wi-Fi are included.",
        ["Wi-Fi", "Cleaning", "Shared kitchen", "Security"],
        [
            _Unit("DEMO-KGR-R1", "Garden room 1 — en-suite", "room", 1, 1, "220000", "RWF", "22", "Ground floor",
                  furnished=True),
            _Unit("DEMO-KGR-R2", "Garden room 2", "room", 1, 0, "160000", "RWF", "16", "Ground floor",
                  furnished=True, status="occupied", toilet="shared"),
            _Unit("DEMO-KGR-R3", "Garden room 3", "room", 1, 0, "150000", "RWF", "15", "1st floor", furnished=True,
                  toilet="shared"),
            _Unit("DEMO-KGR-R4", "Garden room 4 — balcony", "room", 1, 1, "200000", "RWF", "20", "1st floor",
                  furnished=True, status="occupied"),
        ],
    ),
    _Property(
        "DEMO-KCS", "Kiyovu Studios & Offices", "building", "Nyarugenge", "Nyarugenge", "KN 3 Rd, Kiyovu",
        "Mixed-use building in the city centre with compact studios upstairs and street-front office space.",
        ["Parking", "Fibre internet", "Backup generator"],
        [
            _Unit("DEMO-KCS-S1", "Studio S1", "studio", 0, 1, "300000", "RWF", "34", "2nd floor", furnished=True),
            _Unit("DEMO-KCS-S2", "Studio S2", "studio", 0, 1, "320000", "RWF", "36", "2nd floor", furnished=True,
                  status="reserved"),
            _Unit("DEMO-KCS-O1", "Ground-floor office", "commercial", 0, 0, "1200", "USD", "85", "Ground floor",
                  status="occupied", description="Street-front office with reception area and two private rooms."),
        ],
        usage="mixed",
    ),
    _Property(
        "DEMO-BCH", "Bisambu Commercial House", "building", "Kicukiro", "Gatenga", "Bisambu, Nyarurama",
        "A row of street-front shop rooms (imiryango y'ubucuruzi) on a busy road in Gatenga, "
        "close to the market and the bus stop. Water and electricity are metered per shop.",
        ["Street frontage", "Metered electricity", "Night guard"],
        [
            _Unit("DEMO-BCH-101", "Shop room 101", "commercial", 0, 0, "120000", "RWF", "18", "Ground floor",
                  featured=True, toilet="shared",
                  description="Street-front shop room with a roller shutter. Toilet shared with the neighbouring shops."),
            _Unit("DEMO-BCH-102", "Shop room 102 — own toilet", "commercial", 0, 0, "150000", "RWF", "24",
                  "Ground floor", toilet="private",
                  description="Larger corner shop room with its own toilet and a small store room."),
            _Unit("DEMO-BCH-103", "Shop room 103", "commercial", 0, 0, "110000", "RWF", "16", "Ground floor",
                  toilet="shared", status="reserved"),
        ],
        usage="commercial",
    ),
]

_ADDRESS = {  # Akagari, Umudugudu
    "DEMO-KHA": ("Kamatamu", "Amajyambere"),
    "DEMO-NYV": ("Nyarutarama", "Kibiraro"),
    "DEMO-KGR": ("Rukili II", "Ubumwe"),
    "DEMO-KCS": ("Kiyovu", "Ubumwe"),
    "DEMO-BCH": ("Nyarurama", "Bisambu"),
}

# (unit code, tenant, phone, email, occupation) — payment pattern is decided below.
TENANTS = [
    ("DEMO-KHA-A3", "Aline Uwase", "+250788410001", "aline.uwase@example.com", "Accountant"),
    ("DEMO-KHA-A4", "Eric Habimana", "+250788410002", "eric.habimana@example.com", "Engineer"),
    ("DEMO-KGR-R2", "Diane Mukamana", "+250788410003", "diane.mukamana@example.com", "Nurse"),
    ("DEMO-KGR-R4", "Patrick Niyonzima", "+250788410004", None, "Software developer"),
    ("DEMO-KCS-O1", "Umurage Consulting Ltd", "+250788410005", "office@umurage.example.com", "Consultancy"),
]

INQUIRIES = [
    ("DEMO-KHA-A1", "Grace Ingabire", "+250788420001", "Is parking included? I would like to visit this weekend."),
    ("DEMO-NYV-H", "Samuel Okello", "+250788420002", "We are relocating in January. Is the villa available for two years?"),
    ("DEMO-KGR-R1", "Claudine Iradukunda", "+250788420003", "Can I see the room on Thursday after work?"),
]


def _months_back(today: date, n: int) -> date:
    y, m = today.year, today.month - n
    while m <= 0:
        m += 12
        y -= 1
    return date(y, m, 1)


# ------------------------------------------------------------------ status ----


def demo_property_ids(db: Session) -> list[int]:
    return list(db.execute(select(Property.id).where(Property.is_demo.is_(True))).scalars())


def status(db: Session) -> dict:
    prop_ids = demo_property_ids(db)
    units = db.execute(select(func.count(RentalUnit.id)).where(RentalUnit.property_id.in_(prop_ids))).scalar_one()
    tenants = db.execute(select(func.count(Tenant.id)).where(Tenant.is_demo.is_(True))).scalar_one()
    return {"loaded": bool(prop_ids or tenants), "properties": len(prop_ids), "units": units, "tenants": tenants}


# -------------------------------------------------------------------- seed ----


def seed(db: Session, *, actor: User, request: Request | None, today: date | None = None) -> dict:
    today = today or date.today()
    if status(db)["loaded"]:
        raise Conflict("Demo data is already loaded. Clear it first to load it again.", code="demo_loaded")
    from evaramu.modules.properties.schemas import PropertyCreate

    seed_no = 0
    units: dict[str, RentalUnit] = {}
    for p in CATALOGUE:
        prop = properties.create_property(db, PropertyCreate(
            code=p.code, name=p.name, property_type=p.property_type, usage=p.usage, district=p.district, sector=p.sector,
            address=p.address, description=p.description, amenities=p.amenities,
        ), actor=actor, request=request)
        prop.is_demo = True
        prop.cell, prop.village = _ADDRESS.get(p.code, ("", ""))
        for i in range(2):
            seed_no += 1
            stored = save_image(_illustration(seed_no))
            db.add(PropertyImage(property_id=prop.id, storage_key=stored.storage_key, thumb_key=stored.thumb_key,
                                 original_name=f"demo-{seed_no}.png", width=stored.width, height=stored.height,
                                 size_bytes=stored.size_bytes, caption="Illustration (demo)", sort_order=i,
                                 uploaded_by_id=actor.id))
        for u in p.units:
            unit = properties.create_unit(db, {
                "code": u.code, "name": u.name, "unit_type": u.unit_type, "bedrooms": u.bedrooms,
                "bathrooms": u.bathrooms, "toilet": u.toilet, "size_sqm": Decimal(u.size) if u.size else None, "floor": u.floor,
                "furnished": u.furnished, "monthly_rent": Decimal(u.rent), "currency": u.currency,
                "description": u.description, "amenities": u.amenities, "is_featured": u.featured,
            }, prop=prop, actor=actor, request=request)
            seed_no += 1
            stored = save_image(_illustration(seed_no))
            db.add(PropertyImage(property_id=prop.id, unit_id=unit.id, storage_key=stored.storage_key,
                                 thumb_key=stored.thumb_key, original_name=f"demo-{seed_no}.png",
                                 width=stored.width, height=stored.height, size_bytes=stored.size_bytes,
                                 caption="Illustration (demo)", sort_order=0, uploaded_by_id=actor.id))
            target = "available" if u.status == "occupied" else u.status
            properties.change_status(db, unit, target, "Demo data", actor=actor, request=request)
            unit.is_published = u.status == "available"
            units[u.code] = unit
    db.flush()

    start = _months_back(today, 3)
    periods = [_months_back(today, n) for n in (3, 2, 1, 0)]
    agreements_made: list[RentalAgreement] = []
    for idx, (code, name, phone, email, occupation) in enumerate(TENANTS):
        tenant = Tenant(full_name=name, phone=phone, email=email, occupation=occupation, nationality="Rwandan",
                        emergency_contact_name="Family contact", emergency_contact_phone="+250788499999",
                        emergency_contact_relationship="Relative", notes="", is_archived=False,
                        is_demo=True, created_by_id=actor.id)
        db.add(tenant)
        db.flush()
        unit = units[code]
        ag = agreements.create_draft(db, {
            "tenant_id": tenant.id, "unit_id": unit.id, "start_date": start, "due_day": 5,
            "deposit_required": unit.monthly_rent,
        }, actor=actor, request=request)
        agreements.activate(db, ag, actor=actor, request=request)
        agreements_made.append(ag)
        for period in periods:
            billing.generate_rent_invoices(db, period.year, period.month, actor=actor, today=today,
                                           agreement_id=ag.id)
        db.flush()

        # Payment history: most pay on time; one is behind; one has a payment awaiting approval.
        paid_months = {0: 4, 1: 2, 2: 3, 3: 4, 4: 3}[idx]
        for n, period in enumerate(periods[:paid_months]):
            pay_day = min(date(period.year, period.month, 3), today)
            method = ["mtn_momo", "bank_transfer", "airtel_money", "cash", "bank_transfer"][idx]
            ref = "" if method == "cash" else f"DEMO{idx}{period:%y%m}{n}"
            p = billing.record_payment(db, {
                "agreement_id": ag.id, "amount": ag.monthly_rent, "payment_date": pay_day,
                "method_code": method, "transaction_reference": ref, "notes": "",
            }, actor=actor, request=request)
            billing.approve_payment(db, p, actor=actor, confirm_duplicate=True, auto_allocate=True, note="",
                                    request=request, today=today)
        if idx == 1:  # behind: a partial payment for the third month
            billing.record_payment(db, {
                "agreement_id": ag.id, "amount": (ag.monthly_rent / 2).quantize(Decimal("1")),
                "payment_date": today, "method_code": "mtn_momo",
                "transaction_reference": f"DEMO1{today:%y%m%d}P", "notes": "Tenant says the rest follows next week",
            }, actor=actor, request=request)
        if idx in (2, 4):  # this month's payment received, awaiting approval
            billing.record_payment(db, {
                "agreement_id": ag.id, "amount": ag.monthly_rent, "payment_date": today,
                "method_code": "mtn_momo" if idx == 2 else "bank_transfer",
                "transaction_reference": f"DEMO{idx}{today:%y%m%d}N", "notes": "",
            }, actor=actor, request=request)

    for code, name, phone, message in INQUIRIES:
        db.add(Inquiry(unit_id=units[code].id, full_name=name, phone=phone, email=None, message=message,
                       status="new", staff_notes=""))

    audit(db, actor=actor, action="demo.loaded", entity_type="system", entity_id=None,
          summary=f"Loaded demo data: {len(CATALOGUE)} properties, {len(units)} units, "
                  f"{len(agreements_made)} tenancies")
    db.flush()
    return status(db)


# ------------------------------------------------------------------- clear ----


def clear(db: Session, *, actor: User, request: Request | None) -> dict:
    prop_ids = demo_property_ids(db)
    unit_ids = list(db.execute(select(RentalUnit.id).where(RentalUnit.property_id.in_(prop_ids))).scalars())
    ag_ids = list(db.execute(select(RentalAgreement.id).where(RentalAgreement.unit_id.in_(unit_ids))).scalars())
    inv_ids = list(db.execute(select(Invoice.id).where(
        or_(Invoice.unit_id.in_(unit_ids), Invoice.agreement_id.in_(ag_ids)))).scalars())
    pay_ids = list(db.execute(select(Payment.id).where(
        or_(Payment.unit_id.in_(unit_ids), Payment.agreement_id.in_(ag_ids)))).scalars())
    images = list(db.execute(select(PropertyImage.storage_key, PropertyImage.thumb_key).where(
        PropertyImage.property_id.in_(prop_ids))).all())

    db.execute(delete(PaymentAllocation).where(or_(PaymentAllocation.payment_id.in_(pay_ids),
                                                   PaymentAllocation.invoice_id.in_(inv_ids))))
    db.execute(delete(FinancialAdjustment).where(FinancialAdjustment.invoice_id.in_(inv_ids)))
    db.execute(delete(Notification).where(Notification.dedupe_key.in_([f"payment-pending-{i}" for i in pay_ids])))
    db.execute(delete(Payment).where(Payment.id.in_(pay_ids)))
    db.execute(delete(Invoice).where(Invoice.id.in_(inv_ids)))
    db.execute(delete(DepositTransaction).where(DepositTransaction.agreement_id.in_(ag_ids)))
    db.execute(delete(AgreementDocument).where(AgreementDocument.agreement_id.in_(ag_ids)))
    db.execute(update(RentalAgreement).where(RentalAgreement.renewed_from_id.in_(ag_ids))
               .values(renewed_from_id=None))
    db.execute(delete(UnitStatusHistory).where(UnitStatusHistory.agreement_id.in_(ag_ids)))
    db.execute(delete(RentalAgreement).where(RentalAgreement.id.in_(ag_ids)))
    db.execute(delete(Inquiry).where(Inquiry.unit_id.in_(unit_ids)))
    db.execute(delete(PropertyImage).where(PropertyImage.property_id.in_(prop_ids)))
    db.execute(update(RentalUnit).where(RentalUnit.id.in_(unit_ids)).values(parent_unit_id=None))
    db.execute(delete(RentalUnit).where(RentalUnit.id.in_(unit_ids)))
    db.execute(delete(Property).where(Property.id.in_(prop_ids)))
    db.execute(delete(ReservedCode).where(or_(
        (ReservedCode.entity_type == "unit") & ReservedCode.entity_id.in_(unit_ids),
        (ReservedCode.entity_type == "property") & ReservedCode.entity_id.in_(prop_ids),
    )))

    # Demo tenants go only when nothing real still refers to them.
    busy = (
        select(RentalAgreement.tenant_id).union(select(Invoice.tenant_id), select(Payment.tenant_id),
                                                select(FinancialAdjustment.tenant_id))
    )
    removed_tenants = db.execute(delete(Tenant).where(Tenant.is_demo.is_(True), Tenant.id.not_in(busy))
                                 .returning(Tenant.id)).scalars().all()
    audit(db, actor=actor, action="demo.cleared", entity_type="system", entity_id=None,
          summary=f"Cleared demo data: {len(prop_ids)} properties, {len(unit_ids)} units, {len(ag_ids)} agreements, "
                  f"{len(inv_ids)} invoices, {len(pay_ids)} payments, {len(removed_tenants)} tenants")
    db.flush()
    return {
        "properties": len(prop_ids), "units": len(unit_ids), "agreements": len(ag_ids), "invoices": len(inv_ids),
        "payments": len(pay_ids), "tenants": len(removed_tenants), "media": [k for pair in images for k in pair],
    }


__all__ = ["seed", "clear", "status"]
