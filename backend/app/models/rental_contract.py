from sqlalchemy import String, Boolean, DateTime, Integer, Numeric, Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from app.database import Base


class RentalContract(Base):
    __tablename__ = "rental_contracts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Landlord
    landlord_name: Mapped[str] = mapped_column(String(255), nullable=False)
    landlord_address: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Property
    property_address: Mapped[str] = mapped_column(String(500), nullable=False)
    apartment_size_sqm: Mapped[Decimal] = mapped_column(Numeric(8, 2), nullable=False)
    apartment_floor: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Financial
    monthly_advance_payment: Mapped[Optional[Decimal]] = mapped_column(Numeric(10, 2), nullable=True)

    # Apartment details
    tenants_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    heating_type: Mapped[str] = mapped_column(String(20), default="central", nullable=False)

    # Contract
    contract_start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="contracts")
    bills: Mapped[List["UtilityBill"]] = relationship("UtilityBill", back_populates="contract", cascade="all, delete-orphan")
