from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:11221@localhost:5432/sunsense"

    # JWT
    SECRET_KEY: str = "6f4f4f1f9e4f7c4d2b6d8a3e9f1c7b4a5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # ESP32
    ESP32_API_KEY: str = "sunsense-esp32-dev-secret-2026"
    DEFAULT_DEVICE_ID: str = "device-001"

    # Firebase Realtime Database
    FIREBASE_PROJECT_ID: str = ""
    FIREBASE_WEB_API_KEY: str = ""
    FIREBASE_AUTH_DOMAIN: str = ""
    FIREBASE_DATABASE_URL: str = ""
    FIREBASE_STORAGE_BUCKET: str = ""
    FIREBASE_MESSAGING_SENDER_ID: str = ""
    FIREBASE_APP_ID: str = ""
    FIREBASE_SERVICE_ACCOUNT_PATH: str = ""

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def firebase_enabled(self) -> bool:
        return bool(self.FIREBASE_DATABASE_URL and self.FIREBASE_SERVICE_ACCOUNT_PATH)


@lru_cache()
def get_settings() -> Settings:
    return Settings()
