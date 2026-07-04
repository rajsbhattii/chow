from collections import Counter

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.restaurant import Restaurant
from app.models.save import Save
from app.models.swipe import Swipe
from app.models.user import User
from app.models.visit import Visit

router = APIRouter(prefix="/api/profile", tags=["profile"])

# Maps cuisine → vibe label (first match wins)
CUISINE_TO_VIBE: list[tuple[set[str], str]] = [
    ({"Italian", "French", "Mediterranean", "Seafood"}, "Date night"),
    ({"Ethiopian", "Vietnamese", "Thai"}, "Adventurous"),
    ({"Brunch"}, "Brunch"),
    ({"American", "Chinese", "Japanese", "Indian", "Korean"}, "Comfort food"),
    ({"Indian", "Chinese", "Ethiopian", "Middle Eastern", "Korean", "Mexican"}, "Group dinner"),
]


def _adventure_tier(cuisines_tried: int) -> str | None:
    if cuisines_tried == 0:
        return None
    if cuisines_tried <= 2:
        return "comfort_zone"
    if cuisines_tried <= 5:
        return "open_minded"
    if cuisines_tried <= 9:
        return "adventurous"
    return "full_send"


def _favourite_vibe(visited: list[Restaurant]) -> str | None:
    vibe_counts: Counter = Counter()
    for r in visited:
        for cuisine in (r.cuisine or []):
            for cuisine_set, vibe_label in CUISINE_TO_VIBE:
                if cuisine in cuisine_set:
                    vibe_counts[vibe_label] += 1
                    break
    return vibe_counts.most_common(1)[0][0] if vibe_counts else None


@router.get("/stats")
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = current_user.id

    visit_count = (await db.execute(
        select(func.count()).where(Visit.user_id == uid)
    )).scalar() or 0

    swipe_count = (await db.execute(
        select(func.count()).where(Swipe.user_id == uid)
    )).scalar() or 0

    save_count = (await db.execute(
        select(func.count()).where(Save.user_id == uid)
    )).scalar() or 0

    # Visited restaurants — used for cuisine/vibe/badge computation
    visited_result = await db.execute(
        select(Restaurant)
        .join(Visit, Visit.restaurant_id == Restaurant.id)
        .where(Visit.user_id == uid)
    )
    visited = visited_result.scalars().all()

    # Favourite cuisine — most common single cuisine across all visited restaurants
    cuisine_counts: Counter = Counter(c for r in visited for c in (r.cuisine or []))
    favourite_cuisine = cuisine_counts.most_common(1)[0][0] if cuisine_counts else None

    cuisines_tried = len(cuisine_counts)

    # All visits for regular badge
    all_visits_result = await db.execute(
        select(Visit.restaurant_id).where(Visit.user_id == uid)
    )
    visit_counts = Counter(all_visits_result.scalars().all())

    # Badge computation
    badges: list[str] = []
    if any(r.review_count and r.review_count < 50 for r in visited):
        badges.append("off_the_map")
    if any(c >= 5 for c in visit_counts.values()):
        badges.append("regular")
    if cuisines_tried >= 10:
        badges.append("globe_trotter")

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
