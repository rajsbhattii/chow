"""
Fetch Toronto restaurants from Google Places API (New, v2) and seed the DB.

Uses the new Places API which properly filters by cuisine type (e.g. japanese_restaurant).
The old v1 API ignored these types and returned everything nearby.

Usage:
    cd backend
    source .venv/bin/activate
    python scripts/fetch_restaurants.py

Upserts on google_place_id so it's safe to re-run.
"""

import asyncio
import os
import sys
from math import radians, sin, cos, sqrt, atan2

import httpx
from dotenv import load_dotenv
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

load_dotenv()
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.models.restaurant import Restaurant  # noqa: E402
from app.models.base import Base  # noqa: E402

DATABASE_URL = os.environ["DATABASE_URL"]
API_KEY = os.environ["GOOGLE_PLACES_API_KEY"]

NEARBY_URL = "https://places.googleapis.com/v1/places:searchNearby"

# Toronto neighbourhood grid
SEARCH_CENTRES = [
    (43.6532, -79.3832, "Downtown"),
    (43.6426, -79.3871, "Entertainment District"),
    (43.6534, -79.4027, "Kensington / Chinatown"),
    (43.6677, -79.3948, "Annex / Yorkville"),
    (43.6452, -79.3733, "Distillery / Corktown"),
    (43.6612, -79.4283, "Roncesvalles / Parkdale"),
    (43.6751, -79.4107, "Junction / Bloor West"),
    (43.7000, -79.4200, "St. Clair West"),
    (43.7082, -79.3988, "Davisville / Midtown"),
    (43.7281, -79.3862, "Eglinton / Lawrence"),
    (43.6548, -79.3244, "Leslieville / Riverside"),
    (43.6892, -79.3082, "Danforth / Greektown"),
]

CUISINE_TYPES = [
    "japanese_restaurant",
    "italian_restaurant",
    "chinese_restaurant",
    "indian_restaurant",
    "thai_restaurant",
    "mexican_restaurant",
    "korean_restaurant",
    "mediterranean_restaurant",
    "american_restaurant",
    "french_restaurant",
    "greek_restaurant",
    "vietnamese_restaurant",
    "middle_eastern_restaurant",
    "ethiopian_restaurant",
    "ramen_restaurant",
    "sushi_restaurant",
    "pizza_restaurant",
    "seafood_restaurant",
    "steak_house",
    "barbecue_restaurant",
    "hamburger_restaurant",
    "brunch_restaurant",
]

TYPE_TO_CUISINE: dict[str, str] = {
    "japanese_restaurant": "Japanese",
    "ramen_restaurant": "Japanese",
    "sushi_restaurant": "Japanese",
    "italian_restaurant": "Italian",
    "pizza_restaurant": "Italian",
    "chinese_restaurant": "Chinese",
    "indian_restaurant": "Indian",
    "thai_restaurant": "Thai",
    "mexican_restaurant": "Mexican",
    "korean_restaurant": "Korean",
    "mediterranean_restaurant": "Mediterranean",
    "american_restaurant": "American",
    "steak_house": "American",
    "barbecue_restaurant": "American",
    "hamburger_restaurant": "American",
    "french_restaurant": "French",
    "greek_restaurant": "Greek",
    "vietnamese_restaurant": "Vietnamese",
    "middle_eastern_restaurant": "Middle Eastern",
    "ethiopian_restaurant": "Ethiopian",
    "seafood_restaurant": "Seafood",
    "brunch_restaurant": "Brunch",
}

CUISINE_EMOJI: dict[str, str] = {
    "Japanese": "🍣",
    "Italian": "🍝",
    "Chinese": "🥟",
    "Indian": "🍛",
    "Thai": "🍜",
    "Mexican": "🌮",
    "Korean": "🥩",
    "Mediterranean": "🫒",
    "American": "🍔",
    "French": "🥐",
    "Greek": "🫙",
    "Vietnamese": "🍲",
    "Middle Eastern": "🧆",
    "Ethiopian": "🍲",
    "Seafood": "🦞",
    "Brunch": "🥂",
}

# Fields to request in Nearby Search — get everything we need in one call
FIELD_MASK = ",".join([
    "places.id",
    "places.displayName",
    "places.rating",
    "places.userRatingCount",
    "places.priceLevel",
    "places.types",
    "places.primaryType",
    "places.websiteUri",
    "places.photos",
    "places.formattedAddress",
    "places.shortFormattedAddress",
    "places.location",
    "places.regularOpeningHours",
])

