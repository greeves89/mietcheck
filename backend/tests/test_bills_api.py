"""Tests for the bills API endpoint (integration tests)."""
import pytest
from datetime import date
from httpx import AsyncClient
from sqlalchemy import update

from app.models.user import User


async def _make_verified_user(client: AsyncClient, db_session, email="tenant@test.de"):
    """Register, verify, and login a user."""
    await client.post("/api/auth/register", json={
        "email": email,
        "name": "Test Mieter",
        "password": "password123",
    })
    await db_session.execute(
        update(User).where(User.email == email).values(is_verified=True)
    )
    await db_session.commit()
    login_res = await client.post("/api/auth/login", json={
        "email": email,
        "password": "password123",
    })
    assert login_res.status_code == 200
    return login_res.json()


async def _create_contract(client: AsyncClient) -> int:
    """Create a rental contract and return its ID."""
    res = await client.post("/api/contracts", json={
        "landlord_name": "Max Vermieter",
        "property_address": "Teststraße 1, 10115 Berlin",
        "apartment_size_sqm": "60.00",
        "tenants_count": 1,
        "heating_type": "central",
    })
    assert res.status_code == 201
    return res.json()["id"]


def _bill_payload(contract_id: int, billing_year: int = 2023) -> dict:
    return {
        "contract_id": contract_id,
        "billing_year": billing_year,
        "billing_period_start": f"{billing_year}-01-01",
        "billing_period_end": f"{billing_year}-12-31",
        "received_date": f"{billing_year + 1}-03-15",
        "total_costs": "500.00",
        "total_advance_paid": "480.00",
        "result_amount": "20.00",
        "positions": [
            {
                "category": "heating",
                "name": "Heizkosten",
                "total_amount": "1000.00",
                "tenant_share_percent": "20.00",
                "tenant_amount": "200.00",
                "distribution_key": "sqm",
            },
            {
                "category": "water_sewage",
                "name": "Wasser/Abwasser",
                "total_amount": "1500.00",
                "tenant_share_percent": "20.00",
                "tenant_amount": "300.00",
                "distribution_key": "sqm",
            },
        ],
    }


@pytest.mark.asyncio
async def test_create_bill_runs_checks(client: AsyncClient, db_session):
    """Creating a bill automatically runs all checks and returns check_results."""
    await _make_verified_user(client, db_session)
    contract_id = await _create_contract(client)

    res = await client.post("/api/bills", json=_bill_payload(contract_id))
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "checked"
    assert data["check_score"] is not None
    assert len(data["check_results"]) > 0
    assert len(data["positions"]) == 2


@pytest.mark.asyncio
async def test_list_bills_empty(client: AsyncClient, db_session):
    """New user has no bills."""
    await _make_verified_user(client, db_session)
    res = await client.get("/api/bills")
    assert res.status_code == 200
    assert res.json() == []


@pytest.mark.asyncio
async def test_list_bills(client: AsyncClient, db_session):
    """Bills created by user are returned in list."""
    await _make_verified_user(client, db_session)
    contract_id = await _create_contract(client)

    await client.post("/api/bills", json=_bill_payload(contract_id, 2023))

    res = await client.get("/api/bills")
    assert res.status_code == 200
    assert len(res.json()) == 1


@pytest.mark.asyncio
async def test_get_bill(client: AsyncClient, db_session):
    """Getting a specific bill returns its data."""
    await _make_verified_user(client, db_session)
    contract_id = await _create_contract(client)
    create_res = await client.post("/api/bills", json=_bill_payload(contract_id))
    bill_id = create_res.json()["id"]

    res = await client.get(f"/api/bills/{bill_id}")
    assert res.status_code == 200
    assert res.json()["id"] == bill_id


