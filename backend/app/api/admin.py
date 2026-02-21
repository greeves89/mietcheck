from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import date
from app.database import get_db
from app.models.user import User
from app.models.utility_bill import UtilityBill
from app.models.feedback import Feedback
from app.models.check_result import CheckResult
from app.models.objection_letter import ObjectionLetter
from app.schemas.user import UserRead, UserAdminUpdate
from app.schemas.feedback import FeedbackRead, FeedbackAdminUpdate, FeedbackReadWithUser
from app.core.auth import get_admin_user
from app.services.email_service import send_feedback_response_email

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats")
async def get_stats(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    total_users = (await db.execute(select(func.count()).select_from(User))).scalar()
    premium_users = (await db.execute(
        select(func.count()).select_from(User).where(User.subscription_tier == "premium")
    )).scalar()
    total_bills = (await db.execute(select(func.count()).select_from(UtilityBill))).scalar()
    total_objections = (await db.execute(select(func.count()).select_from(ObjectionLetter))).scalar()
    total_feedback = (await db.execute(select(func.count()).select_from(Feedback))).scalar()
    pending_feedback = (await db.execute(
        select(func.count()).select_from(Feedback).where(Feedback.status == "pending")
    )).scalar()
    total_errors = (await db.execute(
        select(func.count()).select_from(CheckResult).where(CheckResult.severity == "error")
    )).scalar()

    return {
        "total_users": total_users,
        "premium_users": premium_users,
        "total_bills": total_bills,
        "total_objections": total_objections,
        "total_feedback": total_feedback,
        "pending_feedback": pending_feedback,
        "total_errors": total_errors,
    }


@router.get("/users", response_model=List[UserRead])
async def list_users(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 50,
):
    result = await db.execute(
        select(User).order_by(User.created_at.desc()).offset(skip).limit(limit)
    )
    return result.scalars().all()


@router.get("/users/{user_id}", response_model=UserRead)
async def get_user(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.patch("/users/{user_id}", response_model=UserRead)
async def update_user(
    user_id: int,
    data: UserAdminUpdate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


@router.get("/feedback", response_model=List[FeedbackReadWithUser])
async def list_all_feedback(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
    status: Optional[str] = None,
):
    query = select(Feedback).options(selectinload(Feedback.user)).order_by(Feedback.created_at.desc())
    if status:
        query = query.where(Feedback.status == status)
    result = await db.execute(query)
    items = result.scalars().all()
    out = []
    for fb in items:
        d = FeedbackReadWithUser.model_validate(fb)
        d.user_email = fb.user.email if fb.user else None
        d.user_name = fb.user.name if fb.user else None
        out.append(d)
    return out


@router.patch("/feedback/{feedback_id}", response_model=FeedbackRead)
async def update_feedback(
    feedback_id: int,
    data: FeedbackAdminUpdate,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Feedback).where(Feedback.id == feedback_id).options(selectinload(Feedback.user))
    )
    fb = result.scalar_one_or_none()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback not found")

    old_status = fb.status
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(fb, field, value)
    db.add(fb)
    await db.flush()
    await db.refresh(fb)

    # Send email notification if admin responded
    if data.admin_response and fb.user and old_status != fb.status:
        import asyncio
        asyncio.create_task(
            send_feedback_response_email(
                fb.user.email,
                fb.user.name,
                fb.title,
                data.admin_response,
            )
        )

    return fb


@router.post("/smtp/test")
async def test_smtp(
    to_email: str,
    admin: User = Depends(get_admin_user),
):
    from app.services.email_service import send_email
    success = await send_email(
        to_email,
        "MietCheck SMTP Test",
        "<h1>SMTP Test erfolgreich!</h1><p>Diese E-Mail bestätigt, dass die SMTP-Konfiguration korrekt ist.</p>",
    )
    return {"success": success}
