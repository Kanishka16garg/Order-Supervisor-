import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List
from temporalio import activity

from backend.app.db.database import AsyncSessionLocal
from backend.app.db.models import Run, Activity, Event, Memory, Supervisor
from backend.app.services.classifier import classify_event
from backend.app.services.agent import run_agent_reasoning, generate_end_of_run_summary
from backend.app.tools.actions import AVAILABLE_TOOLS_MAP

logger = logging.getLogger("temporal_activities")

@activity.defn
async def classify_event_activity(event_data: Dict[str, Any], wake_sensitivity: str) -> Dict[str, Any]:
    event_type = event_data.get("event_type", "")
    payload = event_data.get("payload", {})
    decision = await classify_event(event_type, payload, wake_sensitivity)
    return decision.model_dump()

@activity.defn
async def record_activity_db(run_id: str, act_type: str, title: str, description: str, metadata: Dict[str, Any] = {}) -> None:
    async with AsyncSessionLocal() as db:
        new_act = Activity(
            run_id=run_id,
            type=act_type,
            title=title,
            description=description,
            activity_metadata=metadata,
            created_at=datetime.utcnow()
        )
        db.add(new_act)
        await db.commit()

@activity.defn
async def update_run_status_db(run_id: str, status: str, next_wakeup_at: str = None) -> None:
    async with AsyncSessionLocal() as db:
        run = await db.get(Run, run_id)
        if run:
            run.status = status
            if next_wakeup_at:
                run.next_wakeup_at = datetime.fromisoformat(next_wakeup_at)
            elif status in ["COMPLETED", "TERMINATED"]:
                run.next_wakeup_at = None
            run.updated_at = datetime.utcnow()
            await db.commit()

@activity.defn
async def run_agent_cycle_activity(
    run_id: str,
    trigger_event: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Fetches context from DB, executes agent reasoning cycle, runs tools, updates DB.
    """
    async with AsyncSessionLocal() as db:
        run = await db.get(Run, run_id)
        supervisor = await db.get(Supervisor, run.supervisor_id)

        from sqlalchemy import select
        mem_stmt = select(Memory).where(Memory.run_id == run.id)
        mem_res = await db.execute(mem_stmt)
        memory_obj = mem_res.scalar_one_or_none()

        if not memory_obj:
            memory_obj = Memory(run_id=run.id, rolling_summary=f"Order #{run.order_id} monitoring started.")
            db.add(memory_obj)
            await db.commit()
            await db.refresh(memory_obj)
        
        # Call agent
        agent_res = await run_agent_reasoning(
            order_id=run.order_id,
            base_instruction=supervisor.base_instruction if supervisor else "Supervise order lifecycle.",
            custom_instructions=run.custom_instructions or [],
            current_memory=memory_obj.rolling_summary,
            order_details=run.order_details or {},
            customer_info=run.customer_info or {},
            trigger_event=trigger_event,
            available_tools=supervisor.available_tools if supervisor else list(AVAILABLE_TOOLS_MAP.keys())
        )
        
        # Record AGENT_DECISION timeline activity
        db.add(Activity(
            run_id=run.id,
            type="AGENT_DECISION",
            title=f"Agent Decision: {agent_res.decision}",
            description=agent_res.reasoning,
            activity_metadata={
                "decision": agent_res.decision,
                "actions_count": len(agent_res.actions),
                "next_wake_in": agent_res.next_wake_in_seconds,
                "is_terminal": agent_res.is_terminal_order_state
            }
        ))

        # Execute actions / tools
        tool_results = []
        for act in agent_res.actions:
            tool_fn = AVAILABLE_TOOLS_MAP.get(act.tool_name)
            if tool_fn:
                res = tool_fn(**act.params)
                tool_results.append(res)
                
                # Record TOOL_EXECUTION activity
                db.add(Activity(
                    run_id=run.id,
                    type="TOOL_EXECUTION",
                    title=f"Tool Execution: {act.tool_name}",
                    description=f"Parameters: {json.dumps(act.params)}",
                    activity_metadata=res
                ))

        # Update Memory
        memory_obj.rolling_summary = agent_res.updated_memory_summary
        memory_obj.last_updated_at = datetime.utcnow()

        await db.commit()

        next_wakeup_iso = None
        if agent_res.next_wake_in_seconds > 0 and not agent_res.is_terminal_order_state:
            next_wakeup_dt = datetime.utcnow() + timedelta(seconds=agent_res.next_wake_in_seconds)
            next_wakeup_iso = next_wakeup_dt.isoformat()

        return {
            "decision": agent_res.decision,
            "reasoning": agent_res.reasoning,
            "actions_executed": len(tool_results),
            "updated_memory": memory_obj.rolling_summary,
            "next_wake_in_seconds": agent_res.next_wake_in_seconds,
            "next_wakeup_iso": next_wakeup_iso,
            "is_terminal": agent_res.is_terminal_order_state
        }

@activity.defn
async def generate_end_of_run_summary_activity(run_id: str) -> Dict[str, Any]:
    async with AsyncSessionLocal() as db:
        run = await db.get(Run, run_id)
        if not run:
            return {}
        
        # Load memory and activities
        from sqlalchemy import select
        act_stmt = select(Activity).where(Activity.run_id == run_id)
        act_result = await db.execute(act_stmt)
        activities = act_result.scalars().all()
        act_dicts = [{"type": a.type, "title": a.title, "description": a.description} for a in activities]
        
        memory_obj = await db.get(Memory, run_id)
        rolling_mem = memory_obj.rolling_summary if memory_obj else "Order finished."
        
        summary_res = await generate_end_of_run_summary(run.order_id, rolling_mem, act_dicts)
        summary_dict = summary_res.model_dump()
        
        run.final_summary = summary_dict
        run.status = "COMPLETED"
        run.next_wakeup_at = None
        
        db.add(Activity(
            run_id=run.id,
            type="WORKFLOW_STATE",
            title="Workflow Completed",
            description=f"Final summary generated for Order #{run.order_id}.",
            activity_metadata=summary_dict
        ))
        
        await db.commit()
        return summary_dict
