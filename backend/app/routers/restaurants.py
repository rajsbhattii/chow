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

# Cuisine lists kept deliberately non-overlapping to avoid same restaurants appearing in multiple vibes
DATE_NIGHT_CUISINES = ["Italian", "French", "Mediterranean", "Seafood"]
# Middle Eastern excluded — too chain-heavy (Osmow's etc). Thai/Viet are genuinely niche.
ADVENTUROUS_CUISINES = ["Ethiopian", "Vietnamese", "Thai"]
COMFORT_CUISINES = ["American", "Chinese", "Japanese", "Indian", "Korean"]
# Group dinner requires sit-down (price >= $$) — excludes fast casual like Osmow's/Pitaland
GROUP_CUISINES = ["Indian", "Chinese", "Ethiopian", "Middle Eastern", "Korean", "Mexican"]
# Quick bite excludes sit-down cuisine types even if Google priced them at $$
QUICK_BITE_EXCLUDE_CUISINES = ["Italian", "French", "Mediterranean", "Seafood", "Japanese"]


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
    shuffle: bool = Query(default=False),
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

    # Vibe filter — multi-signal queries per vibe
    if vibe:
        from sqlalchemy import and_, or_
        from sqlalchemy.dialects.postgresql import JSONB

        def cuisine_in(cuisines: list[str]):
            return or_(*[Restaurant.cuisine.cast(JSONB).contains([c]) for c in cuisines])

        def cuisine_not_in(cuisines: list[str]):
            return and_(*[~Restaurant.cuisine.cast(JSONB).contains([c]) for c in cuisines])

        def has_place_type(t: str):
            return Restaurant.place_types.cast(JSONB).contains([t])

        def not_place_type(t: str):
            return ~Restaurant.place_types.cast(JSONB).contains([t])

        if vibe == "date_night":
            # Sit-down Italian/French/etc — exclude pizza chains and fast food
            stmt = stmt.where(
                cuisine_in(DATE_NIGHT_CUISINES),
                not_place_type("fast_food_restaurant"),
                not_place_type("pizza_restaurant"),
                Restaurant.price_scale >= 2,
                Restaurant.avg_rating >= 4.0,
            )
        elif vibe == "quick_bite":
            # Fast food chains OR strictly cheap (price = $) spots
            stmt = stmt.where(
                or_(
                    has_place_type("fast_food_restaurant"),
                    Restaurant.price_scale == 1,
                ),
                Restaurant.avg_rating >= 4.0,
            )
        elif vibe == "brunch":
            stmt = stmt.where(cuisine_in(["Brunch"]))
        elif vibe == "adventurous":
            # Fusion types are always adventurous regardless of preferences
            fusion_cond = or_(
                has_place_type("fusion_restaurant"),
                has_place_type("asian_fusion_restaurant"),
            )

            user_cuisines = set(current_user.cuisine_preferences or [])
            if user_cuisines:
                # Only show niche cuisines the user hasn't flagged as familiar
                unfamiliar = [c for c in ADVENTUROUS_CUISINES if c not in user_cuisines]
                if unfamiliar:
                    niche_cond = or_(fusion_cond, cuisine_in(unfamiliar))
                else:
                    # User already knows all adventurous cuisines — fusion only
                    niche_cond = fusion_cond
            else:
                # No preferences on file — show everything adventurous
                niche_cond = or_(fusion_cond, cuisine_in(ADVENTUROUS_CUISINES))

            stmt = stmt.where(niche_cond, not_place_type("fast_food_restaurant"))
        elif vibe == "comfort":
            stmt = stmt.where(
                cuisine_in(COMFORT_CUISINES),
                Restaurant.price_scale <= 3,
            )
        elif vibe == "group":
            # Sit-down only — Google's fast_food_restaurant type is the clean exclusion signal
            stmt = stmt.where(
                cuisine_in(GROUP_CUISINES),
                not_place_type("fast_food_restaurant"),
                Restaurant.price_scale >= 2,
            )

    # Exclude swiped restaurants — right swipes always excluded, left swipes return after 7 days
    if exclude_swiped:
        from datetime import datetime, timedelta
        left_swipe_cutoff = datetime.utcnow() - timedelta(days=7)

        right_swipe_subq = (
            select(Swipe.restaurant_id)
            .where(Swipe.user_id == current_user.id, Swipe.direction == "right")
            .scalar_subquery()
        )
        recent_left_subq = (
            select(Swipe.restaurant_id)
            .where(
                Swipe.user_id == current_user.id,
                Swipe.direction == "left",
                Swipe.swiped_at >= left_swipe_cutoff,
            )
            .scalar_subquery()
        )
        stmt = stmt.where(
            Restaurant.id.not_in(right_swipe_subq),
            Restaurant.id.not_in(recent_left_subq),
        )

    result = await db.execute(stmt)
    all_restaurants = result.scalars().all()

    # Filter by distance (done in Python after Haversine — avoids PostGIS dependency)
    import random
    with_distance = [
        (r, _haversine_km(lat, lng, float(r.latitude or 0), float(r.longitude or 0)))
        for r in all_restaurants
        if r.latitude and r.longitude
    ]
    with_distance = [(r, d) for r, d in with_distance if d <= max_distance_km]
    if shuffle or vibe:
        random.shuffle(with_distance)
    else:
        with_distance.sort(key=lambda x: x[1])

    total = len(with_distance)
    page = with_distance[offset: offset + limit]

    return {
        "restaurants": [_serialize(r, lat, lng) for r, _ in page],
        "total": total,
        "offset": offset,
    }
