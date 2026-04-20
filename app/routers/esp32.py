from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.sensor import SensorIngest
from app.services.alert_service import create_alert_from_condition
from app.services.firebase_service import append_telemetry, publish_alert, set_live_reading, update_device_state
from app.services.ml_service import classify_condition
from app.services.sensor_service import get_system_on, store_reading
from app.utils.deps import verify_esp32_key

router = APIRouter(prefix="/esp32", tags=["ESP32 Device"])


@router.post("/ingest")
async def ingest_reading(
    body: SensorIngest,
    _key: str = Depends(verify_esp32_key),
    db: AsyncSession = Depends(get_db),
):
    data = body.model_dump()

    if body.condition == "Normal" and body.confidence == 0:
        condition, confidence = classify_condition(
            body.voltage,
            body.current,
            body.power,
            body.temperature,
            body.ldr1,
            body.ldr2,
        )
        data["condition"] = condition
        data["confidence"] = confidence

    reading = await store_reading(db, data)
    system_on = await get_system_on(db)

    live_payload = {
        "device_id": reading.device_id,
        "voltage": reading.voltage,
        "current": reading.current,
        "power": reading.power,
        "temp": reading.temperature,
        "temperature": reading.temperature,
        "ldr1": reading.ldr1,
        "ldr2": reading.ldr2,
        "avg_light": reading.avg_light,
        "light_diff": reading.light_diff,
        "condition": data["condition"],
        "confidence": data["confidence"],
        "system_on": system_on,
        "recorded_at": reading.recorded_at.isoformat(),
    }
    telemetry_payload = {
        **live_payload,
        "reading_id": reading.id,
    }

    firebase_synced = False
    try:
        live_ok, telemetry_ok, state_ok = await set_live_reading(reading.device_id, live_payload), await append_telemetry(reading.device_id, reading.id, telemetry_payload), await update_device_state(
            reading.device_id,
            {
                "last_seen": reading.recorded_at.isoformat(),
                "reported_on": system_on,
                "last_condition": data["condition"],
            },
        )
        firebase_synced = all([live_ok, telemetry_ok, state_ok])
    except Exception:
        firebase_synced = False

    alert = None
    if data["condition"] != "Normal":
        alert = await create_alert_from_condition(db, data["condition"], data["confidence"], device_id=reading.device_id)
        if alert is not None:
            try:
                await publish_alert(alert)
            except Exception:
                pass

    return {
        "status": "ok",
        "reading_id": reading.id,
        "device_id": reading.device_id,
        "condition": data["condition"],
        "confidence": data["confidence"],
        "firebase_synced": firebase_synced,
        "alert_id": alert.id if alert else None,
    }
