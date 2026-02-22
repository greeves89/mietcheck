from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List
from datetime import date
import os
import uuid
import aiofiles
from app.database import get_db
from app.models.user import User
from app.models.utility_bill import UtilityBill
from app.models.bill_position import BillPosition
from app.models.check_result import CheckResult
from app.models.rental_contract import RentalContract
from app.schemas.utility_bill import (
    UtilityBillCreate, UtilityBillRead, UtilityBillUpdate, BillPositionCreate
)
from app.core.auth import get_current_user
from app.core.bill_checker import run_all_checks

UPLOADS_DIR = "/app/uploads"
ALLOWED_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

os.makedirs(UPLOADS_DIR, exist_ok=True)

router = APIRouter(prefix="/bills", tags=["bills"])

FREE_TIER_LIMIT = 1


async def _check_free_tier(user: User, db: AsyncSession, exclude_bill_id: int | None = None):
    """Free users limited to 1 bill check per year."""
    if user.is_premium or user.role == "admin":
        return
    current_year = date.today().year
    query = (
        select(func.count())
        .select_from(UtilityBill)
        .where(
            UtilityBill.user_id == user.id,
            UtilityBill.billing_year == current_year,
        )
    )
    if exclude_bill_id is not None:
        query = query.where(UtilityBill.id != exclude_bill_id)
    result = await db.execute(query)
    count = result.scalar()
    if count >= FREE_TIER_LIMIT:
        raise HTTPException(
            status_code=402,
            detail=f"Free tier allows {FREE_TIER_LIMIT} bill check per year. Upgrade to Premium for unlimited checks.",
        )


@router.get("", response_model=List[UtilityBillRead])
async def list_bills(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UtilityBill)
        .where(UtilityBill.user_id == current_user.id)
        .options(
            selectinload(UtilityBill.positions),
            selectinload(UtilityBill.check_results),
        )
        .order_by(UtilityBill.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=UtilityBillRead, status_code=201)
async def create_bill(
    data: UtilityBillCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _check_free_tier(current_user, db)

    # Verify contract belongs to user
    contract_result = await db.execute(
        select(RentalContract).where(
            RentalContract.id == data.contract_id,
            RentalContract.user_id == current_user.id,
        )
    )
    contract = contract_result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    bill = UtilityBill(
        user_id=current_user.id,
        contract_id=data.contract_id,
        billing_year=data.billing_year,
        billing_period_start=data.billing_period_start,
        billing_period_end=data.billing_period_end,
        received_date=data.received_date,
        total_costs=data.total_costs,
        total_advance_paid=data.total_advance_paid,
        result_amount=data.result_amount,
        notes=data.notes,
        status="pending",
    )
    db.add(bill)
    await db.flush()

    # Add positions
    positions = []
    for pos_data in data.positions:
        pos = BillPosition(bill_id=bill.id, **pos_data.model_dump())
        db.add(pos)
        positions.append(pos)

    await db.flush()

    # Run checks
    check_items, score = run_all_checks(bill, positions, contract)
    for check_type, severity, title, description, recommendation in check_items:
        result_obj = CheckResult(
            bill_id=bill.id,
            check_type=check_type,
            severity=severity,
            title=title,
            description=description,
            recommendation=recommendation,
        )
        db.add(result_obj)

    bill.check_score = score
    bill.status = "checked"
    db.add(bill)

    await db.flush()
    await db.refresh(bill)

    # Reload with relationships
    final_result = await db.execute(
        select(UtilityBill)
        .where(UtilityBill.id == bill.id)
        .options(
            selectinload(UtilityBill.positions),
            selectinload(UtilityBill.check_results),
        )
    )
    return final_result.scalar_one()


@router.get("/{bill_id}", response_model=UtilityBillRead)
async def get_bill(
    bill_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UtilityBill)
        .where(UtilityBill.id == bill_id, UtilityBill.user_id == current_user.id)
        .options(
            selectinload(UtilityBill.positions),
            selectinload(UtilityBill.check_results),
        )
    )
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    return bill


