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
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # onboarding preferences
    adventure_level: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # comfort_zone | open_minded | adventurous | full_send
    budget_range: Mapped[str | None] = mapped_column(String(10), nullable=True)
    # $ | $$ | $$$ | $$$$
    max_distance: Mapped[int | None] = mapped_column(nullable=True)  # km
    dietary_needs: Mapped[list[Any] | None] = mapped_column(JSON, nullable=True)

    swipes: Mapped[list["Swipe"]] = relationship(back_populates="user")
    saves: Mapped[list["Save"]] = relationship(back_populates="user")
    visits: Mapped[list["Visit"]] = relationship(back_populates="user")
