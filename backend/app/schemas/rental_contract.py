from pydantic import BaseModel
from datetime import datetime, date
from decimal import Decimal
from typing import Optional


class RentalContractCreate(BaseModel):
    landlord_name: str
    landlord_address: Optional[str] = None
    property_address: str
    apartment_size_sqm: Decimal
    apartment_floor: Optional[str] = None
    monthly_advance_payment: Optional[Decimal] = None
    tenants_count: int = 1
    heating_type: str = "central"
    contract_start_date: Optional[date] = None


class RentalContractUpdate(BaseModel):
    landlord_name: Optional[str] = None
    landlord_address: Optional[str] = None
    property_address: Optional[str] = None
    apartment_size_sqm: Optional[Decimal] = None
    apartment_floor: Optional[str] = None
    monthly_advance_payment: Optional[Decimal] = None
    tenants_count: Optional[int] = None
    heating_type: Optional[str] = None
    contract_start_date: Optional[date] = None
    is_active: Optional[bool] = None


class RentalContractRead(BaseModel):
    id: int
    user_id: int
    landlord_name: str
    landlord_address: Optional[str] = None
    property_address: str
    apartment_size_sqm: Decimal
    apartment_floor: Optional[str] = None
    monthly_advance_payment: Optional[Decimal] = None
    tenants_count: int
    heating_type: str
    contract_start_date: Optional[date] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
