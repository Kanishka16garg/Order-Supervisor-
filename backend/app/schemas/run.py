from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class RunCreate(BaseModel):
    order_id: str = Field(..., example="ORD-9082")
    supervisor_id: str = Field(..., example="sup-123")
    customer_info: Dict[str, Any] = Field(default_factory=lambda: {
        "name": "Alex Rivera",
        "email": "alex.rivera@example.com",
        "vip_status": True
    })
    order_details: Dict[str, Any] = Field(default_factory=lambda: {
        "item": "Wireless Noise-Canceling Headphones",
        "total_amount": 199.99,
        "shipping_method": "Express",
        "carrier": "FedEx"
    })
    initial_instructions: Optional[List[str]] = Field(default_factory=list)

class InstructionCreate(BaseModel):
    instruction: str = Field(..., example="If shipment is delayed, offer a 15% discount code to customer immediately.")

class ActivityResponse(BaseModel):
    id: str
    type: str
    title: str
    description: str
    activity_metadata: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True

class MemoryResponse(BaseModel):
    id: str
    rolling_summary: str
    important_facts: List[str]
    last_updated_at: datetime

    class Config:
        from_attributes = True

class RunResponse(BaseModel):
    id: str
    order_id: str
    supervisor_id: str
    status: str
    next_wakeup_at: Optional[datetime] = None
    customer_info: Dict[str, Any]
    order_details: Dict[str, Any]
    custom_instructions: List[str]
    final_summary: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class RunDetailResponse(RunResponse):
    memory: Optional[MemoryResponse] = None
    activities: List[ActivityResponse] = []
