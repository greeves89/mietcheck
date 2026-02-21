"""GDPR/DSGVO compliance endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.user import User
from app.models.rental_contract import RentalContract
from app.models.utility_bill import UtilityBill
from app.models.feedback import Feedback
from app.core.auth import get_current_user

router = APIRouter(prefix="/gdpr", tags=["gdpr"])


@router.get("/export")
async def export_my_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export all personal data in JSON format (DSGVO Art. 20)."""
    # Contracts
    contracts_result = await db.execute(
        select(RentalContract).where(RentalContract.user_id == current_user.id)
    )
    contracts = contracts_result.scalars().all()

    # Bills
    bills_result = await db.execute(
        select(UtilityBill)
        .where(UtilityBill.user_id == current_user.id)
        .options(selectinload(UtilityBill.positions), selectinload(UtilityBill.check_results))
    )
    bills = bills_result.scalars().all()

    # Feedback
    feedback_result = await db.execute(
        select(Feedback).where(Feedback.user_id == current_user.id)
    )
    feedbacks = feedback_result.scalars().all()

    def to_dict(obj):
        return {c.name: str(getattr(obj, c.name)) for c in obj.__table__.columns}

    export_data = {
        "exported_at": __import__("datetime").datetime.utcnow().isoformat(),
        "user": to_dict(current_user),
        "contracts": [to_dict(c) for c in contracts],
        "bills": [
            {
                **to_dict(b),
                "positions": [to_dict(p) for p in b.positions],
                "check_results": [to_dict(cr) for cr in b.check_results],
            }
            for b in bills
        ],
        "feedback": [to_dict(f) for f in feedbacks],
    }

    # Remove sensitive fields
    export_data["user"].pop("password_hash", None)

    return JSONResponse(content=export_data, headers={
        "Content-Disposition": "attachment; filename=mietcheck-export.json"
    })


@router.delete("/delete-account", status_code=204)
async def delete_my_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Permanently delete all user data (DSGVO Art. 17)."""
    await db.delete(current_user)
    # Cascade deletes will handle related data
