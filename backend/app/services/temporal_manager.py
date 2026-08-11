import asyncio
import logging
from typing import Dict, Any, Optional
from temporalio.client import Client

from backend.app.config import settings
from backend.app.temporal.workflows import OrderSupervisorWorkflow
from backend.app.temporal.activities import (
    classify_event_activity,
    run_agent_cycle_activity,
    generate_end_of_run_summary_activity,
    update_run_status_db,
    record_activity_db
)

logger = logging.getLogger("temporal_manager")

_temporal_client: Optional[Client] = None

async def get_temporal_client() -> Optional[Client]:
    global _temporal_client
    if _temporal_client is None:
        try:
            _temporal_client = await Client.connect(settings.TEMPORAL_HOST)
            logger.info("Connected to Temporal service.")
        except Exception as e:
            logger.warning(f"Could not connect to Temporal dev server at {settings.TEMPORAL_HOST}: {e}. Operating in standalone async mode.")
            _temporal_client = None
    return _temporal_client

async def start_order_workflow(run_id: str, order_id: str, wake_sensitivity: str) -> None:
    client = await get_temporal_client()
    if client:
        try:
            await client.start_workflow(
                OrderSupervisorWorkflow.run,
                args=[run_id, order_id, wake_sensitivity],
                id=f"order-workflow-{run_id}",
                task_queue=settings.TEMPORAL_TASK_QUEUE,
            )
            logger.info(f"Started Temporal workflow order-workflow-{run_id}")
            return
        except Exception as e:
            logger.warning(f"Failed to start Temporal workflow via client: {e}. Executing async fallback step.")

    # Standalone Async Execution
    await _run_standalone_fallback(run_id, order_id, wake_sensitivity)

async def signal_event_to_workflow(run_id: str, event_data: Dict[str, Any], wake_sensitivity: str = "MEDIUM") -> None:
    client = await get_temporal_client()
    if client:
        try:
            handle = client.get_workflow_handle(f"order-workflow-{run_id}")
            await handle.signal(OrderSupervisorWorkflow.inject_event, event_data)
            logger.info(f"Signaled event to Temporal workflow {run_id}")
            return
        except Exception as e:
            logger.warning(f"Temporal signal error: {e}. Executing direct async event processor.")

    # Direct Async Event Processing
    await _process_event_fallback(run_id, event_data, wake_sensitivity)

async def signal_instruction_to_workflow(run_id: str, instruction: str) -> None:
    client = await get_temporal_client()
    if client:
        try:
            handle = client.get_workflow_handle(f"order-workflow-{run_id}")
            await handle.signal(OrderSupervisorWorkflow.add_instruction, instruction)
            return
        except Exception as e:
            logger.warning(f"Temporal instruction signal error: {e}")

    # Fallback instruction handler
    await _process_instruction_fallback(run_id, instruction)

async def signal_pause_workflow(run_id: str) -> None:
    client = await get_temporal_client()
    if client:
        try:
            handle = client.get_workflow_handle(f"order-workflow-{run_id}")
            await handle.signal(OrderSupervisorWorkflow.pause_workflow)
            return
        except Exception:
            pass
    await update_run_status_db(run_id, "PAUSED")

async def signal_resume_workflow(run_id: str) -> None:
    client = await get_temporal_client()
    if client:
        try:
            handle = client.get_workflow_handle(f"order-workflow-{run_id}")
            await handle.signal(OrderSupervisorWorkflow.resume_workflow)
            return
        except Exception:
            pass
    await update_run_status_db(run_id, "ACTIVE")

async def signal_terminate_workflow(run_id: str) -> None:
    client = await get_temporal_client()
    if client:
        try:
            handle = client.get_workflow_handle(f"order-workflow-{run_id}")
            await handle.signal(OrderSupervisorWorkflow.terminate_workflow)
            return
        except Exception:
            pass
    await update_run_status_db(run_id, "TERMINATED")


# Standalone Async Fallback Executors

async def _run_standalone_fallback(run_id: str, order_id: str, wake_sensitivity: str):
    await record_activity_db(run_id, "WORKFLOW_STATE", "Workflow Started", f"AI Supervisor initialized for Order #{order_id}.")
    res = await run_agent_cycle_activity(run_id, {"event_type": "order_created", "payload": {}})
    await update_run_status_db(run_id, "SLEEPING", res.get("next_wakeup_iso"))

async def _process_event_fallback(run_id: str, event_data: Dict[str, Any], wake_sensitivity: str):
    await record_activity_db(run_id, "EVENT", f"Event Received: {event_data.get('event_type')}", f"Payload: {event_data.get('payload')}")
    classifier_res = await classify_event_activity(event_data, wake_sensitivity)
    
    await record_activity_db(
        run_id,
        "CLASSIFIER_DECISION",
        f"Classifier: {'WAKE AGENT' if classifier_res['wake_immediately'] else 'STAY ASLEEP'}",
        classifier_res['reason'],
        classifier_res
    )

    if classifier_res.get("wake_immediately") or classifier_res.get("is_terminal_event"):
        await update_run_status_db(run_id, "ACTIVE")
        agent_res = await run_agent_cycle_activity(run_id, event_data)
        
        if agent_res.get("is_terminal") or classifier_res.get("is_terminal_event"):
            await generate_end_of_run_summary_activity(run_id)
        else:
            await update_run_status_db(run_id, "SLEEPING", agent_res.get("next_wakeup_iso"))

async def _process_instruction_fallback(run_id: str, instruction: str):
    await record_activity_db(run_id, "WORKFLOW_STATE", "Dynamic Instruction Received", f"New instruction added: '{instruction}'.")
    await update_run_status_db(run_id, "ACTIVE")
    agent_res = await run_agent_cycle_activity(run_id, {"event_type": "dynamic_instruction_added", "payload": {"instruction": instruction}})
    await update_run_status_db(run_id, "SLEEPING", agent_res.get("next_wakeup_iso"))
