import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    device_id: Mapped[str] = mapped_column(String(100), nullable=False, default="device-001", index=True)

    # ── INA219 sensor ──
    voltage: Mapped[float] = mapped_column(Float, nullable=False)
    current: Mapped[float] = mapped_column(Float, nullable=False)
    power: Mapped[float] = mapped_column(Float, nullable=False)

    # ── DS18B20 sensor ──
    temperature: Mapped[float] = mapped_column(Float, nullable=False)

    # ── LDR sensors ──
    ldr1: Mapped[int] = mapped_column(Integer, nullable=False)
    ldr2: Mapped[int] = mapped_column(Integer, nullable=False)

    # ── Derived features ──
    avg_light: Mapped[float | None] = mapped_column(Float, nullable=True)
    light_diff: Mapped[float | None] = mapped_column(Float, nullable=True)
    efficiency: Mapped[float | None] = mapped_column(Float, nullable=True)

    # ── ML classification result ──
    condition: Mapped[str] = mapped_column(String(50), default="Normal")
    confidence: Mapped[float] = mapped_column(Float, default=0.0)

    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True
    )
