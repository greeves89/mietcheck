from sqlalchemy import String, Boolean, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from datetime import datetime
from typing import Optional, List
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="member", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Address
    address_street: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    address_zip: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    address_city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Subscription
    subscription_tier: Mapped[str] = mapped_column(String(20), default="free", nullable=False)
    subscription_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    contracts: Mapped[List["RentalContract"]] = relationship("RentalContract", back_populates="user", cascade="all, delete-orphan")
    bills: Mapped[List["UtilityBill"]] = relationship("UtilityBill", back_populates="user", cascade="all, delete-orphan")
    feedback_items: Mapped[List["Feedback"]] = relationship("Feedback", back_populates="user", cascade="all, delete-orphan")

    @property
    def is_premium(self) -> bool:
        if self.subscription_tier == "premium":
            if self.subscription_expires_at is None:
                return True
            from datetime import timezone
            return self.subscription_expires_at > datetime.now(timezone.utc)
        return False

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"
