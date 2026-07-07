import math
import random as _random
from datetime import datetime, timedelta
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

# ── Preference scoring ──────────────────────────────────────────────────────────

# Right-swipe likes decay with a 30-day half-life; left-swipe dislikes decay
# faster (14-day) so "not in the mood" doesn't permanently bury a cuisine.
_LIKE_HALF_LIFE = 30.0
_DISLIKE_HALF_LIFE = 14.0
# Negatives count half as much as positives even before decay.
_DISLIKE_WEIGHT = 0.5
# Minimum swipes before we trust the profile enough to rank by it.
_COLD_START_THRESHOLD = 5
# Fraction of the deck kept random to avoid filter bubbles.
_EXPLORE_FRACTION = 0.20


def _decay(age_days: float, half_life: float) -> float:
    return math.exp(-age_days * math.log(2) / half_life)


def _build_profile(swipes: list[Swipe], active_vibe: str | None) -> dict:
    """Return affinity dicts for cuisine, price_scale, and tags.

    When a vibe is active we weight vibe-matched swipes 70 / global 30.
    """
    now = datetime.utcnow()
    cuisine_scores: dict[str, float] = {}
    price_scores: dict[int, float] = {}
    tag_scores: dict[str, float] = {}

    for swipe in swipes:
        age = (now - swipe.swiped_at).total_seconds() / 86400
        is_like = swipe.direction == "right"
        half_life = _LIKE_HALF_LIFE if is_like else _DISLIKE_HALF_LIFE
        base_w = _decay(age, half_life) * (1.0 if is_like else -_DISLIKE_WEIGHT)

        # Boost vibe-matched swipes when a vibe is active
        vibe_match = active_vibe and swipe.vibe == active_vibe
        w = base_w * (0.7 / 0.3 if vibe_match else 1.0) if active_vibe else base_w

        r = swipe.restaurant
        if r is None:
            continue

        for c in (r.cuisine or []):
            cuisine_scores[c] = cuisine_scores.get(c, 0.0) + w
        ps = r.price_scale or 2
        price_scores[ps] = price_scores.get(ps, 0.0) + w
        for t in (r.tags or []):
            tag_scores[t] = tag_scores.get(t, 0.0) + w

    return {"cuisine": cuisine_scores, "price": price_scores, "tags": tag_scores}


def _score_restaurant(r: Restaurant, profile: dict, dist_km: float, max_dist: float) -> float:
    """Affinity score in [0, ~1]. Higher = better match."""
    cuisine_aff = sum(profile["cuisine"].get(c, 0.0) for c in (r.cuisine or []))
    price_aff = profile["price"].get(r.price_scale or 2, 0.0)
    tag_aff = sum(profile["tags"].get(t, 0.0) for t in (r.tags or []))
    rating = float(r.avg_rating or 3.5) / 5.0
    proximity = 1.0 - (dist_km / max(max_dist, 1.0))

    return (
        cuisine_aff * 0.35
        + price_aff * 0.20
        + tag_aff * 0.15
        + rating * 0.10
        + proximity * 0.20
    )

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
    q: Optional[str] = Query(default=None),
    sort: Optional[str] = Query(default=None),  # trending | new | top_rated
    tag: Optional[str] = Query(default=None),   # hidden_gem | late_night
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Build base query
    stmt = select(Restaurant)

    # Text search
    if q:
        from sqlalchemy import or_
        pattern = f"%{q}%"
        stmt = stmt.where(or_(
            Restaurant.name.ilike(pattern),
            Restaurant.neighbourhood.ilike(pattern),
        ))

    # Tag filters
    if tag == "hidden_gem":
        stmt = stmt.where(
            Restaurant.review_count < 200,
            Restaurant.avg_rating >= 4.5,
        )
    elif tag == "late_night":
        stmt = stmt.where(Restaurant.max_closing_hour >= 23)

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
    with_distance = [
        (r, _haversine_km(lat, lng, float(r.latitude or 0), float(r.longitude or 0)))
        for r in all_restaurants
        if r.latitude and r.longitude
    ]
    with_distance = [(r, d) for r, d in with_distance if d <= max_distance_km]

    if sort == "trending":
        with_distance.sort(key=lambda x: (x[0].review_count or 0), reverse=True)
    elif sort == "new":
        with_distance.sort(key=lambda x: (x[0].created_at or datetime.min), reverse=True)
    elif sort == "top_rated":
        with_distance.sort(key=lambda x: float(x[0].avg_rating or 0), reverse=True)
    elif shuffle:
        _random.shuffle(with_distance)
    else:
        # Personalised ranking — fetch recent swipes with their restaurant relationship
        from sqlalchemy.orm import selectinload
        swipe_result = await db.execute(
            select(Swipe)
            .options(selectinload(Swipe.restaurant))
            .where(
                Swipe.user_id == current_user.id,
                Swipe.swiped_at >= datetime.utcnow() - timedelta(days=90),
            )
            .order_by(Swipe.swiped_at.desc())
            .limit(100)
        )
        recent_swipes = swipe_result.scalars().all()

        if len(recent_swipes) >= _COLD_START_THRESHOLD:
            profile = _build_profile(recent_swipes, vibe)
            scored = [
                (r, d, _score_restaurant(r, profile, d, max_distance_km))
                for r, d in with_distance
            ]
            scored.sort(key=lambda x: x[2], reverse=True)

            # Top 80% ranked, bottom 20% shuffled in for exploration
            split = max(1, int(len(scored) * (1 - _EXPLORE_FRACTION)))
            ranked = scored[:split]
            explore = scored[split:]
            _random.shuffle(explore)
            with_distance = [(r, d) for r, d, _ in ranked + explore]
        elif vibe:
            # Cold start with vibe: shuffle so the deck feels fresh
            _random.shuffle(with_distance)
        else:
            # Cold start no vibe: sort by distance
            with_distance.sort(key=lambda x: x[1])

    total = len(with_distance)
    page = with_distance[offset: offset + limit]

    return {
        "restaurants": [_serialize(r, lat, lng) for r, _ in page],
        "total": total,
        "offset": offset,
    }


@router.get("/random")
async def random_restaurant(
    lat: float = Query(...),
    lng: float = Query(...),
    max_distance_km: int = Query(default=25),
    cuisine: Optional[list[str]] = Query(default=None),
    tag: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    import random as _random
    stmt = select(Restaurant)

    if q:
        from sqlalchemy import or_
        pattern = f"%{q}%"
        stmt = stmt.where(or_(Restaurant.name.ilike(pattern), Restaurant.neighbourhood.ilike(pattern)))

    if tag == "hidden_gem":
        stmt = stmt.where(Restaurant.review_count < 200, Restaurant.avg_rating >= 4.5)
    elif tag == "late_night":
        stmt = stmt.where(Restaurant.max_closing_hour >= 23)

    if cuisine:
        from sqlalchemy import or_
        from sqlalchemy.dialects.postgresql import JSONB
        stmt = stmt.where(or_(*[Restaurant.cuisine.cast(JSONB).contains([c]) for c in cuisine]))

    result = await db.execute(stmt)
    candidates = [
        (r, _haversine_km(lat, lng, float(r.latitude or 0), float(r.longitude or 0)))
        for r in result.scalars().all()
        if r.latitude and r.longitude
    ]
    candidates = [(r, d) for r, d in candidates if d <= max_distance_km]

    if not candidates:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="No restaurants found")

    r, _ = _random.choice(candidates)
    return _serialize(r, lat, lng)
