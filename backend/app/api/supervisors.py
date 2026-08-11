from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.db.database import get_db
from backend.app.db.models import Supervisor
from backend.app.schemas.supervisor import SupervisorCreate, SupervisorResponse

router = APIRouter(prefix="/api/supervisors", tags=["Supervisors"])

@router.post("", response_model=SupervisorResponse)
async def create_supervisor(payload: SupervisorCreate, db: AsyncSession = Depends(get_db)):
    supervisor = Supervisor(
        name=payload.name,
        base_instruction=payload.base_instruction,
        wake_sensitivity=payload.wake_sensitivity,
        available_tools=payload.available_tools
    )
    db.add(supervisor)
    await db.commit()
    await db.refresh(supervisor)
    return supervisor

@router.get("", response_model=List[SupervisorResponse])
async def list_supervisors(db: AsyncSession = Depends(get_db)):
    stmt = select(Supervisor).order_by(Supervisor.created_at.desc())
    result = await db.execute(stmt)
    supervisors = result.scalars().all()
    
    # Auto-seed standard default templates if database is empty!
    if not supervisors:
        default_templates = [
            Supervisor(
                name="D2C Express Shipping Supervisor",
                base_instruction="Continuously monitor order dispatch, courier tracking, and payment verification. On shipment delay > 12h, escalate immediately to logistics and issue customer SMS update. If VIP, offer discount code.",
                wake_sensitivity="MEDIUM",
                available_tools=["message_fulfillment_team", "message_payments_team", "message_logistics_team", "message_customer", "create_internal_note", "escalate_issue"]
            ),
            Supervisor(
                name="High-Value VIP Order Guard",
                base_instruction="Strictest sentinel supervision for orders over $150. Immediate agent wake on any anomaly. Priority handling on courier delays or customer messages.",
                wake_sensitivity="HIGH",
                available_tools=["message_fulfillment_team", "message_payments_team", "message_logistics_team", "message_customer", "create_internal_note", "escalate_issue"]
            )
        ]
        for tmpl in default_templates:
            db.add(tmpl)
        await db.commit()
        
        result = await db.execute(stmt)
        supervisors = result.scalars().all()

    return supervisors

@router.get("/{supervisor_id}", response_model=SupervisorResponse)
async def get_supervisor(supervisor_id: str, db: AsyncSession = Depends(get_db)):
    supervisor = await db.get(Supervisor, supervisor_id)
    if not supervisor:
        raise HTTPException(status_code=404, detail="Supervisor template not found")
    return supervisor
