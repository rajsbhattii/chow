import math
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.restaurant import Restaurant
from app.models.swipe import Swipe
from app.models.user import User

router = APIRouter(prefix="/api/restaurants", tags=["restaurants"])

PRICE_LABEL = {1: "$", 2: "$$", 3: "$$$", 4: "$$$$"}

VIBE_TAGS = {
    "date_night": "Date night",
    "quick_bite": "Quick bite",
    "brunch": "Brunch",
    "adventurous": "Trending",
    "comfort": "Comfort food",
    "group": "Group-friendly",
}


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _serialize(r: Restaurant, lat: float, lng: float) -> dict:
    dist_km = _haversine_km(lat, lng, float(r.latitude or 0), float(r.longitude or 0))
    walk_min = round(dist_km / 0.083)  # ~5 km/h
    cuisines = r.cuisine or []
    return {
        "id": str(r.id),
        "name": r.name,
        "cuisine": cuisines[0] if cuisines else "Restaurant",
        "priceScale": r.price_scale or 2,
        "priceLabel": PRICE_LABEL.get(r.price_scale or 2, "$$"),
        "distanceKm": round(dist_km, 2),
        "walkMinutes": walk_min,
        "avgRating": float(r.avg_rating) if r.avg_rating else None,
        "reviewCount": r.review_count,
        "busyHours": r.busy_hours,
        "tags": r.tags or [],
        "imageUrl": r.image_url,
        "imageEmoji": r.image_emoji or "🍽️",
        "neighbourhood": r.neighbourhood,
        "website": r.website,
        "location": r.location,
    }


@router.get("")
async def list_restaurants(
    lat: float = Query(...),
    lng: float = Query(...),
    budget: Optional[list[str]] = Query(default=None),
    cuisine: Optional[list[str]] = Query(default=None),
    max_distance_km: int = Query(default=25),
    vibe: Optional[str] = Query(default=None),
    dietary: Optional[list[str]] = Query(default=None),
    exclude_swiped: bool = Query(default=True),
    limit: int = Query(default=20, le=100),
    offset: int = Query(default=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Build base query
    stmt = select(Restaurant)

    # Budget filter — map "$" labels to price_scale ints
    if budget:
        price_map = {"$": 1, "$$": 2, "$$$": 3, "$$$$": 4}
        scales = [price_map[b] for b in budget if b in price_map]
        if scales:
            stmt = stmt.where(Restaurant.price_scale.in_(scales))

    # Cuisine filter (case-insensitive contains)
    if cuisine:
        from sqlalchemy import or_, cast
        from sqlalchemy.dialects.postgresql import JSONB
        conditions = [
            Restaurant.cuisine.cast(JSONB).contains([c]) for c in cuisine
        ]
        stmt = stmt.where(or_(*conditions))

    # Vibe filter — match against tags
    if vibe and vibe in VIBE_TAGS:
        tag = VIBE_TAGS[vibe]
        from sqlalchemy.dialects.postgresql import JSONB
        stmt = stmt.where(Restaurant.tags.cast(JSONB).contains([tag]))

    # Exclude already-swiped restaurants
    if exclude_swiped:
        swiped_subq = (
            select(Swipe.restaurant_id)
            .where(Swipe.user_id == current_user.id)
            .scalar_subquery()
        )
        stmt = stmt.where(Restaurant.id.not_in(swiped_subq))

    result = await db.execute(stmt)
    all_restaurants = result.scalars().all()

    # Filter by distance (done in Python after Haversine — avoids PostGIS dependency)
    with_distance = [
        (r, _haversine_km(lat, lng, float(r.latitude or 0), float(r.longitude or 0)))
        for r in all_restaurants
        if r.latitude and r.longitude
    ]
    with_distance = [(r, d) for r, d in with_distance if d <= max_distance_km]
    with_distance.sort(key=lambda x: x[1])

    total = len(with_distance)
    page = with_distance[offset: offset + limit]

    return {
        "restaurants": [_serialize(r, lat, lng) for r, _ in page],
        "total": total,
        "offset": offset,
    }
