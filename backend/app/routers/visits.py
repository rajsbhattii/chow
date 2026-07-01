import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.restaurant import Restaurant
from app.models.save import Save
from app.models.visit import Visit
from app.models.user import User

router = APIRouter(prefix="/api/visits", tags=["visits"])


class VisitBody(BaseModel):
    restaurant_id: uuid.UUID
    star_rating: int  # 1–5
    would_return: str  # definitely | maybe | probably_not


async def _check_badges(user_id: uuid.UUID, restaurant: Restaurant, db: AsyncSession) -> list[str]:
    badges = []

    # Off the Map: visited a spot with under 50 reviews
    if restaurant.review_count and restaurant.review_count < 50:
        badges.append("off_the_map")

    # Regular: visited same restaurant 5+ times
    count_result = await db.execute(
        select(func.count()).where(
            Visit.user_id == user_id,
            Visit.restaurant_id == restaurant.id,
        )
    )
    if (count_result.scalar() or 0) >= 5:
        badges.append("regular")

    # First In Line: visited within 7 days of the restaurant being added to DB
    # (we use created_at as a proxy for "new opening")
    visit_result = await db.execute(
        select(Visit).where(
            Visit.user_id == user_id,
            Visit.restaurant_id == restaurant.id,
        ).order_by(Visit.visited_at.asc()).limit(1)
    )
    first_visit = visit_result.scalar_one_or_none()
    restaurant_created_at = getattr(restaurant, 'created_at', None)
    if first_visit and restaurant_created_at:
        days_after = (first_visit.visited_at - restaurant_created_at).days
        if days_after <= 7:
            badges.append("first_in_line")

    return badges


@router.post("")
async def record_visit(
    body: VisitBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not 1 <= body.star_rating <= 5:
        raise HTTPException(status_code=400, detail="star_rating must be 1–5")
    if body.would_return not in ("definitely", "maybe", "probably_not"):
        raise HTTPException(status_code=400, detail="Invalid would_return value")

    result = await db.execute(select(Restaurant).where(Restaurant.id == body.restaurant_id))
    restaurant = result.scalar_one_or_none()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    visit = Visit(
        user_id=current_user.id,
        restaurant_id=body.restaurant_id,
        star_rating=body.star_rating,
        would_return=body.would_return,
    )
    db.add(visit)

    # Update save status → been_here
    save_result = await db.execute(
        select(Save).where(
            Save.user_id == current_user.id,
            Save.restaurant_id == body.restaurant_id,
        )
    )
    save = save_result.scalar_one_or_none()
    if save:
        save.status = "been_here"

    await db.commit()
    await db.refresh(visit)

    badges = await _check_badges(current_user.id, restaurant, db)

    return {
        "visit": {
            "id": str(visit.id),
            "restaurantId": str(visit.restaurant_id),
            "starRating": visit.star_rating,
            "wouldReturn": visit.would_return,
            "visitedAt": visit.visited_at.isoformat(),
        },
        "badgesUnlocked": badges,
    }
