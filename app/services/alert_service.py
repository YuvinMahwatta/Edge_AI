from datetime import datetime, timezone
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.alert import Alert


def _relative_time(dt: datetime) -> str:
    now = datetime.now(timezone.utc)
    diff = now - dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else now - dt

    seconds = int(diff.total_seconds())
    if seconds < 60:
        return "Just now"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes} min ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours} hour{'s' if hours != 1 else ''} ago"
    days = hours // 24
    if days < 7:
        return f"{days} day{'s' if days != 1 else ''} ago"
    return dt.strftime("%b %d, %Y")


async def create_alert(
    db: AsyncSession,
    title: str,
    description: str,
    alert_type: str = "warning",
    severity: str = "medium",
    device_id: str | None = None,
) -> Alert:
    settings = get_settings()
    alert = Alert(
        device_id=device_id or settings.DEFAULT_DEVICE_ID,
        type=alert_type,
        severity=severity,
        title=title,
        description=description,
    )
    db.add(alert)
    await db.flush()
    return alert


async def create_alert_from_condition(
    db: AsyncSession,
    condition: str,
    confidence: float,
    device_id: str | None = None,
) -> Alert | None:
    print(f"\n[ALERT_DEBUG] Received Condition: '{condition}' (Type: {type(condition)})", flush=True)
    
    mapping = {
        "Normal": (
            "success",
            "low",
            "System Operating Normally",
            "All parameters are within typical ranges and no faults were detected.",
        ),
        "Low Light": (
            "info",
            "low",
            "Low Light Condition",
            "Light intensity below threshold. Reduced output is expected during cloudy periods.",
        ),
        "Shadow": (
            "danger",
            "high",
            "Panel Shadowing Detected",
            "Significant light difference detected between LDR zones. Check for debris or new obstacles.",
        ),
        "Shadowing": (
            "danger",
            "high",
            "Partial Shadowing Detected",
            "Significant light difference detected between LDR zones. Check for debris or new obstacles.",
        ),
        "Overheat": (
            "warning",
            "medium",
            "High Temperature Warning",
            "System temperature has exceeded safe thresholds. Throttling or cooling may be required.",
        ),
        "Over Heat": (
            "warning",
            "medium",
            "High Temperature Warning",
            "System temperature has exceeded safe thresholds. Throttling or cooling may be required.",
        ),
        "Dust Accumulation": (
            "warning",
            "medium",
            "Dust Accumulation Detected",
            "Efficiency has dropped. Cleaning recommended to restore optimal output.",
        ),
        "Panel Fault": (
            "danger",
            "critical",
            "Panel Hardware Fault",
            "Sensor readings indicate a possible hardware fault in the solar array.",
        ),
        "Fault": (
            "danger",
            "critical",
            "System Fault Detected",
            "Sensor readings indicate a possible hardware fault. Immediate inspection required.",
        ),
    }

    info = mapping.get(condition)
    if info is None:
        print(f"[ALERT_DEBUG] No mapping found for condition: '{condition}'", flush=True)
        return None

    alert_type, severity, title, desc = info
    
    # --- ALWAYS create a new alert for every ingest to ensure live stacking ---
    print(f"[ALERT_DEBUG] SUCCESS: Creating NEW alert: '{title}'", flush=True)
    return await create_alert(
        db,
        title,
        desc,
        alert_type,
        severity,
        device_id=device_id,
    )


async def list_alerts(db: AsyncSession, device_id: str | None = None) -> dict:
    settings = get_settings()
    target_device_id = device_id or settings.DEFAULT_DEVICE_ID

    result = await db.execute(
        select(Alert)
        .where(Alert.device_id == target_device_id)
        .order_by(Alert.created_at.desc())
        .limit(50)
    )
    all_alerts = list(result.scalars().all())

    def to_dict(a: Alert) -> dict:
        return {
            "id": a.id,
            "device_id": a.device_id,
            "type": a.type,
            "severity": a.severity,
            "title": a.title,
            "desc": a.description,
            "resolved": a.resolved,
            "time": _relative_time(a.created_at),
        }

    active = [to_dict(a) for a in all_alerts if not a.resolved]
    resolved = [to_dict(a) for a in all_alerts if a.resolved]
    return {"active": active, "resolved": resolved, "active_count": len(active)}


async def resolve_alert(db: AsyncSession, alert_id: str) -> Alert | None:
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if alert is None:
        return None
    alert.resolved = True
    alert.resolved_at = datetime.now(timezone.utc)
    await db.flush()
    return alert


async def clear_all_alerts(db: AsyncSession, device_id: str | None = None) -> int:
    settings = get_settings()
    target_device_id = device_id or settings.DEFAULT_DEVICE_ID

    # Count first
    count_result = await db.execute(
        select(func.count()).select_from(Alert).where(Alert.device_id == target_device_id)
    )
    count = count_result.scalar() or 0

    # Bulk delete in DB
    await db.execute(
        delete(Alert).where(Alert.device_id == target_device_id)
    )
    await db.commit()

    # Clear from Firebase Real-time
    try:
        from app.services.firebase_service import clear_device_alerts
        await clear_device_alerts(target_device_id)
    except Exception as e:
        print(f"[FIREBASE_ERROR] Failed to clear alerts: {e}", flush=True)

    return count
