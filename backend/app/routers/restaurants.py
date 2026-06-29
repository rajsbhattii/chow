import asyncio
import math

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.config import settings

router = APIRouter(prefix="/api/restaurants", tags=["restaurants"])

PLACES_BASE = "https://places.googleapis.com/v1"

PRICE_MAP = {
    "PRICE_LEVEL_FREE": 0,
    "PRICE_LEVEL_INEXPENSIVE": 1,
    "PRICE_LEVEL_MODERATE": 2,
    "PRICE_LEVEL_EXPENSIVE": 3,
    "PRICE_LEVEL_VERY_EXPENSIVE": 4,
}

FIELD_MASK = ",".join([
    "places.id",
    "places.displayName",
    "places.primaryTypeDisplayName",
    "places.formattedAddress",
    "places.location",
    "places.rating",
    "places.userRatingCount",
    "places.priceLevel",
    "places.photos",
    "places.nationalPhoneNumber",
    "places.websiteUri",
    "places.regularOpeningHours",
    "places.reviews",
])


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2)
    return R * 2 * math.asin(math.sqrt(a))


def _fmt_distance(km: float) -> str:
    return f"{int(km * 1000)} m" if km < 1 else f"{km:.1f} km"


async def _photo_url(client: httpx.AsyncClient, photo_name: str) -> str:
    try:
        r = await client.get(
            f"{PLACES_BASE}/{photo_name}/media",
            params={"maxWidthPx": 800, "skipHttpRedirect": "true",
                    "key": settings.GOOGLE_PLACES_API_KEY},
        )
        return r.json().get("photoUri", "")
    except Exception:
        return ""


def _parse_hours(place: dict) -> dict[str, str]:
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    descriptions = place.get("regularOpeningHours", {}).get("weekdayDescriptions", [])
    result: dict[str, str] = {}
    for i, desc in enumerate(descriptions):
        if i < len(days):
            parts = desc.split(": ", 1)
            result[days[i]] = parts[1] if len(parts) > 1 else desc
    return result


def _parse_reviews(place: dict) -> list[dict]:
    out = []
    for r in place.get("reviews", [])[:3]:
        text = r.get("text", {}).get("text", "")
        if not text:
            continue
        out.append({
            "author": r.get("authorAttribution", {}).get("displayName", "Anonymous"),
            "rating": r.get("rating", 5),
            "date": r.get("relativePublishTimeDescription", ""),
            "text": text,
        })
    return out


def _clean_website(uri: str) -> str:
    for prefix in ("https://", "http://"):
        if uri.startswith(prefix):
            uri = uri[len(prefix):]
    return uri.rstrip("/")


@router.get("/nearby")
async def nearby(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    radius: int = Query(default=2000, le=5000),
):
    if not settings.GOOGLE_PLACES_API_KEY:
        raise HTTPException(503, "GOOGLE_PLACES_API_KEY not configured")

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{PLACES_BASE}/places:searchNearby",
            headers={
                "Content-Type": "application/json",
                "X-Goog-Api-Key": settings.GOOGLE_PLACES_API_KEY,
                "X-Goog-FieldMask": FIELD_MASK,
            },
            json={
                "includedTypes": ["restaurant"],
                "maxResultCount": 20,
                "rankPreference": "POPULARITY",
                "locationRestriction": {
                    "circle": {
                        "center": {"latitude": lat, "longitude": lng},
                        "radius": float(radius),
                    }
                },
            },
        )

        if resp.status_code != 200:
            raise HTTPException(resp.status_code, resp.text)

        places = resp.json().get("places", [])

        # Fetch first photo URL for each place concurrently
        async def _first_photo(place: dict) -> str:
            photos = place.get("photos", [])
            return await _photo_url(client, photos[0]["name"]) if photos else ""

        photo_urls = await asyncio.gather(*[_first_photo(p) for p in places])

    results = []
    for place, img in zip(places, photo_urls):
        loc = place.get("location", {})
        dist_km = _haversine_km(lat, lng, loc.get("latitude", lat), loc.get("longitude", lng))

        cuisine = place.get("primaryTypeDisplayName", {}).get("text", "Restaurant")
        for suffix in (" restaurant", " Restaurant"):
            cuisine = cuisine.replace(suffix, "")
        cuisine = cuisine.strip() or "Restaurant"

        results.append({
            "id": place["id"],
            "name": place.get("displayName", {}).get("text", ""),
            "cuisine": cuisine,
            "priceScale": PRICE_MAP.get(place.get("priceLevel", ""), 2),
            "distance": _fmt_distance(dist_km),
            "rating": round(place.get("rating") or 0, 1),
            "reviewCount": place.get("userRatingCount") or 0,
            "imageUrl": img,
            "address": place.get("formattedAddress", ""),
            "neighborhood": "",
            "phone": place.get("nationalPhoneNumber", ""),
            "website": _clean_website(place.get("websiteUri", "")),
            "hours": _parse_hours(place),
            "tags": [cuisine],
            "reviews": _parse_reviews(place),
        })

    return results
