from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDMixin

if TYPE_CHECKING:
    from app.models.save import Save
    from app.models.swipe import Swipe
    from app.models.visit import Visit


class Restaurant(UUIDMixin, Base):
    __tablename__ = "restaurants"

    name: Mapped[str] = mapped_column(String(255))
    location: Mapped[str | None] = mapped_column(Text, nullable=True)
    latitude: Mapped[float | None] = mapped_column(Numeric(9, 6), nullable=True)
    longitude: Mapped[float | None] = mapped_column(Numeric(9, 6), nullable=True)
    cuisine: Mapped[list[Any] | None] = mapped_column(JSON, nullable=True)
    price_scale: Mapped[int | None] = mapped_column(nullable=True)  # 1–4
    busy_hours: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    website: Mapped[str | None] = mapped_column(Text, nullable=True)
    avg_rating: Mapped[float | None] = mapped_column(Numeric(3, 2), nullable=True)
    review_count: Mapped[int | None] = mapped_column(nullable=True)
    top_reviews: Mapped[list[Any] | None] = mapped_column(JSON, nullable=True)
    tags: Mapped[list[Any] | None] = mapped_column(JSON, nullable=True)
    place_types: Mapped[list[Any] | None] = mapped_column(JSON, nullable=True)
    neighbourhood: Mapped[str | None] = mapped_column(String(120), nullable=True)
    google_place_id: Mapped[str | None] = mapped_column(
        String(255), unique=True, nullable=True, index=True
    )
    image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_emoji: Mapped[str | None] = mapped_column(String(8), nullable=True)

    swipes: Mapped[list["Swipe"]] = relationship(back_populates="restaurant")
    saves: Mapped[list["Save"]] = relationship(back_populates="restaurant")
    visits: Mapped[list["Visit"]] = relationship(back_populates="restaurant")
