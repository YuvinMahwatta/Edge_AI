from datetime import datetime, timedelta, timezone
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.sensor_reading import SensorReading
from app.models.system_state import SystemState


def _target_device_id(device_id: str | None) -> str:
    settings = get_settings()
    return device_id or settings.DEFAULT_DEVICE_ID


async def store_reading(db: AsyncSession, data: dict) -> SensorReading:
    avg_light = (data["ldr1"] + data["ldr2"]) / 2
    light_diff = abs(data["ldr1"] - data["ldr2"])

    reading = SensorReading(
        device_id=data.get("device_id") or get_settings().DEFAULT_DEVICE_ID,
        voltage=data["voltage"],
        current=data["current"],
        power=data["power"],
        temperature=data["temperature"],
        ldr1=data["ldr1"],
        ldr2=data["ldr2"],
        avg_light=avg_light,
        light_diff=light_diff,
        condition=data.get("condition", "Normal"),
        confidence=data.get("confidence", 0.0),
        recorded_at=data.get("recorded_at") or datetime.now(timezone.utc),
    )
    db.add(reading)
    await db.flush()
    return reading


async def get_latest_reading(db: AsyncSession, device_id: str | None = None) -> SensorReading | None:
    result = await db.execute(
        select(SensorReading)
        .where(SensorReading.device_id == _target_device_id(device_id))
        .order_by(SensorReading.recorded_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_system_on(db: AsyncSession) -> bool:
    result = await db.execute(select(SystemState).where(SystemState.id == 1))
    state = result.scalar_one_or_none()
    return state.is_on if state else True


async def set_system_on(db: AsyncSession, is_on: bool) -> bool:
    result = await db.execute(select(SystemState).where(SystemState.id == 1))
    state = result.scalar_one_or_none()
    if state is None:
        state = SystemState(id=1, is_on=is_on)
        db.add(state)
    else:
        state.is_on = is_on
        state.updated_at = datetime.now(timezone.utc)
    await db.flush()
    return is_on


async def get_history(
    db: AsyncSession,
    hours: int = 12,
    limit: int = 50,
    device_id: str | None = None,
) -> list[SensorReading]:
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    result = await db.execute(
        select(SensorReading)
        .where(
            SensorReading.recorded_at >= since,
            SensorReading.device_id == _target_device_id(device_id),
        )
        .order_by(SensorReading.recorded_at.asc())
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_condition_distribution(db: AsyncSession, hours: int = 24, device_id: str | None = None) -> list[dict]:
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    result = await db.execute(
        select(SensorReading.condition, func.count(SensorReading.id).label("cnt"))
        .where(
            SensorReading.recorded_at >= since,
            SensorReading.device_id == _target_device_id(device_id),
        )
        .group_by(SensorReading.condition)
    )
    rows = result.all()
    total = sum(r.cnt for r in rows) or 1

    color_map = {
        "Normal": "#10B981",
        "Low Light": "#3B82F6",
        "Shadow": "#F97316",
        "Panel Fault": "#EF4444",
        "Over Heat": "#f43f5e",
    }
    return [
        {"name": r.condition, "value": round(r.cnt / total * 100), "color": color_map.get(r.condition, "#8899AA")}
        for r in rows
    ]


async def get_daily_power(db: AsyncSession, days: int = 7, device_id: str | None = None) -> list[dict]:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(
            func.to_char(SensorReading.recorded_at, 'Dy').label("day"),
            func.avg(SensorReading.power).label("power"),
        )
        .where(
            SensorReading.recorded_at >= since,
            SensorReading.device_id == _target_device_id(device_id),
        )
        .group_by(text("1"))
        .order_by(text("1"))
    )
    rows = result.all()
    return [
        {"day": r.day.strip(), "power": round(float(r.power), 2), "expected": round(float(r.power) * 1.1, 2)}
        for r in rows
    ]
