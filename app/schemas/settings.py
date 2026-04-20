from pydantic import BaseModel


class PreferenceOut(BaseModel):
    email_notifications: bool
    realtime_alerts: bool
    weekly_summary: bool
    temp_unit: str
    energy_unit: str
    refresh_rate: int

    class Config:
        from_attributes = True


class PreferenceUpdate(BaseModel):
    email_notifications: bool | None = None
    realtime_alerts: bool | None = None
    weekly_summary: bool | None = None
    temp_unit: str | None = None
    energy_unit: str | None = None
    refresh_rate: int | None = None


class DeviceInfo(BaseModel):
    edge_device: str = "ESP-WROOM-32 (NodeMCU)"
    firmware: str = "v2.1.4-tflite"
    ml_model: str = "TFLite Fault Classifier v3"
    wifi_status: str = "Connected"
    uptime: str = ""


class SensorStatus(BaseModel):
    name: str
    status: str
    ok: bool


class SettingsResponse(BaseModel):
    preferences: PreferenceOut
    device: DeviceInfo
    sensors: list[SensorStatus]
