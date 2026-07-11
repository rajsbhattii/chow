import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDMixin

if TYPE_CHECKING:
    from app.models.restaurant import Restaurant
    from app.models.user import User


class Visit(UUIDMixin, Base):
    __tablename__ = "visits"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    restaurant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("restaurants.id", ondelete="CASCADE")
    )
    visited_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    star_rating: Mapped[int | None] = mapped_column(nullable=True)  # 1–5
    would_return: Mapped[str | None] = mapped_column(String(20), nullable=True)
    rating_at_visit: Mapped[float | None] = mapped_column(Numeric(3, 2), nullable=True)
    # definitely | maybe | no

    user: Mapped["User"] = relationship(back_populates="visits")
    restaurant: Mapped["Restaurant"] = relationship(back_populates="visits")
