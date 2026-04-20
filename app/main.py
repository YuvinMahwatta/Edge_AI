from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.config import get_settings
from app.database import AsyncSessionLocal, Base, engine
from app.models import Alert, SensorReading, SystemState, User, UserPreference  # noqa: F401
from app.models.user import RoleEnum
from app.routers import alerts, auth, dashboard, esp32, monitor, settings, users
from app.services.firebase_service import initialize_firebase
from app.utils.security import hash_password

settings_obj = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).limit(1))
        if result.scalar_one_or_none() is None:
            admin = User(
                name="Admin",
                email="admin@sunsense.ai",
                hashed_password=hash_password("admin123"),
                role=RoleEnum.admin,
            )
            db.add(admin)
            await db.flush()
            prefs = UserPreference(user_id=admin.id)

            state = SystemState(id=1, is_on=True)
            db.add(state)
            db.add(prefs)
            await db.commit()

    initialize_firebase()
    yield
    await engine.dispose()


app = FastAPI(
    title="SunSense AI - Solar Panel Monitoring API",
    version="1.1",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings_obj.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(monitor.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(esp32.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "service": "SunSense AI Backend",
        "firebase_enabled": settings_obj.firebase_enabled,
        "default_device_id": settings_obj.DEFAULT_DEVICE_ID,
    }
