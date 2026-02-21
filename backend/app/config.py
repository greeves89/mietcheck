from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://mietcheck:changeme@postgres:5432/mietcheck"

    # Security
    SECRET_KEY: str = "super-secret-change-in-production-please"
    REFRESH_SECRET_KEY: str = "refresh-secret-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # SMTP
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@mietcheck.de"
    SMTP_TLS: bool = True

    # App
    FRONTEND_URL: str = "http://localhost"
    ENVIRONMENT: str = "production"

    # PDF storage
    PDF_STORAGE_PATH: str = "/app/pdfs"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
