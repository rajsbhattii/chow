import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user
from app.database import get_db
from app.models.save import Save
from app.models.user import User
from app.routers.restaurants import _serialize

router = APIRouter(prefix="/api/saves", tags=["saves"])


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

    # Fall back to CN Tower if no location provided
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
