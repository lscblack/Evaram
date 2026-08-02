"""
Idempotent seeder.

    python -m app.seeds.run          # create anything missing
    python -m app.seeds.run --reset  # drop and rebuild every table first

Safe to re-run: everything is keyed on a natural identifier (slug, key, email,
reference number) and skipped when it already exists.
"""

import argparse
import asyncio
import logging
from datetime import date, timedelta

from slugify import slugify
from sqlalchemy import select, text

from app.core.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models.content import (
    ConstructionPackage,
    ConsultationType,
    ContentBlock,
    Faq,
    Insight,
    MarketStat,
    NavigationItem,
    ServiceLine,
    SiteSetting,
    Testimonial,
    UiString,
    WealthCycleStep,
)
from app.models.property import (
    ListingIntent,
    MediaKind,
    Property,
    PropertyMedia,
    PropertyStatus,
    UploaderType,
)
from app.models.taxonomy import (
    District,
    FieldType,
    FieldWidth,
    OptionSet,
    PropertyCategory,
    PropertyFormField,
    PropertySubCategory,
)
from app.models.user import User, UserRole, UserStatus
from app.core.config import settings
from app.seeds import demo_content, sample_properties, site_content
from app.seeds.form_config import FORM_CONFIG, OPTION_SETS

logging.basicConfig(level=logging.INFO, format="%(levelname)-7s %(message)s")
log = logging.getLogger("seed")


async def reset_schema() -> None:
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    log.info("schema rebuilt")


async def ensure_schema() -> None:
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
        await conn.run_sync(Base.metadata.create_all)
    log.info("schema ready")