PRICE_LEVEL_MAP = {
    "PRICE_LEVEL_FREE": 0,
    "PRICE_LEVEL_INEXPENSIVE": 1,
    "PRICE_LEVEL_MODERATE": 2,
    "PRICE_LEVEL_EXPENSIVE": 3,
    "PRICE_LEVEL_VERY_EXPENSIVE": 4,
}


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371
    dlat = radians(lat2 - lat1)
    dlng = radians(lng2 - lng1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ** 2
    return R * 2 * atan2(sqrt(a), sqrt(1 - a))


def infer_cuisine(types: list[str]) -> str:
    for t in types:
        if t in TYPE_TO_CUISINE:
            return TYPE_TO_CUISINE[t]
    return "Restaurant"


def build_photo_url(photo_name: str, max_width: int = 800) -> str:
    return f"https://places.googleapis.com/v1/{photo_name}/media?maxWidthPx={max_width}&key={API_KEY}"


def extract_neighbourhood(place: dict) -> str:
    short = place.get("shortFormattedAddress", "")
    if "," in short:
        parts = [p.strip() for p in short.split(",")]
        return parts[0] if parts else short
    return short


def extract_max_closing_hour(place: dict) -> int | None:
    periods = place.get("regularOpeningHours", {}).get("periods", [])
    hours = []
    for p in periods:
        if "close" not in p:
            continue
        hour = p["close"]["hour"]
        open_day = p.get("open", {}).get("day", 0)
        close_day = p["close"].get("day", open_day)
        if close_day != open_day:
            hour += 24
        hours.append(hour)
    return max(hours) if hours else None


def derive_tags(place: dict, cuisine: str) -> list[str]:
    tags = []
    rating = place.get("rating", 0)
    reviews = place.get("userRatingCount", 0)

    if rating >= 4.5:
        tags.append("Trending")
    if reviews < 50:
        tags.append("Hidden gem")
    if reviews > 1000:
        tags.append("Popular")

    price_str = place.get("priceLevel", "")
    price = PRICE_LEVEL_MAP.get(price_str, 2)
    if price <= 1:
        tags.append("Quick bite")
    elif price >= 4:
        tags.append("Fine dining")

    if cuisine in ("Japanese", "Korean", "Vietnamese", "Thai"):
        tags.append("Solo-friendly")
    if cuisine in ("Italian", "Mediterranean", "French"):
        tags.append("Date night")
    if cuisine in ("Indian", "Chinese", "Ethiopian", "Middle Eastern"):
        tags.append("Group-friendly")
    if cuisine in ("American", "Italian", "Chinese", "Japanese", "Korean", "Indian"):
        tags.append("Comfort food")

    return tags[:4]


async def fetch_nearby(client: httpx.AsyncClient, lat: float, lng: float, place_type: str) -> list[dict]:
    body = {
        "includedTypes": [place_type],
        "locationRestriction": {
            "circle": {
                "center": {"latitude": lat, "longitude": lng},
                "radius": 1500,
            }
        },
        "maxResultCount": 20,
    }
    headers = {
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": FIELD_MASK,
        "Content-Type": "application/json",
    }
    r = await client.post(NEARBY_URL, json=body, headers=headers)
    data = r.json()
    if "error" in data:
        print(f"  API error for {place_type}: {data['error'].get('message')}")
        return []
    return data.get("places", [])


async def main() -> None:
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    seen_place_ids: set[str] = set()
    candidates: list[dict] = []
    skipped_dupe = skipped_quality = 0

    print("Phase 1: Searching Google Places (new API) across all zones and cuisine types...")

    async with httpx.AsyncClient(timeout=30) as client:
        for centre_lat, centre_lng, zone in SEARCH_CENTRES:
            print(f"  Zone: {zone}")
            zone_results = await asyncio.gather(
                *[fetch_nearby(client, centre_lat, centre_lng, t) for t in CUISINE_TYPES],
                return_exceptions=True,
            )
            for result in zone_results:
                if isinstance(result, Exception):
                    continue
                for place in result:
                    place_id = place.get("id")
                    if not place_id or place_id in seen_place_ids:
                        skipped_dupe += 1
                        continue
                    seen_place_ids.add(place_id)
                    rating = place.get("rating", 0)
                    reviews = place.get("userRatingCount", 0)
                    if rating < 3.5 or reviews < 10:
                        skipped_quality += 1
                        continue
                    candidates.append(place)

    print(f"\n  Found {len(candidates)} unique candidates ({skipped_dupe} dupes, {skipped_quality} low quality filtered)\n")

    print("Phase 2: Writing to database...")
    inserted = updated = 0

    async with async_session() as db:
        for place in candidates:
            loc = place.get("location", {})
            lat = loc.get("latitude")
            lng = loc.get("longitude")
            if not lat or not lng:
                continue

            types = place.get("types", [])
            primary_type = place.get("primaryType", "")
            # Store primaryType first so it's easy to check the most specific type
            place_types = ([primary_type] + [t for t in types if t != primary_type]) if primary_type else types
            cuisine = infer_cuisine(types)

            price_str = place.get("priceLevel", "")
            price_scale = PRICE_LEVEL_MAP.get(price_str, 2)

            photos = place.get("photos", [])
            image_url = build_photo_url(photos[0]["name"]) if photos else None

            neighbourhood = extract_neighbourhood(place)
            tags = derive_tags(place, cuisine)
            place_id = place["id"]
            name = place.get("displayName", {}).get("text", "")

            existing = await db.execute(
                select(Restaurant).where(Restaurant.google_place_id == place_id)
            )
            row = existing.scalar_one_or_none()

            max_closing_hour = extract_max_closing_hour(place)

            if row:
                row.avg_rating = place.get("rating")
                row.review_count = place.get("userRatingCount")
                row.image_url = image_url or row.image_url
                row.tags = tags
                row.place_types = place_types
                if max_closing_hour is not None:
                    row.max_closing_hour = max_closing_hour
                updated += 1
            else:
                db.add(Restaurant(
                    name=name,
                    location=place.get("formattedAddress"),
                    latitude=lat,
                    longitude=lng,
                    cuisine=[cuisine],
                    price_scale=price_scale,
                    avg_rating=place.get("rating"),
                    review_count=place.get("userRatingCount"),
                    website=place.get("websiteUri"),
                    google_place_id=place_id,
                    image_url=image_url,
                    image_emoji=CUISINE_EMOJI.get(cuisine, "🍽️"),
                    neighbourhood=neighbourhood,
                    tags=tags,
                    place_types=place_types,
                    max_closing_hour=max_closing_hour,
                ))
                inserted += 1

            if (inserted + updated) % 100 == 0:
                await db.commit()
                print(f"  {inserted + updated} written...")

        await db.commit()

    await engine.dispose()
    print(f"\nDone: {inserted} inserted, {updated} updated")
    print(f"Skipped: {skipped_dupe} dupes, {skipped_quality} low quality")
    print(f"Total in DB this run: {inserted + updated}")


if __name__ == "__main__":
    asyncio.run(main())
