from sqlalchemy import String, DateTime, Integer, Numeric, ForeignKey, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from datetime import datetime
from decimal import Decimal
from typing import Optional
from app.database import Base


class BillPosition(Base):
    __tablename__ = "bill_positions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    bill_id: Mapped[int] = mapped_column(Integer, ForeignKey("utility_bills.id", ondelete="CASCADE"), nullable=False)

    # Position details
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    # Amounts
    total_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    distribution_key: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    tenant_share_percent: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 2), nullable=True)
    tenant_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)

    # Validation
    is_allowed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    reference_value_low: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 4), nullable=True)
    reference_value_high: Mapped[Optional[Decimal]] = mapped_column(Numeric(8, 4), nullable=True)
    is_plausible: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    bill: Mapped["UtilityBill"] = relationship("UtilityBill", back_populates="positions")
