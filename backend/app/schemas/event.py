from datetime import datetime
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

class EventCreate(BaseModel):
    event_type: str = Field(..., example="shipment_delayed")
    payload: Dict[str, Any] = Field(default_factory=dict, example={"delay_reason": "Severe weather", "delay_hours": 24})

class EventResponse(BaseModel):
    id: str
    run_id: str
    event_type: str
    payload: Dict[str, Any]
    processed: bool
    created_at: datetime

    class Config:
        from_attributes = True
