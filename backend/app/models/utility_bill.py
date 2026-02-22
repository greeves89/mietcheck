from sqlalchemy import String, DateTime, Integer, Numeric, Date, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from app.database import Base


class UtilityBill(Base):
    __tablename__ = "utility_bills"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    contract_id: Mapped[int] = mapped_column(Integer, ForeignKey("rental_contracts.id", ondelete="CASCADE"), nullable=False)

    # Billing period
    billing_year: Mapped[int] = mapped_column(Integer, nullable=False)
    billing_period_start: Mapped[date] = mapped_column(Date, nullable=False)
    billing_period_end: Mapped[date] = mapped_column(Date, nullable=False)
    received_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Financials
    total_costs: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    total_advance_paid: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)
    result_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)

    # Status
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    check_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Uploaded document
    document_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="bills")
    contract: Mapped["RentalContract"] = relationship("RentalContract", back_populates="bills")
    positions: Mapped[List["BillPosition"]] = relationship("BillPosition", back_populates="bill", cascade="all, delete-orphan")
    check_results: Mapped[List["CheckResult"]] = relationship("CheckResult", back_populates="bill", cascade="all, delete-orphan")
    objection_letters: Mapped[List["ObjectionLetter"]] = relationship("ObjectionLetter", back_populates="bill", cascade="all, delete-orphan")
