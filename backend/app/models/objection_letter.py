from sqlalchemy import String, DateTime, Integer, ForeignKey, Text, Date
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from datetime import datetime, date
from typing import Optional, List
from app.database import Base


class ObjectionLetter(Base):
    __tablename__ = "objection_letters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    bill_id: Mapped[int] = mapped_column(Integer, ForeignKey("utility_bills.id", ondelete="CASCADE"), nullable=False)

    content: Mapped[str] = mapped_column(Text, nullable=False)
    objection_reasons: Mapped[Optional[List]] = mapped_column(JSONB, nullable=True)
    sent_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    sent_via: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    pdf_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    bill: Mapped["UtilityBill"] = relationship("UtilityBill", back_populates="objection_letters")
