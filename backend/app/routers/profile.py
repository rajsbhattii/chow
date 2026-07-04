from collections import Counter
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.restaurant import Restaurant
from app.models.save import Save
from app.models.swipe import Swipe
from app.models.user import User
from app.models.visit import Visit

router = APIRouter(prefix="/api/profile", tags=["profile"])

ADVENTUROUS_CUISINES = {"Ethiopian", "Vietnamese", "Thai"}
DATE_NIGHT_CUISINES  = {"Italian", "French", "Mediterranean", "Seafood"}

CUISINE_TO_VIBE: list[tuple[set[str], str]] = [
    (DATE_NIGHT_CUISINES, "Date night"),
    (ADVENTUROUS_CUISINES, "Adventurous"),
    ({"Brunch"}, "Brunch"),
    ({"American", "Chinese", "Japanese", "Indian", "Korean"}, "Comfort food"),
    ({"Indian", "Chinese", "Ethiopian", "Middle Eastern", "Korean", "Mexican"}, "Group dinner"),
]


def _adventure_tier(cuisines_tried: int) -> str | None:
    if cuisines_tried == 0:   return None
    if cuisines_tried <= 2:   return "comfort_zone"
    if cuisines_tried <= 5:   return "open_minded"
    if cuisines_tried <= 9:   return "adventurous"
    return "full_send"


def _favourite_vibe(visited: list[Restaurant]) -> str | None:
    counts: Counter = Counter()
    for r in visited:
        for cuisine in (r.cuisine or []):
            for cuisine_set, vibe_label in CUISINE_TO_VIBE:
                if cuisine in cuisine_set:
                    counts[vibe_label] += 1
                    break
    return counts.most_common(1)[0][0] if counts else None


@router.get("/stats")
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    year: Optional[int] = Query(default=None),
):
    uid = current_user.id

    def by_year(stmt, col):
        return stmt.where(extract("year", col) == year) if year else stmt

    visit_count = (await db.execute(
        by_year(select(func.count()).where(Visit.user_id == uid), Visit.visited_at)
    )).scalar() or 0

    swipe_count = (await db.execute(
        by_year(select(func.count()).where(Swipe.user_id == uid), Swipe.swiped_at)
    )).scalar() or 0

    save_count = (await db.execute(
        by_year(select(func.count()).where(Save.user_id == uid), Save.saved_at)
    )).scalar() or 0

    # All visits with their data (for star rating, restaurant join)
    visits_result = await db.execute(
        by_year(select(Visit).where(Visit.user_id == uid), Visit.visited_at)
    )
    all_visits = visits_result.scalars().all()

    # Visited restaurants with full data
    visited_stmt = (
        select(Restaurant)
        .join(Visit, Visit.restaurant_id == Restaurant.id)
        .where(Visit.user_id == uid)
    )
    if year:
        visited_stmt = visited_stmt.where(extract("year", Visit.visited_at) == year)
    visited_result = await db.execute(visited_stmt)
    visited = visited_result.scalars().all()

    # Build lookup: restaurant_id → restaurant
    restaurant_map = {r.id: r for r in visited}

    cuisine_counts: Counter = Counter(c for r in visited for c in (r.cuisine or []))
    favourite_cuisine = cuisine_counts.most_common(1)[0][0] if cuisine_counts else None
    cuisines_tried = len(cuisine_counts)

    visit_counts_by_restaurant = Counter(v.restaurant_id for v in all_visits)

    # ── Badge computation ────────────────────────────────────────────────────────

    badges: list[str] = []

    # Foodie — 5+ total visits
    if visit_count >= 5:
        badges.append("foodie")

    # Critic — 25+ total visits
    if visit_count >= 25:
        badges.append("critic")

    # Five Star — gave a 5-star rating
    if any(v.star_rating == 5 for v in all_visits):
        badges.append("five_star")

    # Regular — visited same spot 5+ times
    if any(c >= 5 for c in visit_counts_by_restaurant.values()):
        badges.append("regular")

    # Off the Map — visited a restaurant with < 50 reviews
    if any(r.review_count and r.review_count < 50 for r in visited):
        badges.append("off_the_map")

    # Hidden Gem — < 200 reviews AND avg_rating >= 4.5
    if any(
        r.review_count and r.review_count < 200
        and r.avg_rating and float(r.avg_rating) >= 4.5
        for r in visited
    ):
        badges.append("hidden_gem")

    # Splurge — visited a $$$$ restaurant
    if any(r.price_scale == 4 for r in visited):
        badges.append("splurge")

    # Cheap Eats — visited 3+ $ restaurants
    budget_spots = {r.id for r in visited if r.price_scale == 1}
    if len(budget_spots) >= 3:
        badges.append("cheap_eats")

    # Neighbourhood Hopper — 3+ distinct neighbourhoods
    hoods = {r.neighbourhood for r in visited if r.neighbourhood}
    if len(hoods) >= 3:
        badges.append("neighbourhood_hopper")

    # Adventurous Eater — visited Ethiopian, Vietnamese, Thai, or fusion
    fusion_types = {"fusion_restaurant", "asian_fusion_restaurant"}
    def is_adventurous(r: Restaurant) -> bool:
        cuisines = set(r.cuisine or [])
        place_types = set(r.place_types or [])
        return bool(cuisines & ADVENTUROUS_CUISINES) or bool(place_types & fusion_types)

    if any(is_adventurous(r) for r in visited):
        badges.append("adventurous_eater")

    # Brunch Club — visited a brunch restaurant
    if any("Brunch" in (r.cuisine or []) for r in visited):
        badges.append("brunch_club")

    # Date Night Pro — visited 3+ date night cuisine restaurants
    date_night_spots = {r.id for r in visited if set(r.cuisine or []) & DATE_NIGHT_CUISINES}
    if len(date_night_spots) >= 3:
        badges.append("date_night_pro")

    # Globe Trotter — tried 10+ cuisines
    if cuisines_tried >= 10:
        badges.append("globe_trotter")

    # First In Line — first visit to a restaurant within 7 days of it being added
    for v in all_visits:
        r = restaurant_map.get(v.restaurant_id)
        if r and r.created_at and (v.visited_at - r.created_at) <= timedelta(days=7):
            badges.append("first_in_line")
            break

    return {
        "visits": visit_count,
        "swipes": swipe_count,
        "saves": save_count,
        "cuisines_tried": cuisines_tried,
        "favourite_cuisine": favourite_cuisine,
        "favourite_vibe": _favourite_vibe(visited),
        "adventure_score": _adventure_tier(cuisines_tried),
        "badges_earned": badges,
    }


