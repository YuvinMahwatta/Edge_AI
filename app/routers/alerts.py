from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.user import User
from app.schemas.alert import AlertListResponse
from app.services.alert_service import list_alerts, resolve_alert
from app.services.firebase_service import publish_alert
from app.utils.deps import get_current_user

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("", response_model=AlertListResponse)
async def get_alerts(
    device_id: str | None = Query(None),
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_device_id = device_id or get_settings().DEFAULT_DEVICE_ID
    return await list_alerts(db, device_id=target_device_id)


@router.patch("/{alert_id}/resolve")
async def mark_resolved(
    alert_id: str,
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    alert = await resolve_alert(db, alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")

    try:
        await publish_alert(alert)
    except Exception:
        pass

    return {"id": alert.id, "resolved": True, "device_id": alert.device_id}
