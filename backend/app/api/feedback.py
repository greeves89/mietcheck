from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.feedback import Feedback
from app.schemas.feedback import FeedbackCreate, FeedbackRead
from app.core.auth import get_current_user

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.get("", response_model=List[FeedbackRead])
async def list_my_feedback(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Feedback)
        .where(Feedback.user_id == current_user.id)
        .order_by(Feedback.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=FeedbackRead, status_code=201)
async def create_feedback(
    data: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    fb = Feedback(
        user_id=current_user.id,
        type=data.type,
        title=data.title,
        message=data.message,
    )
    db.add(fb)
    await db.flush()
    await db.refresh(fb)
    return fb


@router.get("/{feedback_id}", response_model=FeedbackRead)
async def get_feedback(
    feedback_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Feedback).where(
            Feedback.id == feedback_id,
            Feedback.user_id == current_user.id,
        )
    )
    fb = result.scalar_one_or_none()
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return fb
