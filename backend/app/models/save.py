import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDMixin

if TYPE_CHECKING:
    from app.models.restaurant import Restaurant
    from app.models.user import User


class Save(UUIDMixin, Base):
    __tablename__ = "saves"
    __table_args__ = (UniqueConstraint("user_id", "restaurant_id"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE")
    )
    restaurant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("restaurants.id", ondelete="CASCADE")
    )
    saved_at: Mapped[datetime] = mapped_column(server_default=func.now())
    status: Mapped[str] = mapped_column(String(20), default="want_to_go")
    # want_to_go | been_here

    user: Mapped["User"] = relationship(back_populates="saves")
    restaurant: Mapped["Restaurant"] = relationship(back_populates="saves")