async def seed_users(db) -> dict[str, User]:
    people = [
        {
            "email": settings.SUPER_ADMIN_EMAIL, "full_name": settings.SUPER_ADMIN_NAME,
            "password": settings.SUPER_ADMIN_PASSWORD, "role": UserRole.SUPER_ADMIN,
            "job_title": "Founder & Chairman", "division": "Group", "is_public": False,
        },
        {
            "email": "aline@evaramu.rw", "full_name": "Aline Uwase", "role": UserRole.ADMIN,
            "job_title": "Head of Real Estate", "division": "Realty", "is_public": True,
            "phone": "+250 788 000 001", "joined_year": "2025", "rating": 4.9, "deals_closed": 64,
            "languages": ["Kinyarwanda", "English", "French"],
            "specialties": ["Residential land", "Diaspora clients", "Wealth Cycle"],
            "covers": ["Gasabo", "Kicukiro"], "display_order": 1,
            "photo_url": "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=800&q=80",
            "bio": ("I run the Realty division. My job is to tell clients the truth about what "
                    "their money can buy — including when the honest answer is to wait six months."),
        },
        {
            "email": "eric@evaramu.rw", "full_name": "Eric Mugisha", "role": UserRole.AGENT,
            "job_title": "Senior Property Consultant", "division": "Realty", "is_public": True,
            "phone": "+250 788 000 002", "joined_year": "2025", "rating": 4.8, "deals_closed": 51,
            "languages": ["Kinyarwanda", "English", "Swahili"],
            "specialties": ["Commercial plots", "Negotiation", "Bugesera corridor"],
            "covers": ["Bugesera", "Rwamagana", "Nyarugenge"], "display_order": 2,
            "photo_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80",
            "bio": ("I have walked most of the land between Kabuga and Nyamata. If a plot has an "
                    "access problem, I will find it before you pay for it."),
        },
        {
            "email": "claudine@evaramu.rw", "full_name": "Claudine Ingabire",
            "role": UserRole.AGENT, "job_title": "Diaspora Relations Lead", "division": "Realty",
            "is_public": True, "phone": "+250 788 000 003", "joined_year": "2025", "rating": 5.0,
            "deals_closed": 38, "languages": ["Kinyarwanda", "English", "French", "Dutch"],
            "specialties": ["Remote purchase", "Title verification", "Video reporting"],
            "covers": ["Europe", "North America", "Kigali"], "display_order": 3,
            "photo_url": "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=800&q=80",
            "bio": ("I work with Rwandans abroad. Every client gets a video of the boundary with "
                    "the UPI on screen before a single franc moves."),
        },
        {
            "email": "patrick@evaramu.rw", "full_name": "Patrick Habimana", "role": UserRole.ADMIN,
            "job_title": "Head of Construction", "division": "Construction", "is_public": True,
            "phone": "+250 788 000 004", "joined_year": "2025", "rating": 4.9, "deals_closed": 27,
            "languages": ["Kinyarwanda", "English"],
            "specialties": ["Supervised builds", "Renovation", "Cost control"],
            "covers": ["Kigali", "Eastern Province"], "display_order": 4,
            "photo_url": "https://images.unsplash.com/photo-1600486913747-55e5470d6f40?auto=format&fit=crop&w=800&q=80",
            "bio": ("I price a build once and stand by it. The 15% contingency is written into "
                    "your contract at signature, not discovered at month four."),
        },
        {
            "email": "sandrine@evaramu.rw", "full_name": "Sandrine Mukamana",
            "role": UserRole.AGENT, "job_title": "Property Manager", "division": "Realty",
            "is_public": True, "phone": "+250 788 000 005", "joined_year": "2026", "rating": 4.9,
            "deals_closed": 22, "languages": ["Kinyarwanda", "English", "French"],
            "specialties": ["Tenant screening", "Rent collection", "Monthly reporting"],
            "covers": ["Nyarutarama", "Kacyiru", "Remera"], "display_order": 5,
            "photo_url": "https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?auto=format&fit=crop&w=800&q=80",
            "bio": ("Your statement lands on the first of the month whether or not anything "
                    "happened. Silence from a property manager is a warning sign."),
        },
        {
            "email": "bosco@evaramu.rw", "full_name": "Jean Bosco Nsengimana",
            "role": UserRole.AGENT, "job_title": "Site Supervisor", "division": "Construction",
            "is_public": True, "phone": "+250 788 000 006", "joined_year": "2026", "rating": 4.7,
            "deals_closed": 19, "languages": ["Kinyarwanda", "Swahili", "English"],
            "specialties": ["Daily supervision", "Snagging", "Sub-contractor vetting"],
            "covers": ["Kigali sites"], "display_order": 6,
            "photo_url": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=800&q=80",
            "bio": ("I am on site every working day. If something is going wrong you hear it "
                    "from me that week, not at handover."),
        },
        {
            "email": "divine@evaramu.rw", "full_name": "Divine Umutoni", "role": UserRole.ADMIN,
            "job_title": "Land & Title Officer", "division": "Group", "is_public": True,
            "phone": "+250 788 000 007", "joined_year": "2025", "rating": 5.0, "deals_closed": 96,
            "languages": ["Kinyarwanda", "English", "French"],
            "specialties": ["NLA verification", "Transfer documentation", "Due diligence"],
            "covers": ["All districts"], "display_order": 7,
            "photo_url": "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=800&q=80",
            "bio": ("Nothing gets listed until I have matched the UPI to the registered owner. "
                    "I have killed deals at this desk and I would do it again."),
        },
        {
            "email": "kevin@evaramu.rw", "full_name": "Kevin Rukundo", "role": UserRole.AGENT,
            "job_title": "Property Consultant", "division": "Realty", "is_public": True,
            "phone": "+250 788 000 008", "joined_year": "2026", "rating": 4.7, "deals_closed": 17,
            "languages": ["Kinyarwanda", "English"],
            "specialties": ["First-time buyers", "Middle market", "Kanombe & Kabuga"],
            "covers": ["Kicukiro", "Kabuga"], "display_order": 8,
            "photo_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80",
            "bio": ("Most of my clients are buying their first property. The questions you are "
                    "embarrassed to ask are the ones I want to answer."),
        },
        {
            "email": "josiane@evaramu.rw", "full_name": "Josiane Karema", "role": UserRole.ADMIN,
            "job_title": "Finance & Client Accounts", "division": "Group", "is_public": True,
            "phone": "+250 788 000 009", "joined_year": "2025", "rating": 5.0, "deals_closed": 0,
            "languages": ["Kinyarwanda", "English", "French"],
            "specialties": ["Receipting", "Commission tracking", "Cost sheets"],
            "covers": ["Head office"], "display_order": 9,
            "photo_url": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80",
            "bio": ("Every payment goes to the company account and is receipted the same day. "
                    "If anyone asks you to pay a personal number, call me."),
        },
        {
            "email": "yves@evaramu.rw", "full_name": "Yves Ntwali", "role": UserRole.AGENT,
            "job_title": "Content & Photography", "division": "Group", "is_public": True,
            "phone": "+250 788 000 010", "joined_year": "2026", "rating": 4.8, "deals_closed": 0,
            "languages": ["Kinyarwanda", "English"],
            "specialties": ["Drone video", "Property photography", "Client stories"],
            "covers": ["Nationwide"], "display_order": 10,
            "photo_url": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80",
            "bio": ("A property that photographs badly sells slowly and for less. That is the "
                    "entire reason my job exists."),
        },
    ]

    by_email: dict[str, User] = {}
    for spec in people:
        email = spec["email"].lower()
        existing = await db.scalar(select(User).where(User.email == email))
        if existing:
            by_email[email] = existing
            continue

        password = spec.pop("password", "Evaramu@2026Temp")
        spec.pop("email", None)
        user = User(
            email=email,
            hashed_password=hash_password(password),
            status=UserStatus.ACTIVE,
            email_verified=True,
            **spec,
        )
        db.add(user)
        by_email[email] = user

    await db.flush()
    log.info("users: %d", len(by_email))
    return by_email


