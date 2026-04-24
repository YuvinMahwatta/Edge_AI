from pydantic import BaseModel


class ConditionSlice(BaseModel):
    name: str
    value: float
    color: str


class DailyPowerPoint(BaseModel):
    day: str
    power: float
    expected: float


class DashboardResponse(BaseModel):
    voltage: float
    current: float
    power: float
    temp: float
    ldr1: int
    ldr2: int
    condition: str
    confidence: float
    system_on: bool
    condition_distribution: list[ConditionSlice]
    daily_power: list[DailyPowerPoint]