@pytest.mark.asyncio
async def test_get_bill_not_found(client: AsyncClient, db_session):
    """Getting nonexistent bill returns 404."""
    await _make_verified_user(client, db_session)
    res = await client.get("/api/bills/99999")
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_delete_bill(client: AsyncClient, db_session):
    """Deleting a bill removes it."""
    await _make_verified_user(client, db_session)
    contract_id = await _create_contract(client)
    create_res = await client.post("/api/bills", json=_bill_payload(contract_id))
    bill_id = create_res.json()["id"]

    del_res = await client.delete(f"/api/bills/{bill_id}")
    assert del_res.status_code == 204

    get_res = await client.get(f"/api/bills/{bill_id}")
    assert get_res.status_code == 404


@pytest.mark.asyncio
async def test_free_tier_limit_one_bill_per_year(client: AsyncClient, db_session):
    """Free tier users can only create 1 bill per year."""
    # First register an admin user (first registration = admin, bypasses free-tier limit)
    await _make_verified_user(client, db_session, email="admin@test.de")
    # Register a regular member user (not admin, not premium → free tier applies)
    await _make_verified_user(client, db_session, email="tenant@test.de")
    contract_id = await _create_contract(client)

    # First bill → ok
    res1 = await client.post("/api/bills", json=_bill_payload(contract_id, 2023))
    assert res1.status_code == 201

    # Second bill same year → 402
    res2 = await client.post("/api/bills", json=_bill_payload(contract_id, 2023))
    assert res2.status_code == 402
    assert "premium" in res2.json()["detail"].lower()


@pytest.mark.asyncio
async def test_create_bill_wrong_contract_fails(client: AsyncClient, db_session):
    """Creating a bill with nonexistent contract returns 404."""
    await _make_verified_user(client, db_session)
    res = await client.post("/api/bills", json=_bill_payload(99999))
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_unauthenticated_bills_fails(client: AsyncClient):
    """Listing bills without auth returns 401."""
    res = await client.get("/api/bills")
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_check_score_perfect_for_clean_bill(client: AsyncClient, db_session):
    """A bill with correct calculations and on-time delivery scores 100."""
    await _make_verified_user(client, db_session)
    contract_id = await _create_contract(client)

    payload = _bill_payload(contract_id, 2022)
    # Use amounts within plausibility reference ranges (60 sqm contract):
    #   heating: 200€ = 1000×20% → 3.33 €/m²/year (ref: 5.50–14.00, below low is ok)
    #   water_sewage: 240€ = 1200×20% → 4.0 €/m²/year (ref: 2.00–4.50 ✓)
    # Fix position[1] to match math (total_amount 1500→1200, tenant_amount 300→240)
    payload["positions"][1]["total_amount"] = "1200.00"
    payload["positions"][1]["tenant_amount"] = "240.00"
    payload["total_costs"] = "440.00"
    payload["received_date"] = "2023-06-01"  # Well within 12-month deadline

    res = await client.post("/api/bills", json=payload)
    assert res.status_code == 201
    score = res.json()["check_score"]
    assert score == 100


@pytest.mark.asyncio
async def test_check_finds_math_error(client: AsyncClient, db_session):
    """Bill with wrong tenant_amount triggers a math error in check_results."""
    await _make_verified_user(client, db_session)
    contract_id = await _create_contract(client)

    payload = {
        "contract_id": contract_id,
        "billing_year": 2023,
        "billing_period_start": "2023-01-01",
        "billing_period_end": "2023-12-31",
        "received_date": "2024-03-01",
        "positions": [
            {
                "category": "heating",
                "name": "Heizkosten",
                "total_amount": "1000.00",
                "tenant_share_percent": "20.00",
                "tenant_amount": "350.00",  # Wrong! Should be 200
                "distribution_key": "sqm",
            },
            {
                "category": "water_sewage",
                "name": "Wasser",
                "total_amount": "500.00",
                "tenant_share_percent": "20.00",
                "tenant_amount": "100.00",
                "distribution_key": "sqm",
            },
        ],
    }
    res = await client.post("/api/bills", json=payload)
    assert res.status_code == 201
    check_results = res.json()["check_results"]
    math_errors = [r for r in check_results if r["check_type"] == "math" and r["severity"] == "error"]
    assert len(math_errors) >= 1
