import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models.restaurant import Restaurant
from app.models.save import Save
from app.models.swipe import Swipe
from app.models.user import User

router = APIRouter(prefix="/api/swipes", tags=["swipes"])


class SwipeBody(BaseModel):
    restaurant_id: uuid.UUID
    direction: str  # "left" | "right"


@router.post("", status_code=status.HTTP_201_CREATED)
async def record_swipe(
    body: SwipeBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.direction not in ("left", "right"):
        raise HTTPException(status_code=400, detail="direction must be 'left' or 'right'")

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
    else:
        swipe = Swipe(
            user_id=current_user.id,
            restaurant_id=body.restaurant_id,
            direction=body.direction,
        )
        db.add(swipe)

    saved = False
    if body.direction == "right":
        existing_save = await db.execute(
            select(Save).where(
                Save.user_id == current_user.id,
                Save.restaurant_id == body.restaurant_id,
            )
        )
        if not existing_save.scalar_one_or_none():
            db.add(Save(
                user_id=current_user.id,
                restaurant_id=body.restaurant_id,
                status="want_to_go",
            ))
            saved = True

    await db.commit()
    return {"saved": saved}
