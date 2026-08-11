from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

class SupervisorBase(BaseModel):
    name: str = Field(..., example="D2C Express Shipping Supervisor")
    base_instruction: str = Field(..., example="Monitor order lifecycle. Notify logistics if delayed.")
    wake_sensitivity: str = Field("MEDIUM", example="MEDIUM") # HIGH, MEDIUM, LOW
    available_tools: List[str] = Field(default_factory=lambda: [
        "message_fulfillment_team",
        "message_payments_team",
        "message_logistics_team",
        "message_customer",
        "create_internal_note",
        "escalate_issue"
    ])

class SupervisorCreate(SupervisorBase):
    pass

class SupervisorResponse(SupervisorBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True
