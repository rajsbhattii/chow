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

# Toronto neighbourhood grid — dense downtown blocks, tight 1.5km radius is enough
TORONTO_RADIUS_M = 1500
# Suburban 905-belt sprawl is car-centric and spread along wide arterials, so use a
# wider radius per zone to actually reach the restaurant clusters around each centre
WEST_END_RADIUS_M = 3000

SEARCH_CENTRES = [
    (43.6532, -79.3832, "Downtown", TORONTO_RADIUS_M),
    (43.6426, -79.3871, "Entertainment District", TORONTO_RADIUS_M),
    (43.6534, -79.4027, "Kensington / Chinatown", TORONTO_RADIUS_M),
    (43.6677, -79.3948, "Annex / Yorkville", TORONTO_RADIUS_M),
    (43.6452, -79.3733, "Distillery / Corktown", TORONTO_RADIUS_M),
    (43.6612, -79.4283, "Roncesvalles / Parkdale", TORONTO_RADIUS_M),
    (43.6751, -79.4107, "Junction / Bloor West", TORONTO_RADIUS_M),
    (43.7000, -79.4200, "St. Clair West", TORONTO_RADIUS_M),
    (43.7082, -79.3988, "Davisville / Midtown", TORONTO_RADIUS_M),
    (43.7281, -79.3862, "Eglinton / Lawrence", TORONTO_RADIUS_M),
    (43.6548, -79.3244, "Leslieville / Riverside", TORONTO_RADIUS_M),
    (43.6892, -79.3082, "Danforth / Greektown", TORONTO_RADIUS_M),

    # West end / 905 belt
    (43.6435, -79.5656, "Islington / Etobicoke Centre", WEST_END_RADIUS_M),
    (43.6110, -79.4988, "Mimico / Etobicoke Lakeshore", WEST_END_RADIUS_M),
    (43.7280, -79.5650, "Rexdale / North Etobicoke", WEST_END_RADIUS_M),
    (43.5890, -79.6441, "Mississauga City Centre", WEST_END_RADIUS_M),
    (43.5560, -79.5890, "Port Credit", WEST_END_RADIUS_M),
    (43.5890, -79.7120, "Streetsville", WEST_END_RADIUS_M),
    (43.5950, -79.7480, "Meadowvale", WEST_END_RADIUS_M),
    (43.5730, -79.7110, "Erin Mills", WEST_END_RADIUS_M),
    (43.4480, -79.6660, "Downtown Oakville", WEST_END_RADIUS_M),
    (43.4870, -79.6890, "North Oakville", WEST_END_RADIUS_M),
    (43.6850, -79.7600, "Downtown Brampton", WEST_END_RADIUS_M),
    (43.7267, -79.7192, "Bramalea City Centre", WEST_END_RADIUS_M),  # repositioned onto the mall/Dixie Rd retail strip
    (43.6650, -79.8180, "Mount Pleasant, Brampton", WEST_END_RADIUS_M),
    (43.8760, -79.7300, "Bolton, Caledon", WEST_END_RADIUS_M),
    (43.3255, -79.7990, "Downtown Burlington", WEST_END_RADIUS_M),
    (43.3810, -79.7690, "Orchard / Uptown, Burlington", WEST_END_RADIUS_M),  # repositioned off the Oakville border business park onto the Dundas/Appleby retail corridor
    (43.5183, -79.8774, "Downtown Milton", WEST_END_RADIUS_M),

    # Etobicoke — remaining official City of Toronto neighbourhoods
    (43.6015, -79.5450, "Alderwood", WEST_END_RADIUS_M),
    (43.6520, -79.5610, "Eatonville", WEST_END_RADIUS_M),
    (43.6720, -79.5230, "Edenbridge / Humber Valley", WEST_END_RADIUS_M),
    (43.7150, -79.5550, "Elms / Old Rexdale", WEST_END_RADIUS_M),
    (43.6390, -79.5540, "Etobicoke West Mall", WEST_END_RADIUS_M),
    (43.6280, -79.4750, "Humber Bay Shores", WEST_END_RADIUS_M),
    (43.6850, -79.5350, "Humber Heights / Westmount", WEST_END_RADIUS_M),
    (43.7550, -79.5650, "Humber Summit", WEST_END_RADIUS_M),
    (43.6950, -79.5650, "Kingsview Village / The Westway", WEST_END_RADIUS_M),
    (43.6497, -79.5150, "Kingsway South", WEST_END_RADIUS_M),
    (43.5900, -79.5400, "Long Branch", WEST_END_RADIUS_M),
    (43.6280, -79.5750, "Markland Wood", WEST_END_RADIUS_M),
    (43.6000, -79.5100, "New Toronto", WEST_END_RADIUS_M),
    (43.6650, -79.5450, "Princess / Rosethorn", WEST_END_RADIUS_M),
    (43.6350, -79.5050, "Stonegate / Queensway", WEST_END_RADIUS_M),
    (43.7350, -79.5700, "Thistletown / Beaumond Heights", WEST_END_RADIUS_M),
    (43.7250, -79.6050, "West Humber / Clairville", WEST_END_RADIUS_M),
    (43.6900, -79.5750, "Willowridge / Martingrove / Richview", WEST_END_RADIUS_M),

    # Mississauga — remaining official neighbourhoods/planning districts
    (43.6000, -79.5750, "Applewood", WEST_END_RADIUS_M),
    (43.5150, -79.6350, "Clarkson", WEST_END_RADIUS_M),
    (43.5850, -79.6100, "Cooksville", WEST_END_RADIUS_M),
    (43.5650, -79.6950, "Central Erin Mills", WEST_END_RADIUS_M),
    (43.5450, -79.7350, "Churchill Meadows", WEST_END_RADIUS_M),
    (43.6150, -79.6750, "Creditview", WEST_END_RADIUS_M),
    (43.6100, -79.5850, "Dixie", WEST_END_RADIUS_M),
    (43.6050, -79.6950, "East Credit", WEST_END_RADIUS_M),
    (43.5550, -79.6550, "Erindale", WEST_END_RADIUS_M),
    (43.6000, -79.6300, "Fairview", WEST_END_RADIUS_M),
    (43.6250, -79.6300, "Hurontario", WEST_END_RADIUS_M),
    (43.5650, -79.5650, "Lakeview", WEST_END_RADIUS_M),
    (43.6150, -79.7350, "Lisgar", WEST_END_RADIUS_M),
    (43.5350, -79.6100, "Lorne Park", WEST_END_RADIUS_M),
    (43.7150, -79.6350, "Malton", WEST_END_RADIUS_M),
    (43.6150, -79.7650, "Meadowvale Village", WEST_END_RADIUS_M),
    (43.5700, -79.5950, "Mineola", WEST_END_RADIUS_M),
    (43.5950, -79.6200, "Mississauga Valley", WEST_END_RADIUS_M),
    (43.6250, -79.5950, "Rathwood", WEST_END_RADIUS_M),
    (43.5550, -79.6650, "Sheridan", WEST_END_RADIUS_M),
    (43.5450, -79.6550, "Sheridan Park", WEST_END_RADIUS_M),

    # Oakville — remaining official neighbourhoods
    (43.4020, -79.7100, "Bronte", WEST_END_RADIUS_M),
    (43.4400, -79.6450, "Eastlake", WEST_END_RADIUS_M),
    (43.4350, -79.7250, "Glen Abbey", WEST_END_RADIUS_M),
    (43.4950, -79.6750, "Iroquois Ridge North", WEST_END_RADIUS_M),
    (43.4750, -79.6800, "Iroquois Ridge South", WEST_END_RADIUS_M),
    (43.4700, -79.6950, "River Oaks", WEST_END_RADIUS_M),
    (43.4550, -79.7350, "West Oak Trails", WEST_END_RADIUS_M),
    (43.4600, -79.6950, "College Park, Oakville", WEST_END_RADIUS_M),
    (43.4300, -79.6900, "Clearview, Oakville", WEST_END_RADIUS_M),
    (43.4650, -79.7200, "Palermo", WEST_END_RADIUS_M),

    # Brampton — remaining official neighbourhoods
    (43.7550, -79.7950, "Fletcher's Meadow", WEST_END_RADIUS_M),
    (43.7250, -79.7650, "Heart Lake", WEST_END_RADIUS_M),
    (43.7350, -79.7150, "Sandringham / Wellington", WEST_END_RADIUS_M),
    (43.7550, -79.7550, "Snelgrove", WEST_END_RADIUS_M),
    (43.7450, -79.7050, "Springdale", WEST_END_RADIUS_M),
    (43.7650, -79.7150, "Vales of Castlemore", WEST_END_RADIUS_M),
    (43.6950, -79.8150, "Credit Valley", WEST_END_RADIUS_M),
    (43.7100, -79.7850, "Fletcher's Creek", WEST_END_RADIUS_M),
    (43.7150, -79.7150, "Northgate", WEST_END_RADIUS_M),
    (43.6850, -79.7200, "Madoc", WEST_END_RADIUS_M),
    (43.6750, -79.7350, "Southgate", WEST_END_RADIUS_M),
    (43.7050, -79.7500, "Central Park, Brampton", WEST_END_RADIUS_M),
    (43.6650, -79.7750, "Bram West", WEST_END_RADIUS_M),

    # Caledon — remaining towns/hamlets
    (43.8650, -79.8550, "Caledon East", WEST_END_RADIUS_M),
    (43.9150, -79.8550, "Alton, Caledon", WEST_END_RADIUS_M),
    (43.7950, -79.7550, "Inglewood", WEST_END_RADIUS_M),
    (43.9350, -79.7850, "Palgrave", WEST_END_RADIUS_M),

    # Burlington — remaining official neighbourhoods
    (43.3150, -79.8450, "Aldershot", WEST_END_RADIUS_M),
    (43.3600, -79.8300, "Brant Hills", WEST_END_RADIUS_M),
    (43.3900, -79.8150, "Headon Forest", WEST_END_RADIUS_M),
    (43.4000, -79.7950, "Millcroft", WEST_END_RADIUS_M),
    (43.3550, -79.8050, "Mountainside", WEST_END_RADIUS_M),
    (43.3450, -79.7850, "Palmer", WEST_END_RADIUS_M),
    (43.3300, -79.7900, "Roseland", WEST_END_RADIUS_M),
    (43.3250, -79.7650, "Shoreacres", WEST_END_RADIUS_M),
    (43.3800, -79.7950, "Tansley", WEST_END_RADIUS_M),
    (43.3450, -79.8250, "Tyandaga", WEST_END_RADIUS_M),

    # Milton — remaining official neighbourhoods
    (43.5000, -79.8650, "Beaty", WEST_END_RADIUS_M),
    (43.5300, -79.8850, "Bronte Meadows, Milton", WEST_END_RADIUS_M),
    (43.5250, -79.8350, "Coates", WEST_END_RADIUS_M),
    (43.5150, -79.8500, "Dempsey", WEST_END_RADIUS_M),
    (43.5350, -79.8450, "Ford", WEST_END_RADIUS_M),
    (43.5350, -79.8600, "Harrison", WEST_END_RADIUS_M),
    (43.5450, -79.8600, "Scott", WEST_END_RADIUS_M),
    (43.5100, -79.8550, "Timberlea", WEST_END_RADIUS_M),
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
    # Catches places Google leaves generically typed (bars/lounges serving food,
    # diners, etc.) that don't carry any of the specific cuisine types above —
    # infer_cuisine() below buckets these into "American" so they're still
    # filterable, rather than falling into a dead-end "Restaurant" cuisine.
    "restaurant",
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
    # No specific cuisine subtype from Google (generic "restaurant", bar/lounge
    # hybrids, diners, etc.) — bucket into American rather than an unfilterable
    # catch-all, since it's the closest real cuisine and already wired into every
    # cuisine chip, vibe filter, and TasteDNA affinity score.
    return "American"


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


# Caps how many Nearby Search calls are in flight at once, across all zones —
# the per-minute quota is shared account-wide, so bursts across zones trip it
# just as easily as bursts within one zone.
_REQUEST_SEMAPHORE = asyncio.Semaphore(8)


async def fetch_nearby(
    client: httpx.AsyncClient, lat: float, lng: float, place_type: str, radius_m: int = 1500, max_retries: int = 6
) -> list[dict]:
    body = {
        "includedTypes": [place_type],
        "locationRestriction": {
            "circle": {
                "center": {"latitude": lat, "longitude": lng},
                "radius": radius_m,
            }
        },
        "maxResultCount": 20,
    }
    headers = {
        "X-Goog-Api-Key": API_KEY,
        "X-Goog-FieldMask": FIELD_MASK,
        "Content-Type": "application/json",
    }
    for attempt in range(max_retries):
        async with _REQUEST_SEMAPHORE:
            r = await client.post(NEARBY_URL, json=body, headers=headers)
        data = r.json()
        if "error" not in data:
            return data.get("places", [])
        message = data["error"].get("message", "")
        if "Quota exceeded" in message and attempt < max_retries - 1:
            wait = 2 ** (attempt + 1)  # 2, 4, 8, 16, 32s
            await asyncio.sleep(wait)
            continue
        print(f"  API error for {place_type}: {message}")
        return []
    return []


async def main() -> None:
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    seen_place_ids: set[str] = set()
    candidates: list[dict] = []
    skipped_dupe = skipped_quality = 0

    print("Phase 1: Searching Google Places (new API) across all zones and cuisine types...")

    async with httpx.AsyncClient(timeout=30) as client:
        for centre_lat, centre_lng, zone, radius_m in SEARCH_CENTRES:
            print(f"  Zone: {zone}")
            zone_results = await asyncio.gather(
                *[fetch_nearby(client, centre_lat, centre_lng, t, radius_m) for t in CUISINE_TYPES],
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
