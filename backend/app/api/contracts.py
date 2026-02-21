from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.rental_contract import RentalContract
from app.schemas.rental_contract import RentalContractCreate, RentalContractRead, RentalContractUpdate
from app.core.auth import get_current_user

router = APIRouter(prefix="/contracts", tags=["contracts"])


@router.get("", response_model=List[RentalContractRead])
async def list_contracts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RentalContract)
        .where(RentalContract.user_id == current_user.id)
        .order_by(RentalContract.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=RentalContractRead, status_code=201)
async def create_contract(
    data: RentalContractCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    contract = RentalContract(user_id=current_user.id, **data.model_dump())
    db.add(contract)
    await db.flush()
    await db.refresh(contract)
    return contract


@router.get("/{contract_id}", response_model=RentalContractRead)
async def get_contract(
    contract_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RentalContract).where(
            RentalContract.id == contract_id,
            RentalContract.user_id == current_user.id,
        )
    )
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    return contract


@router.patch("/{contract_id}", response_model=RentalContractRead)
async def update_contract(
    contract_id: int,
    data: RentalContractUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RentalContract).where(
            RentalContract.id == contract_id,
            RentalContract.user_id == current_user.id,
        )
    )
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(contract, field, value)
    db.add(contract)
    await db.flush()
    await db.refresh(contract)
    return contract


@router.delete("/{contract_id}", status_code=204)
async def delete_contract(
    contract_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RentalContract).where(
            RentalContract.id == contract_id,
            RentalContract.user_id == current_user.id,
        )
    )
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    await db.delete(contract)
