from datetime import datetime, timezone
from sqlalchemy import select
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
    if condition == "Normal":
        return None

    mapping = {
        "Low Light": (
            "info",
            "low",
            "Low Light Condition",
            "Light intensity below threshold. Reduced output is expected during cloudy periods.",
        ),
        "Shadowing": (
            "danger",
            "high",
            "Partial Shadowing Detected",
            "Significant light difference detected between LDR zones. Check for debris or new obstacles.",
        ),
        "Dust Accumulation": (
            "warning",
            "medium",
            "Dust Accumulation Detected",
            "Efficiency has dropped. Cleaning recommended to restore optimal output.",
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
        return None

    alert_type, severity, title, desc = info
    return await create_alert(
        db,
        title,
        f"{desc} (Confidence: {confidence:.1f}%)",
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