async def seed_taxonomy(db) -> dict[str, PropertySubCategory]:
    for spec in OPTION_SETS:
        if not await db.scalar(select(OptionSet.id).where(OptionSet.key == spec["key"])):
            db.add(OptionSet(**spec, is_system=True))

    subs: dict[str, PropertySubCategory] = {}
    for cat_spec in FORM_CONFIG:
        category = await db.scalar(
            select(PropertyCategory).where(PropertyCategory.slug == cat_spec["slug"])
        )
        if category is None:
            category = PropertyCategory(
                slug=cat_spec["slug"], label=cat_spec["label"], icon=cat_spec["icon"],
                description=cat_spec.get("description"),
                display_order=cat_spec.get("display_order", 0),
            )
            db.add(category)
            await db.flush()

        for order, sub_spec in enumerate(cat_spec["subcategories"], start=1):
            sub = await db.scalar(
                select(PropertySubCategory).where(
                    PropertySubCategory.category_id == category.id,
                    PropertySubCategory.slug == sub_spec["slug"],
                )
            )
            if sub is None:
                sub = PropertySubCategory(
                    category_id=category.id, slug=sub_spec["slug"], label=sub_spec["label"],
                    is_land=sub_spec.get("is_land", False), display_order=order,
                )
                db.add(sub)
                await db.flush()

                for f_order, field in enumerate(sub_spec["fields"], start=1):
                    db.add(
                        PropertyFormField(
                            subcategory_id=sub.id,
                            name=field["name"],
                            label=field["label"],
                            type=FieldType(field["type"]),
                            width=FieldWidth(field.get("width", "full")),
                            options=field.get("options"),
                            is_required=field.get("required", False),
                            conditional=field.get("conditional"),
                            placeholder=field.get("placeholder"),
                            unit=field.get("unit"),
                            display_order=f_order,
                        )
                    )
            subs[f"{cat_spec['slug']}:{sub_spec['slug']}"] = sub

    await db.flush()
    log.info("taxonomy: %d categories, %d forms", len(FORM_CONFIG), len(subs))
    return subs


async def seed_settings(db) -> None:
    for spec in site_content.SETTINGS:
        if not await db.scalar(select(SiteSetting.id).where(SiteSetting.key == spec["key"])):
            db.add(SiteSetting(**spec))

    for spec in site_content.DISTRICTS:
        if not await db.scalar(select(District.id).where(District.name == spec["name"])):
            db.add(District(**spec))

    for spec in site_content.MARKET_STATS:
        if not await db.scalar(select(MarketStat.id).where(MarketStat.key == spec["key"])):
            db.add(MarketStat(**spec))

    for spec in site_content.WEALTH_CYCLE:
        if not await db.scalar(
            select(WealthCycleStep.id).where(WealthCycleStep.step == spec["step"])
        ):
            db.add(WealthCycleStep(**spec))

    for spec in site_content.SERVICE_LINES:
        if not await db.scalar(select(ServiceLine.id).where(ServiceLine.slug == spec["slug"])):
            db.add(ServiceLine(**spec))

    for spec in site_content.CONSTRUCTION_PACKAGES:
        if not await db.scalar(
            select(ConstructionPackage.id).where(ConstructionPackage.slug == spec["slug"])
        ):
            db.add(ConstructionPackage(**spec))

    for spec in site_content.CONSULTATION_TYPES:
        if not await db.scalar(
            select(ConsultationType.id).where(ConsultationType.slug == spec["slug"])
        ):
            db.add(ConsultationType(**spec))

    # navigation, parents first
    for spec in site_content.NAVIGATION:
        exists = await db.scalar(
            select(NavigationItem.id).where(
                NavigationItem.menu == spec["menu"], NavigationItem.href == spec["href"],
                NavigationItem.label == spec["label"],
            )
        )
        if exists:
            continue
        parent = NavigationItem(
            menu=spec["menu"], label=spec["label"], href=spec["href"],
            translation_key=spec.get("translation_key"), display_order=spec.get("order", 0),
        )
        db.add(parent)
        await db.flush()
        for child_order, child in enumerate(spec.get("children", []), start=1):
            db.add(
                NavigationItem(
                    menu=spec["menu"], parent_id=parent.id, label=child["label"],
                    href=child["href"], icon=child.get("icon"),
                    description=child.get("description"), display_order=child_order,
                )
            )

    await db.flush()
    log.info("settings, navigation and catalogue content seeded")


