from pydantic import BaseModel


class AlertOut(BaseModel):
    id: str
    device_id: str
    type: str
    severity: str
    title: str
    desc: str
    resolved: bool
    time: str

    class Config:
        from_attributes = True


class AlertListResponse(BaseModel):
    active: list[AlertOut]
    resolved: list[AlertOut]
    active_count: int
