from pydantic import BaseModel, EmailStr
from datetime import datetime


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str
    status: str          # "active" | "inactive"  (derived from is_active)
    last_login: str      # human-readable string

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "user"


class UserUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    role: str | None = None
    is_active: bool | None = None


class UserListResponse(BaseModel):
    users: list[UserOut]
    total: int
    active: int
    admins: int
