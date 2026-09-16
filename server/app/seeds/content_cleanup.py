"""Strip the public site of claims it cannot back.

Run once against a live database, and kept in the repo so the same copy ships
with a fresh install:

    python -m app.seeds.content_cleanup

What goes, and why:

- Figures typed into copy rather than counted from data ("750+ properties",
  "100% titles verified", "response within 2 hours"). The catalogue has twelve
  listings; the hero now counts them.
- Statistics about competitors ("204 registered agencies, 99% informal"). Not
  sourced, and disparagement of a whole trade is a legal exposure, not a
  selling point.
- Investment-return claims ("15–20% annual appreciation", "8–12% yield").
  Presented as market fact with nothing behind them.
- Testimonials from people who do not exist, and star ratings with no review
  system behind them. A 5.0 rating next to "0 deals closed" is a number that
  contradicts itself.
- Absolutes. "Every title verified" becomes what is actually true: titles are
  checked before a listing is *marked* verified, and the badge says which.
"""

from __future__ import annotations

import asyncio
import json
import logging

from sqlalchemy import select, text, update

from app.core.database import SessionLocal
from app.models.content import ContentBlock, Testimonial
from app.models.user import User

logger = logging.getLogger("evaramu.cleanup")

#: Blocks for sections that no longer appear on the homepage. Deactivated
#: rather than deleted so nothing an admin wrote is lost — only hidden.
RETIRED_HOME_BLOCKS = (
    "hero_stats", "hero_marquee", "why_gaps", "market", "testimonials",
    "wealth_cycle", "construction", "insights", "join_benefits",
)

TRUST_POINTS = [
    {
        "icon": "ShieldCheck",
        "title": "Titles checked at the NLA",
        "description": (
            "Before a listing is marked verified, its title is checked against the "
            "National Land Authority register. A dispute found late costs more than a "
            "deal lost early."
        ),
    },
    {
        "icon": "FileCheck2",
        "title": "Written contracts",
        "description": (
            "Digital contracts, receipts and cost tracking on each engagement. If it is "
            "not written down, it did not happen."
        ),
    },
    {
        "icon": "Timer",
        "title": "We answer",
        "description": "Enquiries are answered the same working day. When we cannot, we say so.",
    },
    {
        "icon": "HeartHandshake",
        "title": "We stay after the sale",
        "description": (
            "Buying is one step. Building, letting and selling on are the ones that "
            "decide whether it was a good buy, and we are still here for them."
        ),
    },
]

REWRITES: dict[tuple[str, str], dict] = {
    ("home", "why"): {
        "eyebrow": "How we work",
        "title": "Four things we hold to",
        "accent": "on every engagement.",
        "body": (
            "Land in Rwanda changes hands on trust more than on paper. These are the "
            "commitments that replace trust with paperwork."
        ),
    },
    ("home", "trust_points"): {"items": TRUST_POINTS},
    ("home", "trust"): {"items": TRUST_POINTS},
    ("home", "featured"): {
        "eyebrow": "Current listings",
        "title": "Checked before",
        "accent": "they go live.",
        "body": (
            "Listings marked verified have had their title checked against the National "
            "Land Authority. Parcel size, tenure and coordinates are shown so you know "
            "what you are looking at before you call."
        ),
    },
    ("home", "seo"): {
        "title": "Evaramu Group Ltd — Real Estate & Construction in Kigali",
        "body": (
            "Land, houses and commercial property in Rwanda, with titles checked at the "
            "National Land Authority before a listing is marked verified. Build with our "
            "construction division. Book a consultation."
        ),
    },
    ("properties", "seo"): {
        "body": (
            "Land, houses, apartments and commercial property across Kigali and Rwanda. "
            "Titles are checked at the National Land Authority before a listing is "
            "marked verified."
        ),
    },
    ("contact", "hero"): {"accent": "the same working day."},
    ("home", "services"): {
        "body": (
            "We broker property and we build on it, so the same team that found you a "
            "plot can put a house on it."
        ),
    },
}

#: Internal standards shown to job applicants. Kept, minus the jab.
CULTURE_FIX = (
    "Every lead gets a response within two hours. Competitors take days — that gap is "
    "our advantage and we protect it.",
    "Every lead gets a response the same working day. That standard is the job.",
)


async def run() -> None:
    async with SessionLocal() as db:
        # ---- rewrite the blocks that carried claims
        for (page, key), changes in REWRITES.items():
            block = await db.scalar(
                select(ContentBlock).where(ContentBlock.page == page, ContentBlock.key == key)
            )
            if block is None:
                logger.warning("  %s/%s not found — skipped", page, key)
                continue
            for field, value in changes.items():
                setattr(block, field, value)
            logger.info("  rewrote %s/%s", page, key)

        # ---- hide the blocks whose sections left the homepage
        result = await db.execute(
            update(ContentBlock)
            .where(ContentBlock.page == "home", ContentBlock.key.in_(RETIRED_HOME_BLOCKS))
            .values(is_active=False)
        )
        logger.info("  retired %d homepage blocks", result.rowcount)

        # ---- the culture list, one sentence
        culture = await db.scalar(
            select(ContentBlock).where(ContentBlock.page == "join", ContentBlock.key == "culture_rules")
        )
        if culture and culture.items:
            items = json.loads(json.dumps(culture.items))
            for item in items:
                if item.get("body") == CULTURE_FIX[0]:
                    item["body"] = CULTURE_FIX[1]
            culture.items = items
            logger.info("  softened join/culture_rules")

        # ---- fabricated testimonials
        result = await db.execute(update(Testimonial).values(is_published=False))
        logger.info("  unpublished %d testimonials", result.rowcount)

        # ---- ratings with no reviews behind them
        result = await db.execute(update(User).values(rating=None))
        logger.info("  cleared ratings on %d accounts", result.rowcount)

        # ---- demo articles: a case study about a client who does not exist,
        #      with invented returns, is editorial only in appearance
        result = await db.execute(text("UPDATE insights SET is_published = false"))
        logger.info("  unpublished %d demo articles", result.rowcount)
        result = await db.execute(
            text("UPDATE navigation_items SET is_active = false WHERE href = '/insights'")
        )
        logger.info("  hid %d Insights nav links until there is something real to show", result.rowcount)

        # ---- placeholder tour links: a "Virtual tour" tab that opens on a dead
        #      URL is a promise the listing cannot keep
        result = await db.execute(text(
            "UPDATE properties SET vr_tour_url = NULL, video_360_url = NULL, drone_footage_url = NULL, "
            "panorama_scenes = NULL, vr_tour_provider = NULL "
            "WHERE vr_tour_url ~ 'kuula.co/share/collection/evaramu|cdn.evaramu.rw|matterport.com/show/\\?m=evaramu' "
            "   OR video_360_url ~ 'cdn.evaramu.rw' OR drone_footage_url ~ 'cdn.evaramu.rw'"))
        logger.info("  cleared placeholder tour media on %d listings", result.rowcount)

        # ---- unsourced market figures
        result = await db.execute(text("UPDATE market_stats SET is_active = false"))
        logger.info("  retired %d market stats", result.rowcount)

        await db.commit()


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    asyncio.run(run())
    print("done")


if __name__ == "__main__":
    main()
