"""Shared test fixtures for MietCheck backend tests."""
import os
import tempfile

# Must be set before any app imports
_pdf_dir = tempfile.mkdtemp()
_uploads_dir = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["PDF_STORAGE_PATH"] = _pdf_dir
os.environ["ENVIRONMENT"] = "test"

# Patch os.makedirs to avoid PermissionError for /app/* at import time
_original_makedirs = os.makedirs

def _safe_makedirs(path, *args, **kwargs):
    if str(path).startswith("/app"):
        return  # Skip /app/* dirs in test environment
    return _original_makedirs(path, *args, **kwargs)

os.makedirs = _safe_makedirs

# Patch PostgreSQL-specific JSONB type to use JSON (SQLite-compatible)
import sqlalchemy.dialects.postgresql as _pg_dialect
from sqlalchemy import JSON as _JSON
_pg_dialect.JSONB = _JSON

# Patch create_async_engine in sqlalchemy BEFORE app.database is imported.
import sqlalchemy.ext.asyncio as _sqla_async
from sqlalchemy.ext.asyncio import create_async_engine as _original_cae
from sqlalchemy.pool import StaticPool as _StaticPool


def _sqlite_engine(url, **kwargs):
    """Always use in-memory SQLite regardless of configured URL."""
    kwargs.pop("pool_size", None)
    kwargs.pop("max_overflow", None)
    kwargs.pop("pool_pre_ping", None)
    return _original_cae(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=_StaticPool,
    )


_sqla_async.create_async_engine = _sqlite_engine

import pytest  # noqa: E402
import pytest_asyncio  # noqa: E402
from httpx import AsyncClient, ASGITransport  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker  # noqa: E402

import app.database as _db_module  # noqa: E402
from app.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402

# Restore originals after imports
_sqla_async.create_async_engine = _original_cae
os.makedirs = _original_makedirs

# Patch the hardcoded UPLOADS_DIR in bills module to use a temp dir
import app.api.bills as _bills_module  # noqa: E402
_bills_module.UPLOADS_DIR = _uploads_dir


@pytest_asyncio.fixture(scope="function")
async def db_engine():
    engine = _db_module.engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def db_session(db_engine):
    session_factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def client(db_session):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
