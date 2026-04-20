from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.utils.deps import get_current_user
from app.models.user import User
from app.models.system_state import UserPreference, SystemState
from app.schemas.settings import (
    SettingsResponse, PreferenceOut, PreferenceUpdate,
    DeviceInfo, SensorStatus,
)

router = APIRouter(prefix="/settings", tags=["Settings"])


async def _get_or_create_prefs(db: AsyncSession, user_id: str) -> UserPreference:
    result = await db.execute(select(UserPreference).where(UserPreference.user_id == user_id))
    prefs = result.scalar_one_or_none()
    if prefs is None:
        prefs = UserPreference(user_id=user_id)
        db.add(prefs)
        await db.flush()
    return prefs


def _uptime(state: SystemState | None) -> str:
    if state is None or state.updated_at is None:
        return "N/A"
    delta = datetime.now(timezone.utc) - state.updated_at.replace(tzinfo=timezone.utc)
    days = delta.days
    hours = delta.seconds // 3600
    mins = (delta.seconds % 3600) // 60
    return f"{days}d {hours}h {mins}m"


@router.get("", response_model=SettingsResponse)
async def get_settings(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    prefs = await _get_or_create_prefs(db, user.id)

    sys_result = await db.execute(select(SystemState).where(SystemState.id == 1))
    sys_state = sys_result.scalar_one_or_none()

    return SettingsResponse(
        preferences=PreferenceOut.model_validate(prefs),
        device=DeviceInfo(uptime=_uptime(sys_state)),
        sensors=[
            SensorStatus(name="INA219 (V/I/P)", status="Calibrated", ok=True),
            SensorStatus(name="DS18B20 (Temp)", status="Calibrated", ok=True),
            SensorStatus(name="LDR Sensor 1", status="Active", ok=True),
            SensorStatus(name="LDR Sensor 2", status="Active", ok=True),
            SensorStatus(name="Voltage Divider", status="Active", ok=True),
        ],
    )


@router.patch("/preferences", response_model=PreferenceOut)
async def update_preferences(
    body: PreferenceUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    prefs = await _get_or_create_prefs(db, user.id)

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(prefs, key, value)
    prefs.updated_at = datetime.now(timezone.utc)

    await db.flush()
    return PreferenceOut.model_validate(prefs)
