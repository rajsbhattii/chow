import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDMixin

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.restaurant import Restaurant
    from app.models.user import User


class Swipe(UUIDMixin, Base):
    __tablename__ = "swipes"
    __table_args__ = (UniqueConstraint("user_id", "restaurant_id"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    restaurant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("restaurants.id", ondelete="CASCADE")
    )
    direction: Mapped[str] = mapped_column(String(5))  # left | right
    vibe: Mapped[str | None] = mapped_column(String(20), nullable=True)
    swiped_at: Mapped[datetime] = mapped_column(server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="swipes")
    restaurant: Mapped["Restaurant"] = relationship(back_populates="swipes")
