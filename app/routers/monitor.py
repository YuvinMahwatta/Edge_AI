import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.user import User
from app.schemas.sensor import (
    DerivedFeatures,
    DeviceCommandResponse,
    DevicePowerCommand,
    LiveSensorData,
    SensorHistoryPoint,
    SensorHistoryResponse,
)
from app.services.firebase_service import publish_command, update_device_state, update_live_fields
from app.services.sensor_service import get_history, get_latest_reading, get_system_on, set_system_on
from app.utils.deps import get_current_user

router = APIRouter(prefix="/monitor", tags=["Monitor"])


@router.get("/live", response_model=LiveSensorData)
async def get_live_data(
    device_id: str | None = Query(None),
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_device_id = device_id or get_settings().DEFAULT_DEVICE_ID
    latest = await get_latest_reading(db, device_id=target_device_id)
    system_on = await get_system_on(db)

    if latest is None:
        return LiveSensorData(
            device_id=target_device_id,
            voltage=0,
            current=0,
            power=0,
            temp=0,
            ldr1=0,
            ldr2=0,
            avg_light=0,
            light_diff=0,
            condition="Normal",
            confidence=0,
            system_on=system_on,
            recorded_at=None,
        )

    return LiveSensorData(
        device_id=target_device_id,
        voltage=latest.voltage,
        current=latest.current,
        power=latest.power,
        temp=latest.temperature,
        ldr1=latest.ldr1,
        ldr2=latest.ldr2,
        avg_light=latest.avg_light or 0,
        light_diff=latest.light_diff or 0,
        condition=latest.condition,
        confidence=latest.confidence,
        system_on=system_on,
        recorded_at=latest.recorded_at,
    )


@router.get("/derived", response_model=DerivedFeatures)
async def get_derived_features(
    device_id: str | None = Query(None),
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_device_id = device_id or get_settings().DEFAULT_DEVICE_ID
    latest = await get_latest_reading(db, device_id=target_device_id)
    if latest is None:
        return DerivedFeatures(avg_light=0, light_diff=0, power_per_irradiance=0, efficiency=0)

    avg = (latest.ldr1 + latest.ldr2) / 2
    diff = abs(latest.ldr1 - latest.ldr2)
    ppi = (latest.power / avg * 1000) if avg > 0 else 0

    return DerivedFeatures(
        avg_light=round(avg, 1),
        light_diff=round(diff, 1),
        power_per_irradiance=round(ppi, 3),
        efficiency=round(latest.efficiency or 0, 1),
    )


@router.get("/history", response_model=SensorHistoryResponse)
async def get_sensor_history(
    hours: int = 12,
    device_id: str | None = Query(None),
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_device_id = device_id or get_settings().DEFAULT_DEVICE_ID
    readings = await get_history(db, hours=hours, device_id=target_device_id)

    def to_points(attr: str) -> list[SensorHistoryPoint]:
        return [
            SensorHistoryPoint(
                time=r.recorded_at.strftime("%H:%M"),
                iso_time=r.recorded_at.isoformat(),
                value=round(getattr(r, attr), 4)
            )
            for r in readings
        ]

    return SensorHistoryResponse(
        voltage=to_points("voltage"),
        current=to_points("current"),
        power=to_points("power"),
        temperature=to_points("temperature"),
        ldr1=[SensorHistoryPoint(time=r.recorded_at.strftime("%H:%M"), iso_time=r.recorded_at.isoformat(), value=r.ldr1) for r in readings],
        ldr2=[SensorHistoryPoint(time=r.recorded_at.strftime("%H:%M"), iso_time=r.recorded_at.isoformat(), value=r.ldr2) for r in readings],
    )


@router.post("/devices/{device_id}/power", response_model=DeviceCommandResponse)
async def toggle_device_power(
    device_id: str,
    body: DevicePowerCommand,
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    new_state = await set_system_on(db, body.is_on)
    command_id = str(uuid.uuid4())
    issued_at = datetime.now(timezone.utc).isoformat()
    command_payload = {
        "command_id": command_id,
        "type": "set_power",
        "value": new_state,
        "issued_at": issued_at,
        "source": "dashboard",
    }

    try:
        await publish_command(device_id, command_payload)
        await update_device_state(
            device_id,
            {
                "desired_on": new_state,
                "last_command_id": command_id,
                "last_command_at": issued_at,
            },
        )
        await update_live_fields(device_id, {"system_on": new_state})
    except Exception:
        pass

    return DeviceCommandResponse(device_id=device_id, command_id=command_id, is_on=new_state)


@router.post("/system-power")
async def toggle_system_power(
    body: DevicePowerCommand,
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    settings = get_settings()
    response = await toggle_device_power(settings.DEFAULT_DEVICE_ID, body, _user, db)
    return {"is_on": response.is_on, "device_id": response.device_id, "command_id": response.command_id}
