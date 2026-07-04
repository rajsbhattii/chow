from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from app.models.save import Save
    from app.models.swipe import Swipe
    from app.models.visit import Visit


class User(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "users"

    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    google_id: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # account lifecycle: onboarding | active
    status: Mapped[str] = mapped_column(String(20), default="onboarding", server_default="onboarding")

    # onboarding preferences
    cuisine_preferences: Mapped[list[Any] | None] = mapped_column(JSON, nullable=True)
    adventure_level: Mapped[str | None] = mapped_column(String(20), nullable=True)
    budget_range: Mapped[str | None] = mapped_column(String(10), nullable=True)
    max_distance: Mapped[int | None] = mapped_column(nullable=True)  # km
    transport_modes: Mapped[list[Any] | None] = mapped_column(JSON, nullable=True)
    dietary_needs: Mapped[list[Any] | None] = mapped_column(JSON, nullable=True)

    gambler_count: Mapped[int] = mapped_column(default=0, server_default="0")

    swipes: Mapped[list["Swipe"]] = relationship(back_populates="user")
    saves: Mapped[list["Save"]] = relationship(back_populates="user")
    visits: Mapped[list["Visit"]] = relationship(back_populates="user")