@router.get("/taste-dna")
async def get_taste_dna(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    year: Optional[int] = Query(default=None),
):
    uid = current_user.id

    visits_stmt = select(Visit).where(Visit.user_id == uid)
    if year:
        visits_stmt = visits_stmt.where(extract("year", Visit.visited_at) == year)
    all_visits = (await db.execute(visits_stmt)).scalars().all()

    if not all_visits:
        return {"empty": True}

    restaurant_ids = [v.restaurant_id for v in all_visits]
    restaurants_result = await db.execute(
        select(Restaurant).where(Restaurant.id.in_(restaurant_ids))
    )
    restaurants = {r.id: r for r in restaurants_result.scalars().all()}

    # Cuisine breakdown
    cuisine_counts: Counter = Counter()
    for v in all_visits:
        r = restaurants.get(v.restaurant_id)
        for c in (r.cuisine or [] if r else []):
            cuisine_counts[c] += 1
    total_cuisine_visits = sum(cuisine_counts.values()) or 1
    cuisine_breakdown = [
        {"cuisine": c, "count": n, "pct": round(n / total_cuisine_visits * 100)}
        for c, n in cuisine_counts.most_common(6)
    ]

    # Price breakdown
    price_counts: Counter = Counter()
    for v in all_visits:
        r = restaurants.get(v.restaurant_id)
        if r and r.price_scale:
            price_counts[r.price_scale] += 1
    total_price = sum(price_counts.values()) or 1
    price_breakdown = [
        {"tier": k, "label": {1: "$", 2: "$$", 3: "$$$", 4: "$$$$"}[k], "count": price_counts[k], "pct": round(price_counts[k] / total_price * 100)}
        for k in [1, 2, 3, 4] if price_counts[k] > 0
    ]

    # Top neighbourhoods
    hood_counts: Counter = Counter()
    for v in all_visits:
        r = restaurants.get(v.restaurant_id)
        if r and r.neighbourhood:
            hood_counts[r.neighbourhood] += 1
    top_neighbourhoods = [{"name": n, "count": c} for n, c in hood_counts.most_common(5)]

    # Avg rating given
    rated = [v.star_rating for v in all_visits if v.star_rating is not None]
    avg_rating = round(sum(rated) / len(rated), 1) if rated else None

    # Most visited restaurants
    visit_counts: Counter = Counter(v.restaurant_id for v in all_visits)
    most_visited = []
    for rid, count in visit_counts.most_common(3):
        r = restaurants.get(rid)
        if r:
            most_visited.append({"name": r.name, "count": count, "emoji": r.image_emoji or "🍽️"})

    # Would return breakdown
    return_counts: Counter = Counter(v.would_return for v in all_visits if v.would_return)

    return {
        "empty": False,
        "total_visits": len(all_visits),
        "cuisine_breakdown": cuisine_breakdown,
        "price_breakdown": price_breakdown,
        "top_neighbourhoods": top_neighbourhoods,
        "avg_rating_given": avg_rating,
        "most_visited": most_visited,
        "would_return_breakdown": dict(return_counts),
    }
