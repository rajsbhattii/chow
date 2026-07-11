import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.restaurant import Restaurant
from app.models.swipe import Swipe
from app.models.user import User

router = APIRouter(prefix="/api/swipes", tags=["swipes"])

ALLOWED_VIBES = {"date_night", "quick_bite", "brunch", "adventurous", "comfort", "group"}


class SwipeBody(BaseModel):
    restaurant_id: uuid.UUID
    direction: str  # "left" | "right"
    vibe: str | None = None


@router.post("", status_code=status.HTTP_201_CREATED)
async def record_swipe(
    body: SwipeBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.direction not in ("left", "right"):
        raise HTTPException(status_code=400, detail="direction must be 'left' or 'right'")
    if body.vibe is not None and body.vibe not in ALLOWED_VIBES:
        raise HTTPException(status_code=400, detail=f"vibe must be one of {sorted(ALLOWED_VIBES)}")

    # Confirm restaurant exists
    result = await db.execute(select(Restaurant).where(Restaurant.id == body.restaurant_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Restaurant not found")

    # Upsert swipe (user may swipe the same card twice if they restart the deck)
    existing = await db.execute(
        select(Swipe).where(
            Swipe.user_id == current_user.id,
            Swipe.restaurant_id == body.restaurant_id,
        )
    )
    swipe = existing.scalar_one_or_none()
    if swipe:
        swipe.direction = body.direction
        swipe.vibe = body.vibe
    else:
        swipe = Swipe(
            user_id=current_user.id,
            restaurant_id=body.restaurant_id,
            direction=body.direction,
            vibe=body.vibe,
        )
        db.add(swipe)

    await db.commit()
    return {}


@router.delete("/history", status_code=200)
async def reset_swipe_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete all left swipes so the deck refills. Saves are untouched."""
    result = await db.execute(
        delete(Swipe).where(
            Swipe.user_id == current_user.id,
            Swipe.direction == "left",
        )
    )
    await db.commit()
    return {"cleared": result.rowcount}