@router.patch("/{bill_id}", response_model=UtilityBillRead)
async def update_bill(
    bill_id: int,
    data: UtilityBillUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UtilityBill).where(
            UtilityBill.id == bill_id,
            UtilityBill.user_id == current_user.id,
        )
    )
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(bill, field, value)
    db.add(bill)
    await db.flush()

    final_result = await db.execute(
        select(UtilityBill)
        .where(UtilityBill.id == bill_id)
        .options(
            selectinload(UtilityBill.positions),
            selectinload(UtilityBill.check_results),
        )
    )
    return final_result.scalar_one()


@router.delete("/{bill_id}", status_code=204)
async def delete_bill(
    bill_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UtilityBill).where(
            UtilityBill.id == bill_id,
            UtilityBill.user_id == current_user.id,
        )
    )
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    await db.delete(bill)


@router.post("/{bill_id}/recheck", response_model=UtilityBillRead)
async def recheck_bill(
    bill_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Re-run all checks on an existing bill. Free tier: only allowed once per year."""
    await _check_free_tier(current_user, db, exclude_bill_id=bill_id)

    result = await db.execute(
        select(UtilityBill)
        .where(UtilityBill.id == bill_id, UtilityBill.user_id == current_user.id)
        .options(
            selectinload(UtilityBill.positions),
            selectinload(UtilityBill.check_results),
        )
    )
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    contract_result = await db.execute(
        select(RentalContract).where(RentalContract.id == bill.contract_id)
    )
    contract = contract_result.scalar_one_or_none()

    # Delete old check results
    for cr in bill.check_results:
        await db.delete(cr)
    await db.flush()

    # Re-run
    check_items, score = run_all_checks(bill, bill.positions, contract)
    for check_type, severity, title, description, recommendation in check_items:
        cr = CheckResult(
            bill_id=bill.id,
            check_type=check_type,
            severity=severity,
            title=title,
            description=description,
            recommendation=recommendation,
        )
        db.add(cr)

    bill.check_score = score
    bill.status = "checked"
    db.add(bill)
    await db.flush()

    final_result = await db.execute(
        select(UtilityBill)
        .where(UtilityBill.id == bill_id)
        .options(
            selectinload(UtilityBill.positions),
            selectinload(UtilityBill.check_results),
        )
    )
    return final_result.scalar_one()


@router.post("/{bill_id}/upload", response_model=UtilityBillRead)
async def upload_document(
    bill_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a PDF or image of the utility bill document."""
    result = await db.execute(
        select(UtilityBill).where(
            UtilityBill.id == bill_id,
            UtilityBill.user_id == current_user.id,
        )
    )
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Ungültiger Dateityp. Erlaubt: PDF, JPEG, PNG, WebP",
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Datei zu groß. Maximal 10 MB erlaubt.")

    # Delete old file if exists
    if bill.document_path and os.path.exists(bill.document_path):
        os.remove(bill.document_path)

    # Save new file
    ext = os.path.splitext(file.filename or "")[1] or ".pdf"
    filename = f"bill_{bill_id}_{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOADS_DIR, filename)

    async with aiofiles.open(filepath, "wb") as f:
        await f.write(contents)

    bill.document_path = filepath
    db.add(bill)
    await db.flush()

    upload_result = await db.execute(
        select(UtilityBill)
        .where(UtilityBill.id == bill_id)
        .options(
            selectinload(UtilityBill.positions),
            selectinload(UtilityBill.check_results),
        )
    )
    return upload_result.scalar_one()


@router.delete("/{bill_id}/upload", status_code=204)
async def delete_document(
    bill_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove the uploaded document from a bill."""
    result = await db.execute(
        select(UtilityBill).where(
            UtilityBill.id == bill_id,
            UtilityBill.user_id == current_user.id,
        )
    )
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    if bill.document_path and os.path.exists(bill.document_path):
        os.remove(bill.document_path)
    bill.document_path = None
    db.add(bill)


@router.get("/{bill_id}/document")
async def download_document(
    bill_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Download the uploaded bill document."""
    result = await db.execute(
        select(UtilityBill).where(
            UtilityBill.id == bill_id,
            UtilityBill.user_id == current_user.id,
        )
    )
    bill = result.scalar_one_or_none()
    if not bill or not bill.document_path:
        raise HTTPException(status_code=404, detail="Kein Dokument vorhanden")
    if not os.path.exists(bill.document_path):
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden")

    return FileResponse(
        bill.document_path,
        filename=os.path.basename(bill.document_path),
    )
