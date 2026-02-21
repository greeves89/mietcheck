from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List
import os
from app.database import get_db
from app.models.user import User
from app.models.utility_bill import UtilityBill
from app.models.objection_letter import ObjectionLetter
from app.models.rental_contract import RentalContract
from app.schemas.utility_bill import ObjectionLetterCreate, ObjectionLetterRead
from app.core.auth import get_current_user, get_premium_user
from app.services.pdf_service import generate_objection_letter_pdf

router = APIRouter(prefix="/objections", tags=["objections"])


@router.post("/bills/{bill_id}/objection", response_model=ObjectionLetterRead, status_code=201)
async def create_objection_letter(
    bill_id: int,
    data: ObjectionLetterCreate,
    current_user: User = Depends(get_premium_user),
    db: AsyncSession = Depends(get_db),
):
    # Get bill
    result = await db.execute(
        select(UtilityBill)
        .where(UtilityBill.id == bill_id, UtilityBill.user_id == current_user.id)
        .options(selectinload(UtilityBill.contract))
    )
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")

    contract = bill.contract

    # Generate letter text
    tenant_address = "\n".join(filter(None, [
        current_user.address_street,
        f"{current_user.address_zip} {current_user.address_city}".strip() or None,
    ]))
    if not tenant_address:
        tenant_address = "Adresse nicht angegeben"

    letter_content = _generate_letter_text(
        tenant_name=current_user.name,
        tenant_address=tenant_address,
        landlord_name=contract.landlord_name,
        landlord_address=contract.landlord_address or "Adresse nicht angegeben",
        property_address=contract.property_address,
        billing_year=bill.billing_year,
        objection_reasons=data.objection_reasons,
    )

    # Generate PDF
    try:
        pdf_path = generate_objection_letter_pdf(
            tenant_name=current_user.name,
            tenant_address=tenant_address,
            landlord_name=contract.landlord_name,
            landlord_address=contract.landlord_address or "Adresse nicht angegeben",
            property_address=contract.property_address,
            billing_year=bill.billing_year,
            objection_reasons=data.objection_reasons,
        )
    except Exception:
        pdf_path = None

    letter = ObjectionLetter(
        bill_id=bill_id,
        content=letter_content,
        objection_reasons=data.objection_reasons,
        pdf_path=pdf_path,
    )
    db.add(letter)
    bill.status = "objection_sent"
    db.add(bill)
    await db.flush()
    await db.refresh(letter)
    return letter


@router.get("/bills/{bill_id}/objection", response_model=List[ObjectionLetterRead])
async def list_objection_letters(
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

    letters_result = await db.execute(
        select(ObjectionLetter).where(ObjectionLetter.bill_id == bill_id)
    )
    return letters_result.scalars().all()


@router.get("/download/{letter_id}")
async def download_objection_pdf(
    letter_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ObjectionLetter)
        .where(ObjectionLetter.id == letter_id)
        .options(selectinload(ObjectionLetter.bill))
    )
    letter = result.scalar_one_or_none()
    if not letter or letter.bill.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Letter not found")

    if not letter.pdf_path or not os.path.exists(letter.pdf_path):
        raise HTTPException(status_code=404, detail="PDF not found")

    return FileResponse(
        letter.pdf_path,
        media_type="application/pdf",
        filename=f"widerspruch_{letter.bill.billing_year}.pdf",
    )


def _generate_letter_text(
    tenant_name: str,
    tenant_address: str,
    landlord_name: str,
    landlord_address: str,
    property_address: str,
    billing_year: int,
    objection_reasons: List[str],
) -> str:
    from datetime import date
    today = date.today().strftime("%d.%m.%Y")
    reasons_text = "\n".join(f"{i+1}. {r}" for i, r in enumerate(objection_reasons))

    return f"""
{tenant_name}
{tenant_address}

{landlord_name}
{landlord_address}

{today}

Widerspruch gegen die Nebenkostenabrechnung {billing_year}
Betreff: Mietobjekt {property_address}

Sehr geehrte Damen und Herren,

hiermit lege ich fristgerecht Widerspruch gegen die Nebenkostenabrechnung für das Jahr {billing_year} ein.

Meine Widerspruchsgründe sind:

{reasons_text}

Ich bitte Sie, die Abrechnung zu korrigieren. Eine Nachzahlung werde ich erst nach Vorlage einer korrekten Abrechnung leisten.

Mit freundlichen Grüßen,

{tenant_name}
""".strip()
