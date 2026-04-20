from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.user import User
from app.schemas.dashboard import DashboardResponse
from app.services.sensor_service import (
    get_condition_distribution,
    get_daily_power,
    get_latest_reading,
    get_system_on,
)
from app.utils.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardResponse)
async def get_dashboard(
    device_id: str | None = Query(None),
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_device_id = device_id or get_settings().DEFAULT_DEVICE_ID
    latest = await get_latest_reading(db, device_id=target_device_id)
    system_on = await get_system_on(db)
    conditions = await get_condition_distribution(db, device_id=target_device_id)
    daily = await get_daily_power(db, device_id=target_device_id)

    if latest is None:
        return DashboardResponse(
            voltage=0,
            current=0,
            power=0,
            temp=0,
            ldr1=0,
            ldr2=0,
            condition="Normal",
            confidence=0,
            system_on=system_on,
            condition_distribution=conditions or [],
            daily_power=daily or [],
        )

    return DashboardResponse(
        voltage=latest.voltage,
        current=latest.current,
        power=latest.power,
        temp=latest.temperature,
        ldr1=latest.ldr1,
        ldr2=latest.ldr2,
        condition=latest.condition,
        confidence=latest.confidence,
        system_on=system_on,
        condition_distribution=conditions,
        daily_power=daily,
    )
