from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import (
    _decode_token,
    create_access_token,
    create_refresh_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.database import get_db
from app.models.user import User

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ── Schemas ────────────────────────────────────────────────────────────────────

class RegisterBody(BaseModel):
    name: str
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class GoogleBody(BaseModel):
    id_token: str


class RefreshBody(BaseModel):
    refresh_token: str


class OnboardingBody(BaseModel):
    cuisine_preferences: list[str] = []
    budget_range: str = "$$"
    max_distance_km: int = 10
    transport_modes: list[str] = []
    adventure_level: str = "open_minded"
    dietary_needs: list[str] = []


def _user_dict(user: User) -> dict:
    return {
        "id": str(user.id),
        "name": user.name,
        "email": user.email,
        "status": user.status,
        "adventure_level": user.adventure_level,
        "budget_range": user.budget_range,
        "max_distance": user.max_distance,
        "cuisine_preferences": user.cuisine_preferences or [],
        "transport_modes": user.transport_modes or [],
        "dietary_needs": user.dietary_needs or [],
    }


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterBody, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        name=body.name,
        email=body.email,
        password_hash=hash_password(body.password),
        status="onboarding",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return {
        "access_token": create_access_token(str(user.id)),
        "refresh_token": create_refresh_token(str(user.id)),
        "token_type": "bearer",
        "user": _user_dict(user),
    }


@router.post("/login")
async def login(body: LoginBody, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.password_hash or ""):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    return {
        "access_token": create_access_token(str(user.id)),
        "refresh_token": create_refresh_token(str(user.id)),
        "token_type": "bearer",
        "is_new_user": user.status == "onboarding",
        "user": _user_dict(user),
    }


@router.post("/google")
async def google_auth(_body: GoogleBody):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Google OAuth not yet configured",
    )


@router.post("/refresh")
async def refresh_token(body: RefreshBody, db: AsyncSession = Depends(get_db)):
    user_id = _decode_token(body.refresh_token, "refresh")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return {
        "access_token": create_access_token(str(user.id)),
        "token_type": "bearer",
    }


@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    return _user_dict(current_user)


@router.post("/onboarding")
async def onboarding(
    body: OnboardingBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.cuisine_preferences = body.cuisine_preferences
    current_user.budget_range = body.budget_range
    current_user.max_distance = body.max_distance_km
    current_user.transport_modes = body.transport_modes
    current_user.adventure_level = body.adventure_level
    current_user.dietary_needs = body.dietary_needs
    current_user.status = "active"

    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)

    return _user_dict(current_user)
