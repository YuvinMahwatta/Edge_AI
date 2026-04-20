from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.system_state import UserPreference
from app.models.user import RoleEnum, User
from app.utils.security import create_access_token, hash_password, verify_password


async def create_user(
    db: AsyncSession, name: str, email: str, password: str, role: str = "user"
) -> User:
    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none():
        raise ValueError("Email already registered")

    user = User(
        name=name,
        email=email,
        hashed_password=hash_password(password),
        role=RoleEnum(role),
    )
    db.add(user)
    await db.flush()

    prefs = UserPreference(user_id=user.id)
    db.add(prefs)
    await db.flush()

    return user


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(password, user.hashed_password):
        return None
    if not user.is_active:
        return None

    user.last_login = datetime.now(timezone.utc)
    await db.flush()
    return user


def generate_token(user: User) -> dict:
    token = create_access_token({"sub": user.id, "role": user.role.value})
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role.value,
        "name": user.name,
    }
