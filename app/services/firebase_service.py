import asyncio
import logging
from datetime import datetime
from typing import Any

import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials, db as firebase_db

from app.config import get_settings
from app.models.alert import Alert
from app.models.user import User

logger = logging.getLogger(__name__)


class FirebaseUnavailableError(RuntimeError):
    pass


def _normalize_datetime(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.isoformat()


def initialize_firebase() -> bool:
    settings = get_settings()
    if not settings.firebase_enabled:
        return False

    if firebase_admin._apps:
        return True

    try:
        cred = credentials.Certificate(settings.FIREBASE_SERVICE_ACCOUNT_PATH)
        firebase_admin.initialize_app(
            cred,
            {
                "databaseURL": settings.FIREBASE_DATABASE_URL,
            },
        )
        logger.info("Firebase Admin SDK initialized")
        return True
    except FileNotFoundError:
        logger.warning("Firebase service account file not found: %s", settings.FIREBASE_SERVICE_ACCOUNT_PATH)
        return False
    except Exception as exc:  # pragma: no cover - defensive log path
        logger.exception("Failed to initialize Firebase: %s", exc)
        return False


def require_firebase() -> None:
    if not initialize_firebase():
        raise FirebaseUnavailableError(
            "Firebase is not configured. Set FIREBASE_DATABASE_URL and FIREBASE_SERVICE_ACCOUNT_PATH."
        )


def _set(path: str, payload: dict[str, Any]) -> None:
    firebase_db.reference(path).set(payload)


def _update(path: str, payload: dict[str, Any]) -> None:
    firebase_db.reference(path).update(payload)


async def set_live_reading(device_id: str, payload: dict[str, Any]) -> bool:
    if not initialize_firebase():
        return False
    await asyncio.to_thread(_set, f"devices/{device_id}/live", payload)
    return True


async def append_telemetry(device_id: str, reading_id: str, payload: dict[str, Any]) -> bool:
    if not initialize_firebase():
        return False
    await asyncio.to_thread(_set, f"devices/{device_id}/telemetry/{reading_id}", payload)
    return True


async def publish_command(device_id: str, payload: dict[str, Any]) -> bool:
    if not initialize_firebase():
        return False
    await asyncio.to_thread(_set, f"devices/{device_id}/commands/latest", payload)
    return True


async def update_device_state(device_id: str, payload: dict[str, Any]) -> bool:
    if not initialize_firebase():
        return False
    await asyncio.to_thread(_update, f"devices/{device_id}/state", payload)
    return True


async def update_live_fields(device_id: str, payload: dict[str, Any]) -> bool:
    if not initialize_firebase():
        return False
    await asyncio.to_thread(_update, f"devices/{device_id}/live", payload)
    return True


def alert_to_firebase_payload(alert: Alert) -> dict[str, Any]:
    return {
        "id": alert.id,
        "device_id": alert.device_id,
        "type": alert.type,
        "severity": alert.severity,
        "title": alert.title,
        "description": alert.description,
        "resolved": alert.resolved,
        "resolved_at": _normalize_datetime(alert.resolved_at),
        "created_at": _normalize_datetime(alert.created_at),
    }


async def publish_alert(alert: Alert) -> bool:
    if not initialize_firebase():
        return False
    await asyncio.to_thread(
        _set,
        f"devices/{alert.device_id}/alerts/{alert.id}",
        alert_to_firebase_payload(alert),
    )
    return True


def _remove(path: str) -> None:
    firebase_db.reference(path).delete()


async def clear_device_alerts(device_id: str) -> bool:
    if not initialize_firebase():
        return False
    await asyncio.to_thread(_remove, f"devices/{device_id}/alerts")
    return True


async def create_custom_token_for_user(user: User) -> tuple[str, str]:
    require_firebase()

    firebase_uid = user.id
    claims = {
        "role": user.role.value,
        "name": user.name,
        "email": user.email,
    }
    token = await asyncio.to_thread(firebase_auth.create_custom_token, firebase_uid, claims)
    return token.decode("utf-8"), firebase_uid
