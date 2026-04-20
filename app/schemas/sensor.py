from datetime import datetime
from pydantic import BaseModel, Field


class SensorIngest(BaseModel):
    """Payload the ESP32 sends on each sampling cycle."""
    device_id: str = Field(default="device-001", min_length=1, max_length=100)
    voltage: float
    current: float
    power: float
    temperature: float
    ldr1: int
    ldr2: int
    condition: str = "Normal"
    confidence: float = 0.0
    recorded_at: datetime | None = None


class LiveSensorData(BaseModel):
    """Response shape for live telemetry consumed by the frontend."""
    device_id: str = "device-001"
    voltage: float
    current: float
    power: float
    temp: float
    ldr1: int
    ldr2: int
    avg_light: float = 0
    light_diff: float = 0
    condition: str
    confidence: float
    system_on: bool
    recorded_at: datetime | None = None


class DerivedFeatures(BaseModel):
    avg_light: float
    light_diff: float
    power_per_irradiance: float
    efficiency: float


class SensorHistoryPoint(BaseModel):
    time: str
    value: float


class SensorHistoryResponse(BaseModel):
    voltage: list[SensorHistoryPoint]
    current: list[SensorHistoryPoint]
    power: list[SensorHistoryPoint]
    temperature: list[SensorHistoryPoint]
    ldr1: list[SensorHistoryPoint]
    ldr2: list[SensorHistoryPoint]


class DevicePowerCommand(BaseModel):
    is_on: bool


class DeviceCommandResponse(BaseModel):
    device_id: str
    command_id: str
    is_on: bool
    source: str = "dashboard"
