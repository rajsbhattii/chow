import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import and_, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user
from app.database import get_db
from app.models.restaurant import Restaurant
from app.models.save import Save
from app.models.swipe import Swipe
from app.models.user import User
from app.routers.restaurants import _serialize

router = APIRouter(prefix="/api/saves", tags=["saves"])


class SaveBody(BaseModel):
    restaurant_id: uuid.UUID


class PickBody(BaseModel):
    restaurant_id: uuid.UUID


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_save(
    body: SaveBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Restaurant).where(Restaurant.id == body.restaurant_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Restaurant not found")

    # Upsert a right swipe so restaurant is excluded from future deck
    existing_swipe = await db.execute(
        select(Swipe).where(Swipe.user_id == current_user.id, Swipe.restaurant_id == body.restaurant_id)
    )
    swipe = existing_swipe.scalar_one_or_none()
    if swipe:
        swipe.direction = "right"
    else:
        db.add(Swipe(user_id=current_user.id, restaurant_id=body.restaurant_id, direction="right"))

    # Toggle: delete if already saved, create if not
    existing_save = await db.execute(
        select(Save).where(Save.user_id == current_user.id, Save.restaurant_id == body.restaurant_id)
    )
    save = existing_save.scalar_one_or_none()
    if save:
        await db.delete(save)
        await db.commit()
        return {"saved": False}

    try:
        db.add(Save(user_id=current_user.id, restaurant_id=body.restaurant_id, status="want_to_go"))
        await db.commit()
    except IntegrityError:
        await db.rollback()
    return {"saved": True}


@router.post("/pick", status_code=status.HTTP_200_OK)
async def pick_restaurant(
    body: PickBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lock in a tournament winner — upserts save and records picked_at."""
    result = await db.execute(select(Restaurant).where(Restaurant.id == body.restaurant_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Restaurant not found")

    # Upsert right swipe to exclude from future decks
    existing_swipe = await db.execute(
        select(Swipe).where(Swipe.user_id == current_user.id, Swipe.restaurant_id == body.restaurant_id)
    )
    swipe = existing_swipe.scalar_one_or_none()
    if swipe:
        swipe.direction = "right"
    else:
        db.add(Swipe(user_id=current_user.id, restaurant_id=body.restaurant_id, direction="right"))

    # Upsert save and stamp picked_at
    existing_save = await db.execute(
        select(Save).where(Save.user_id == current_user.id, Save.restaurant_id == body.restaurant_id)
    )
    save = existing_save.scalar_one_or_none()
    now = datetime.now(timezone.utc)
    if save:
        save.picked_at = now
        save.snoozed_until = None
        save.nudge_dismissed = False
    else:
        save = Save(
            user_id=current_user.id,
            restaurant_id=body.restaurant_id,
            status="want_to_go",
            picked_at=now,
        )
        db.add(save)

    await db.commit()
    return {"picked": True}


@router.get("/nudge")
async def get_nudge(
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return the single pending nudge for this user, if any."""
    now = datetime.now(timezone.utc)
    q = (
        select(Save)
        .where(
            Save.user_id == current_user.id,
            Save.picked_at.is_not(None),
            Save.status == "want_to_go",
            Save.nudge_dismissed == False,  # noqa: E712
            or_(
                and_(Save.snoozed_until.is_(None), Save.picked_at <= now - timedelta(hours=48)),
                and_(Save.snoozed_until.is_not(None), Save.snoozed_until <= now),
            ),
        )
        .order_by(Save.picked_at.desc())
        .limit(1)
        .options(selectinload(Save.restaurant))
    )
    result = await db.execute(q)
    save = result.scalar_one_or_none()

    if not save or not save.restaurant:
        return {"nudge": None}

    user_lat = lat or 43.6532
    user_lng = lng or -79.3832

    return {
        "nudge": {
            "saveId": str(save.id),
            "isFollowup": save.snoozed_until is not None,
            "restaurant": _serialize(save.restaurant, user_lat, user_lng),
        }
    }


@router.post("/{save_id}/snooze", status_code=status.HTTP_200_OK)
async def snooze_nudge(
    save_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Snooze the nudge for 4 days (first 'Not yet' response)."""
    result = await db.execute(
        select(Save).where(Save.id == save_id, Save.user_id == current_user.id)
    )
    save = result.scalar_one_or_none()
    if not save:
        raise HTTPException(status_code=404, detail="Save not found")

    save.snoozed_until = datetime.now(timezone.utc) + timedelta(days=4)
    await db.commit()
    return {"snoozed": True}


@router.post("/{save_id}/dismiss-nudge", status_code=status.HTTP_200_OK)
async def dismiss_nudge(
    save_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Permanently stop nudging for this save (after second 'Not yet')."""
    result = await db.execute(
        select(Save).where(Save.id == save_id, Save.user_id == current_user.id)
    )
    save = result.scalar_one_or_none()
    if not save:
        raise HTTPException(status_code=404, detail="Save not found")

    save.nudge_dismissed = True
    await db.commit()
    return {"dismissed": True}


@router.get("")
async def list_saves(
    status: Optional[str] = Query(None),  # want_to_go | been_here | all
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Save).where(Save.user_id == current_user.id)
    if status and status != "all":
        q = q.where(Save.status == status)
    q = q.order_by(Save.saved_at.desc()).options(selectinload(Save.restaurant))

    result = await db.execute(q)
    saves = result.scalars().all()

    user_lat = lat or 43.6532
    user_lng = lng or -79.3832

    items = []
    for save in saves:
        r = save.restaurant
        if not r:
            continue
        items.append({
            "saveId": str(save.id),
            "savedAt": save.saved_at.isoformat(),
            "status": save.status,
            "restaurant": _serialize(r, user_lat, user_lng),
        })

    return {"saves": items, "total": len(items)}


@router.delete("/{save_id}", status_code=204)
async def delete_save(
    save_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Save).where(Save.id == save_id, Save.user_id == current_user.id)
    )
    save = result.scalar_one_or_none()
    if not save:
        raise HTTPException(status_code=404, detail="Save not found")
    await db.delete(save)
    await db.commit()
