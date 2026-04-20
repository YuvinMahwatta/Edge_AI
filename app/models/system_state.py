import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class SystemState(Base):
    """Global system ON/OFF state – single row table."""
    __tablename__ = "system_state"

    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    is_on: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class UserPreference(Base):
    """Per-user settings: notifications, display, etc."""
    __tablename__ = "user_preferences"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True)

    # Notification preferences
    email_notifications: Mapped[bool] = mapped_column(Boolean, default=True)
    realtime_alerts: Mapped[bool] = mapped_column(Boolean, default=True)
    weekly_summary: Mapped[bool] = mapped_column(Boolean, default=False)

    # Display preferences
    temp_unit: Mapped[str] = mapped_column(String(20), default="celsius")       # celsius | fahrenheit
    energy_unit: Mapped[str] = mapped_column(String(20), default="kw")          # kw | wh
    refresh_rate: Mapped[int] = mapped_column(default=5)                        # seconds

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
