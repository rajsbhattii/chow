import hashlib
import os
import secrets
from datetime import datetime, timedelta
from typing import Optional

import resend
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
from app.config import settings
from app.database import get_db
from app.models.password_reset import PasswordReset
from app.models.user import User

resend.api_key = settings.RESEND_API_KEY

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


class UpdateMeBody(BaseModel):
    name: Optional[str] = None
    cuisine_preferences: Optional[list[str]] = None
    budget_range: Optional[str] = None
    max_distance_km: Optional[int] = None
    transport_modes: Optional[list[str]] = None
    adventure_level: Optional[str] = None
    dietary_needs: Optional[list[str]] = None


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


@router.patch("/me")
async def update_me(
    body: UpdateMeBody,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.name is not None:
        current_user.name = body.name
    if body.cuisine_preferences is not None:
        current_user.cuisine_preferences = body.cuisine_preferences
    if body.budget_range is not None:
        current_user.budget_range = body.budget_range
    if body.max_distance_km is not None:
        current_user.max_distance = body.max_distance_km
    if body.transport_modes is not None:
        current_user.transport_modes = body.transport_modes
    if body.adventure_level is not None:
        current_user.adventure_level = body.adventure_level
    if body.dietary_needs is not None:
        current_user.dietary_needs = body.dietary_needs

    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
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


class ForgotPasswordBody(BaseModel):
    email: EmailStr


class ResetPasswordBody(BaseModel):
    token: str
    password: str


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordBody, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    # Always return 200 — never reveal whether the email exists
    if not user:
        return {"ok": True}

    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()

    reset = PasswordReset(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=datetime.utcnow() + timedelta(hours=1),
    )
    db.add(reset)
    await db.commit()

    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={raw_token}"

    resend.Emails.send({
        "from": "onboarding@resend.dev",
        "to": user.email,
        "subject": "Reset your Chow password",
        "html": f"""
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <h2 style="margin:0 0 8px">Reset your password</h2>
          <p style="color:#555;margin:0 0 24px">Click the button below to set a new password. This link expires in 1 hour.</p>
          <a href="{reset_url}" style="display:inline-block;padding:12px 24px;background:#ff5a1f;color:#fff;border-radius:8px;text-decoration:none;font-weight:700">
            Reset password
          </a>
          <p style="color:#999;font-size:12px;margin-top:24px">If you didn't request this, you can safely ignore this email.</p>
        </div>
        """,
    })

    return {"ok": True}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordBody, db: AsyncSession = Depends(get_db)):
    token_hash = hashlib.sha256(body.token.encode()).hexdigest()

    result = await db.execute(
        select(PasswordReset).where(
            PasswordReset.token_hash == token_hash,
            PasswordReset.used == False,  # noqa: E712
            PasswordReset.expires_at > datetime.utcnow(),
        )
    )
    reset = result.scalar_one_or_none()
    if not reset:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    user_result = await db.execute(select(User).where(User.id == reset.user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    user.password_hash = hash_password(body.password)
    reset.used = True
    await db.commit()

    return {"ok": True}
