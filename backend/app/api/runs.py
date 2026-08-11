from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from backend.app.db.database import get_db
from backend.app.db.models import Run, Supervisor, Event, Activity, Memory
from backend.app.schemas.run import RunCreate, RunResponse, RunDetailResponse, InstructionCreate
from backend.app.schemas.event import EventCreate, EventResponse
from backend.app.services.temporal_manager import (
    start_order_workflow,
    signal_event_to_workflow,
    signal_instruction_to_workflow,
    signal_pause_workflow,
    signal_resume_workflow,
    signal_terminate_workflow
)

router = APIRouter(prefix="/api/runs", tags=["Runs"])

@router.post("", response_model=RunResponse)
async def create_run(payload: RunCreate, db: AsyncSession = Depends(get_db)):
    supervisor = await db.get(Supervisor, payload.supervisor_id)
    if not supervisor:
        raise HTTPException(status_code=404, detail="Supervisor template not found")

    new_run = Run(
        order_id=payload.order_id,
        supervisor_id=payload.supervisor_id,
        status="ACTIVE",
        customer_info=payload.customer_info,
        order_details=payload.order_details,
        custom_instructions=payload.initial_instructions or []
    )
    db.add(new_run)
    await db.commit()
    await db.refresh(new_run)

    # Initialize rolling memory
    memory = Memory(
        run_id=new_run.id,
        rolling_summary=f"Order #{new_run.order_id} workflow initialized with supervisor '{supervisor.name}'."
    )
    db.add(memory)
    await db.commit()

    # Trigger Temporal Workflow!
    await start_order_workflow(new_run.id, new_run.order_id, supervisor.wake_sensitivity)

    return new_run

@router.get("", response_model=List[RunResponse])
async def list_runs(db: AsyncSession = Depends(get_db)):
    stmt = select(Run).order_by(Run.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.get("/{run_id}", response_model=RunDetailResponse)
async def get_run_details(run_id: str, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Run)
        .where(Run.id == run_id)
        .options(selectinload(Run.activities), selectinload(Run.memory))
    )
    result = await db.execute(stmt)
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    # Order activities chronologically
    run.activities.sort(key=lambda a: a.created_at)
    return run

@router.post("/{run_id}/events", response_model=EventResponse)
async def inject_event(run_id: str, payload: EventCreate, db: AsyncSession = Depends(get_db)):
    run = await db.get(Run, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    supervisor = await db.get(Supervisor, run.supervisor_id)
    sensitivity = supervisor.wake_sensitivity if supervisor else "MEDIUM"

    event = Event(
        run_id=run_id,
        event_type=payload.event_type,
        payload=payload.payload,
        processed=True
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)

    # Signal Temporal Workflow!
    await signal_event_to_workflow(
        run_id=run_id,
        event_data={"event_type": payload.event_type, "payload": payload.payload},
        wake_sensitivity=sensitivity
    )

    return event

@router.post("/{run_id}/instructions")
async def add_run_instruction(run_id: str, payload: InstructionCreate, db: AsyncSession = Depends(get_db)):
    run = await db.get(Run, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    instructions = list(run.custom_instructions or [])
    instructions.append(payload.instruction)
    run.custom_instructions = instructions
    await db.commit()

    # Signal Temporal Workflow!
    await signal_instruction_to_workflow(run_id, payload.instruction)

    return {"status": "SUCCESS", "custom_instructions": run.custom_instructions}

@router.post("/{run_id}/pause")
async def pause_run(run_id: str, db: AsyncSession = Depends(get_db)):
    run = await db.get(Run, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    run.status = "PAUSED"
    await db.commit()
    await signal_pause_workflow(run_id)
    return {"status": "PAUSED"}

@router.post("/{run_id}/resume")
async def resume_run(run_id: str, db: AsyncSession = Depends(get_db)):
    run = await db.get(Run, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    run.status = "ACTIVE"
    await db.commit()
    await signal_resume_workflow(run_id)
    return {"status": "ACTIVE"}

@router.post("/{run_id}/terminate")
async def terminate_run(run_id: str, db: AsyncSession = Depends(get_db)):
    run = await db.get(Run, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    run.status = "TERMINATED"
    run.next_wakeup_at = None
    await db.commit()
    await signal_terminate_workflow(run_id)
    return {"status": "TERMINATED"}
