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
        .order_by(SensorReading.recorded_at.desc())
        .limit(limit)
    )
    records = list(result.scalars().all())
    records.reverse()  # Reverse so oldest is first, newest is last for the chart
    return records


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
    
    counts = {
        "Normal": 0,
        "Low Light": 0,
        "Shadowing": 0,
        "Panel Fault": 0,
        "Over Heat": 0
    }
    
    for r in rows:
        cond = r.condition
        if cond == "Shadow": cond = "Shadowing"
        if cond == "Overheat": cond = "Over Heat"
        if cond in counts:
            counts[cond] += r.cnt

    total = sum(counts.values()) or 1

    color_map = {
        "Normal": "#10B981",
        "Low Light": "#3B82F6",
        "Shadowing": "#F97316",
        "Panel Fault": "#EF4444",
        "Over Heat": "#f43f5e",
    }
    
    ordered_keys = ["Normal", "Low Light", "Shadowing", "Panel Fault", "Over Heat"]
    
    return [
        {"name": k, "value": round(counts[k] / total * 100, 1), "color": color_map.get(k, "#8899AA")}
        for k in ordered_keys
    ]


async def get_daily_power(db: AsyncSession, days: int = 7, device_id: str | None = None) -> list[dict]:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        select(
            func.date(SensorReading.recorded_at).label("d"),
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
    
    power_map = {str(r.d): float(r.power) for r in rows if r.power is not None}
    
    chart_data = []
    for i in range(days - 1, -1, -1):
        target_date = (datetime.now(timezone.utc) - timedelta(days=i)).date()
        day_name = target_date.strftime("%a")
        power_val = power_map.get(str(target_date), 0.0)
        
        chart_data.append({
            "day": day_name,
            "power": round(power_val, 4),
            "expected": round(power_val * 1.1, 4)
        })
        
    return chart_data