async def seed_strings(db) -> None:
    for key, values in demo_content.UI_STRINGS.items():
        if not await db.scalar(select(UiString.id).where(UiString.key == key)):
            db.add(
                UiString(
                    key=key, namespace=key.split(".")[0], en=values["en"],
                    rw=values.get("rw"), fr=values.get("fr"),
                    needs_review=bool(values.get("rw")),
                )
            )
    await db.flush()
    log.info("ui strings: %d", len(demo_content.UI_STRINGS))


async def seed_page_content(db) -> None:
    for spec in demo_content.CONTENT_BLOCKS:
        exists = await db.scalar(
            select(ContentBlock.id).where(
                ContentBlock.page == spec["page"], ContentBlock.key == spec["key"]
            )
        )
        if not exists:
            db.add(ContentBlock(**spec))

    for spec in demo_content.TESTIMONIALS:
        if not await db.scalar(
            select(Testimonial.id).where(Testimonial.author_name == spec["author_name"])
        ):
            db.add(Testimonial(**spec))

    for spec in demo_content.FAQS:
        if not await db.scalar(select(Faq.id).where(Faq.question == spec["question"])):
            db.add(Faq(**spec))

    for spec in demo_content.INSIGHTS:
        slug = spec.get("slug") or slugify(spec["title"])
        if await db.scalar(select(Insight.id).where(Insight.slug == slug)):
            continue
        row = {**spec, "slug": slug}
        # Seeds carry ISO strings; the column is a real DATE.
        if isinstance(row.get("published_at"), str):
            row["published_at"] = date.fromisoformat(row["published_at"])
        db.add(Insight(**row))

    await db.flush()
    log.info("page content, testimonials, FAQs and insights seeded")


async def seed_properties(db, subs, users) -> None:
    agents = [u for u in users.values() if u.role in (UserRole.AGENT, UserRole.ADMIN)]
    created = 0

    for index, spec in enumerate(sample_properties.PROPERTIES):
        reference = spec["reference_number"]
        if await db.scalar(
            select(Property.id).where(Property.reference_number == reference)
        ):
            continue

        sub = subs.get(spec["form"])
        if sub is None:
            log.warning("no form for %s — skipping %s", spec["form"], reference)
            continue

        agent = agents[index % len(agents)] if agents else None
        media_specs = spec.pop("media", [])
        spec.pop("form", None)

        prop = Property(
            **spec,
            slug=slugify(f"{spec['title']}-{reference}")[:200],
            category_id=sub.category_id,
            subcategory_id=sub.id,
            agent_id=agent.id if agent else None,
            uploaded_by_id=agent.id if agent else None,
            uploader_type=UploaderType.AGENCY,
            status=PropertyStatus.AVAILABLE,
            is_verified=True,
            published_at=date.today() - timedelta(days=index * 3),
        )
        prop.search_text = prop.build_search_text()
        db.add(prop)
        await db.flush()

        for m_order, media in enumerate(media_specs):
            db.add(
                PropertyMedia(
                    property_id=prop.id,
                    kind=MediaKind(media.get("kind", "image")),
                    url=media["url"],
                    caption=media.get("caption"),
                    is_cover=m_order == 0 and media.get("kind", "image") == "image",
                    display_order=m_order,
                    meta=media.get("meta"),
                )
            )
        created += 1

    await db.flush()
    log.info("properties: %d created", created)


async def main(reset: bool) -> None:
    if reset:
        await reset_schema()
    else:
        await ensure_schema()

    async with SessionLocal() as db:
        users = await seed_users(db)
        subs = await seed_taxonomy(db)
        await seed_settings(db)
        await seed_strings(db)
        await seed_page_content(db)
        await seed_properties(db, subs, users)
        await db.commit()

    log.info("─" * 52)
    log.info("seed complete")
    log.info("super admin : %s", settings.SUPER_ADMIN_EMAIL)
    log.info("password    : %s", settings.SUPER_ADMIN_PASSWORD)
    log.info("OTP bypass  : %s (super admin only)", settings.SUPER_ADMIN_OTP_BYPASS)
    log.info("─" * 52)
    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed the Evaramu database")
    parser.add_argument("--reset", action="store_true", help="drop and rebuild all tables first")
    args = parser.parse_args()
    asyncio.run(main(args.reset))
