from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class FeedbackCreate(BaseModel):
    type: str  # bug, feature, general
    title: str
    message: str


class FeedbackAdminUpdate(BaseModel):
    status: Optional[str] = None  # pending, approved, rejected
    admin_response: Optional[str] = None


class FeedbackRead(BaseModel):
    id: int
    user_id: int
    type: str
    title: str
    message: str
    status: str
    admin_response: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FeedbackReadWithUser(FeedbackRead):
    user_email: Optional[str] = None
    user_name: Optional[str] = None
