from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import date
import os
import uuid
import base64
import json
import aiofiles
import httpx
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
from app.config import settings

UPLOADS_DIR = "/app/uploads"
ALLOWED_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

os.makedirs(UPLOADS_DIR, exist_ok=True)

router = APIRouter(prefix="/bills", tags=["bills"])

FREE_TIER_LIMIT = 1


async def _check_free_tier(user: User, db: AsyncSession, billing_year: int, exclude_bill_id: int | None = None):
    """Free users limited to 1 bill check per billing year."""
    if user.is_premium or user.role == "admin":
        return
    query = (
        select(func.count())
        .select_from(UtilityBill)
        .where(
            UtilityBill.user_id == user.id,
            UtilityBill.billing_year == billing_year,
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
    await _check_free_tier(current_user, db, billing_year=data.billing_year)

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

    await _check_free_tier(current_user, db, billing_year=bill.billing_year, exclude_bill_id=bill_id)

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


@router.post("/ocr-extract")
async def ocr_extract_bill(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a photo or scan of a utility bill (Nebenkostenabrechnung) and extract
    structured data using AI vision. Returns pre-filled form data.
    """
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Ungültiger Dateityp. Erlaubt: PDF, JPEG, PNG, WebP",
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Datei zu groß. Maximal 10 MB erlaubt.")

    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="OCR-Service nicht konfiguriert. Bitte ANTHROPIC_API_KEY setzen.",
        )

    # Determine media type for vision API
    media_type = file.content_type
    # For PDF, use document type; for images, use image type
    if media_type == "application/pdf":
        source_type = "document"
        encoded = base64.standard_b64encode(contents).decode("utf-8")
    else:
        source_type = "image"
        encoded = base64.standard_b64encode(contents).decode("utf-8")

    prompt = """Du analysierst eine deutsche Nebenkostenabrechnung (Betriebskostenabrechnung).
Extrahiere alle sichtbaren Daten und gib sie als JSON zurück.

Antworte NUR mit validem JSON in diesem Format (keine anderen Texte):
{
  "billing_year": <Jahr als Zahl oder null>,
  "billing_period_start": "<YYYY-MM-DD oder null>",
  "billing_period_end": "<YYYY-MM-DD oder null>",
  "received_date": "<YYYY-MM-DD oder null>",
  "total_costs": <Gesamtkosten als Zahl oder null>,
  "total_advance_paid": <Geleistete Vorauszahlungen als Zahl oder null>,
  "result_amount": <Nachzahlung (positiv) oder Guthaben (negativ) als Zahl oder null>,
  "positions": [
    {
      "category": "<eine von: heating, hot_water, water_sewage, garbage, building_insurance, liability_insurance, elevator, garden, cleaning, caretaker, cable_tv, building_lighting, other>",
      "name": "<Bezeichnung wie auf Abrechnung>",
      "total_amount": <Betrag als Zahl>,
      "tenant_amount": <Mieteranteil als Zahl oder null>
    }
  ]
}

Kategorien-Zuordnung:
- heating: Heizkosten, Wärme, Fernwärme, Heizöl, Gas (Heizung)
- hot_water: Warmwasser, Warmwasserversorgung
- water_sewage: Kaltwasser, Wasser, Abwasser, Kanalgebühren, Entwässerung
- garbage: Müll, Abfall, Müllentsorgung, Entsorgung
- building_insurance: Gebäudeversicherung, Feuerversicherung, Wohngebäudeversicherung
- liability_insurance: Haftpflichtversicherung
- elevator: Aufzug, Fahrstuhl, Lift
- garden: Gartenpflege, Grünflächenpflege, Gartenbau
- cleaning: Hausreinigung, Treppenreinigung, Gemeinschaftsreinigung
- caretaker: Hausmeister, Hauswart, Hausbetreuung
- cable_tv: Kabelfernsehen, Antenne, Gemeinschaftsantenne, Breitband
- building_lighting: Hausbeleuchtung, Flurbeleuchtung, Außenbeleuchtung
- other: Alles andere (Grundsteuer, Sonstiges, etc.)

Extrahiere alle Positionen die du erkennst. Falls du einen Wert nicht sicher erkennst, setze null."""

    try:
        if source_type == "document":
            # PDF: use document source type
            message_content = [
                {
                    "type": "document",
                    "source": {
                        "type": "base64",
                        "media_type": "application/pdf",
                        "data": encoded,
                    },
                },
                {"type": "text", "text": prompt},
            ]
        else:
            # Image: use image source type
            message_content = [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": encoded,
                    },
                },
                {"type": "text", "text": prompt},
            ]

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": settings.ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                    "anthropic-beta": "pdfs-2024-09-25",
                },
                json={
                    "model": "claude-haiku-4-5-20251001",
                    "max_tokens": 2048,
                    "messages": [{"role": "user", "content": message_content}],
                },
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"OCR-Service Fehler: {response.status_code}",
            )

        result = response.json()
        text = result["content"][0]["text"].strip()

        # Strip markdown code block if present
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])

        extracted = json.loads(text)
        return extracted

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=422,
            detail="OCR konnte die Abrechnung nicht lesen. Bitte laden Sie ein klareres Bild hoch.",
        )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="OCR-Anfrage hat zu lange gedauert. Bitte erneut versuchen.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR-Fehler: {str(e)}")


@router.get("/{bill_id}/report")
async def download_check_report(
    bill_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate and download a PDF check report for a bill."""
    from app.services.pdf_service import generate_check_report_pdf
    from app.models.rental_contract import RentalContract

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
    property_address = contract.property_address if contract else "Unbekannt"

    try:
        pdf_path = generate_check_report_pdf(
            tenant_name=current_user.name,
            property_address=property_address,
            billing_year=bill.billing_year,
            billing_period_start=str(bill.billing_period_start),
            billing_period_end=str(bill.billing_period_end),
            check_score=bill.check_score,
            check_results=bill.check_results,
            positions=bill.positions,
            total_costs=str(bill.total_costs) if bill.total_costs else None,
            result_amount=str(bill.result_amount) if bill.result_amount else None,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF-Generierung fehlgeschlagen: {e}")

    return FileResponse(
        pdf_path,
        filename=f"pruefbericht_{bill.billing_year}.pdf",
        media_type="application/pdf",
    )
