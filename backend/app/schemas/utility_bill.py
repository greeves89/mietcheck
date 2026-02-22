from pydantic import BaseModel
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Any


class BillPositionCreate(BaseModel):
    category: str
    name: str
    total_amount: Decimal
    distribution_key: Optional[str] = None
    tenant_share_percent: Optional[Decimal] = None
    tenant_amount: Optional[Decimal] = None


class BillPositionRead(BaseModel):
    id: int
    bill_id: int
    category: str
    name: str
    total_amount: Decimal
    distribution_key: Optional[str] = None
    tenant_share_percent: Optional[Decimal] = None
    tenant_amount: Optional[Decimal] = None
    is_allowed: bool
    reference_value_low: Optional[Decimal] = None
    reference_value_high: Optional[Decimal] = None
    is_plausible: Optional[bool] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CheckResultRead(BaseModel):
    id: int
    bill_id: int
    check_type: str
    severity: str
    title: str
    description: str
    recommendation: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ObjectionLetterCreate(BaseModel):
    objection_reasons: List[str]


class ObjectionLetterRead(BaseModel):
    id: int
    bill_id: int
    content: str
    objection_reasons: Optional[List[Any]] = None
    sent_date: Optional[date] = None
    sent_via: Optional[str] = None
    pdf_path: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UtilityBillCreate(BaseModel):
    contract_id: int
    billing_year: int
    billing_period_start: date
    billing_period_end: date
    received_date: Optional[date] = None
    total_costs: Optional[Decimal] = None
    total_advance_paid: Optional[Decimal] = None
    result_amount: Optional[Decimal] = None
    notes: Optional[str] = None
    positions: List[BillPositionCreate] = []


class UtilityBillUpdate(BaseModel):
    received_date: Optional[date] = None
    total_costs: Optional[Decimal] = None
    total_advance_paid: Optional[Decimal] = None
    result_amount: Optional[Decimal] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class UtilityBillRead(BaseModel):
    id: int
    user_id: int
    contract_id: int
    billing_year: int
    billing_period_start: date
    billing_period_end: date
    received_date: Optional[date] = None
    total_costs: Optional[Decimal] = None
    total_advance_paid: Optional[Decimal] = None
    result_amount: Optional[Decimal] = None
    status: str
    check_score: Optional[int] = None
    notes: Optional[str] = None
    document_path: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    positions: List[BillPositionRead] = []
    check_results: List[CheckResultRead] = []

    class Config:
        from_attributes = True
