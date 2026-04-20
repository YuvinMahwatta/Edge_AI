from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.utils.deps import require_admin
from app.models.user import User, RoleEnum
from app.schemas.user import UserOut, UserCreate, UserUpdate, UserListResponse
from app.services.auth_service import create_user

router = APIRouter(prefix="/users", tags=["Users"])


def _relative_login(dt: datetime | None) -> str:
    if dt is None:
        return "Never"
    now = datetime.now(timezone.utc)
    diff = now - (dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt)
    hours = int(diff.total_seconds() // 3600)
    if hours < 1:
        return "Just now"
    if hours < 24:
        return f"{hours} hour{'s' if hours != 1 else ''} ago"
    days = hours // 24
    if days < 7:
        return f"{days} day{'s' if days != 1 else ''} ago"
    return dt.strftime("%b %d, %Y")


def _user_out(u: User) -> UserOut:
    return UserOut(
        id=u.id,
        name=u.name,
        email=u.email,
        role=u.role.value,
        status="active" if u.is_active else "inactive",
        last_login=_relative_login(u.last_login),
    )


@router.get("", response_model=UserListResponse)
async def list_users(
    search: str = "",
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(User).order_by(User.created_at.desc())
    if search:
        query = query.where(User.name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%"))

    result = await db.execute(query)
    users = list(result.scalars().all())

    return UserListResponse(
        users=[_user_out(u) for u in users],
        total=len(users),
        active=sum(1 for u in users if u.is_active),
        admins=sum(1 for u in users if u.role == RoleEnum.admin),
    )


@router.post("", response_model=UserOut, status_code=201)
async def add_user(
    body: UserCreate,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        user = await create_user(db, body.name, body.email, body.password, body.role)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return _user_out(user)


@router.patch("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: str,
    body: UserUpdate,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = body.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key == "role":
            setattr(user, key, RoleEnum(value))
        else:
            setattr(user, key, value)

    await db.flush()
    return _user_out(user)


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(user)
    await db.flush()
    return {"deleted": True}
