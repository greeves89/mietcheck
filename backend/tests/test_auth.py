"""Tests for MietCheck authentication endpoints."""
import pytest
from httpx import AsyncClient
from sqlalchemy import select, update

from app.models.user import User


@pytest.mark.asyncio
async def test_register_first_user_is_admin(client: AsyncClient):
    """First user becomes admin."""
    res = await client.post("/api/auth/register", json={
        "email": "admin@test.de",
        "name": "Admin",
        "password": "securepassword123",
    })
    assert res.status_code == 201
    data = res.json()
    assert data["role"] == "admin"
    assert data["email"] == "admin@test.de"


@pytest.mark.asyncio
async def test_register_second_user_is_member(client: AsyncClient):
    """Second user gets member role."""
    await client.post("/api/auth/register", json={
        "email": "first@test.de",
        "name": "First",
        "password": "password123",
    })
    res = await client.post("/api/auth/register", json={
        "email": "second@test.de",
        "name": "Second",
        "password": "password123",
    })
    assert res.status_code == 201
    assert res.json()["role"] == "member"


@pytest.mark.asyncio
async def test_register_duplicate_email_fails(client: AsyncClient):
    """Registering the same email twice returns 400."""
    payload = {"email": "dup@test.de", "name": "Dup", "password": "password123"}
    await client.post("/api/auth/register", json=payload)
    res = await client.post("/api/auth/register", json=payload)
    assert res.status_code == 400
    assert "registriert" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_login_unverified_user_blocked(client: AsyncClient):
    """Unverified user cannot login."""
    await client.post("/api/auth/register", json={
        "email": "unverified@test.de",
        "name": "Unverified",
        "password": "password123",
    })
    res = await client.post("/api/auth/login", json={
        "email": "unverified@test.de",
        "password": "password123",
    })
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_login_verified_user_ok(client: AsyncClient, db_session):
    """Verified user can login successfully."""
    await client.post("/api/auth/register", json={
        "email": "verified@test.de",
        "name": "Verified",
        "password": "password123",
    })
    await db_session.execute(
        update(User).where(User.email == "verified@test.de").values(is_verified=True)
    )
    await db_session.commit()

    res = await client.post("/api/auth/login", json={
        "email": "verified@test.de",
        "password": "password123",
    })
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient, db_session):
    """Wrong password returns 401."""
    await client.post("/api/auth/register", json={
        "email": "user@test.de",
        "name": "User",
        "password": "correctpass",
    })
    res = await client.post("/api/auth/login", json={
        "email": "user@test.de",
        "password": "wrongpass",
    })
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_email(client: AsyncClient):
    """Unknown email returns 401."""
    res = await client.post("/api/auth/login", json={
        "email": "nobody@test.de",
        "password": "password123",
    })
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_logout(client: AsyncClient, db_session):
    """Logout returns 200."""
    await client.post("/api/auth/register", json={
        "email": "logout@test.de",
        "name": "Logout",
        "password": "password123",
    })
    await db_session.execute(
        update(User).where(User.email == "logout@test.de").values(is_verified=True)
    )
    await db_session.commit()
    await client.post("/api/auth/login", json={"email": "logout@test.de", "password": "password123"})

    res = await client.post("/api/auth/logout")
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_forgot_password_unknown_email_no_error(client: AsyncClient):
    """Forgot password with unknown email returns success (security by design)."""
    res = await client.post("/api/auth/forgot-password", json={"email": "ghost@test.de"})
    assert res.status_code == 200


@pytest.mark.asyncio
async def test_reset_password_invalid_token(client: AsyncClient):
    """Reset with invalid token returns 400."""
    res = await client.post("/api/auth/reset-password", json={
        "token": "badtoken",
        "new_password": "newpassword123",
    })
    assert res.status_code == 400


@pytest.mark.asyncio
async def test_reset_password_too_short(client: AsyncClient):
    """Password shorter than 8 chars returns 400."""
    res = await client.post("/api/auth/reset-password", json={
        "token": "anytoken",
        "new_password": "short",
    })
    assert res.status_code == 400
