import asyncio
from datetime import timedelta
from typing import Dict, Any, List
from temporalio import workflow

with workflow.unsafe.imports_passed_through():
    from backend.app.temporal.activities import (
        classify_event_activity,
        run_agent_cycle_activity,
        generate_end_of_run_summary_activity,
        update_run_status_db,
        record_activity_db
    )

@workflow.defn
class OrderSupervisorWorkflow:
    def __init__(self) -> None:
        self.events_queue: List[Dict[str, Any]] = []
        self.new_instructions: List[str] = []
        self.is_paused: bool = False
        self.is_terminated: bool = False
        self.is_completed: bool = False
        self.sleep_duration_seconds: int = 7200 # Default 2h

    @workflow.signal
    async def inject_event(self, event_data: Dict[str, Any]) -> None:
        self.events_queue.append(event_data)

    @workflow.signal
    async def add_instruction(self, instruction: str) -> None:
        self.new_instructions.append(instruction)

    @workflow.signal
    async def pause_workflow(self) -> None:
        self.is_paused = True

    @workflow.signal
    async def resume_workflow(self) -> None:
        self.is_paused = False

    @workflow.signal
    async def terminate_workflow(self) -> None:
        self.is_terminated = True

    @workflow.query
    def get_workflow_state(self) -> Dict[str, Any]:
        return {
            "is_paused": self.is_paused,
            "is_completed": self.is_completed,
            "is_terminated": self.is_terminated,
            "pending_events": len(self.events_queue),
            "sleep_duration_seconds": self.sleep_duration_seconds
        }

    @workflow.run
    async def run(self, run_id: str, order_id: str, wake_sensitivity: str = "MEDIUM") -> Dict[str, Any]:
        activity_retry_policy = workflow.ActivityOptions(
            start_to_close_timeout=timedelta(seconds=60)
        )

        # 1. Initial Start Cycle
        await workflow.execute_activity(
            record_activity_db,
            args=[run_id, "WORKFLOW_STATE", "Workflow Started", f"AI Supervisor initialized for Order #{order_id}."],
            activity_options=activity_retry_policy
        )

        agent_result = await workflow.execute_activity(
            run_agent_cycle_activity,
            args=[run_id, {"event_type": "order_created", "payload": {}}],
            activity_options=activity_retry_policy
        )

        if agent_result.get("next_wake_in_seconds"):
            self.sleep_duration_seconds = agent_result["next_wake_in_seconds"]

        # Main Supervisor Lifecycle Loop
        while not self.is_completed and not self.is_terminated:
            
            # Handle Pause state
            if self.is_paused:
                await workflow.execute_activity(
                    update_run_status_db,
                    args=[run_id, "PAUSED"],
                    activity_options=activity_retry_policy
                )
                await workflow.wait_condition(lambda: not self.is_paused or self.is_terminated)
                if self.is_terminated:
                    break
                await workflow.execute_activity(
                    update_run_status_db,
                    args=[run_id, "ACTIVE"],
                    activity_options=activity_retry_policy
                )

            # Update DB state to SLEEPING
            await workflow.execute_activity(
                update_run_status_db,
                args=[
                    run_id,
                    "SLEEPING",
                    agent_result.get("next_wakeup_iso")
                ],
                activity_options=activity_retry_policy
            )

            # Wait for event signal, new instruction signal, pause signal, or sleep timer expiry
            woken_by_signal = False
            try:
                await workflow.wait_condition(
                    lambda: len(self.events_queue) > 0 or len(self.new_instructions) > 0 or self.is_paused or self.is_terminated,
                    timeout=timedelta(seconds=max(5, self.sleep_duration_seconds))
                )
                woken_by_signal = True
            except asyncio.TimeoutError:
                # Timer expired - Scheduled Wakeup!
                woken_by_signal = False

            if self.is_terminated:
                break

            # Handle Dynamic Instructions
            if len(self.new_instructions) > 0:
                inst = self.new_instructions.pop(0)
                await workflow.execute_activity(
                    record_activity_db,
                    args=[run_id, "WORKFLOW_STATE", "Dynamic Instruction Received", f"New instruction added: '{inst}'."],
                    activity_options=activity_retry_policy
                )
                await workflow.execute_activity(
                    update_run_status_db,
                    args=[run_id, "ACTIVE"],
                    activity_options=activity_retry_policy
                )
                agent_result = await workflow.execute_activity(
                    run_agent_cycle_activity,
                    args=[run_id, {"event_type": "dynamic_instruction_added", "payload": {"instruction": inst}}],
                    activity_options=activity_retry_policy
                )
                if agent_result.get("next_wake_in_seconds"):
                    self.sleep_duration_seconds = agent_result["next_wake_in_seconds"]

            # Handle Incoming Event Signal
            elif len(self.events_queue) > 0:
                event_data = self.events_queue.pop(0)
                
                await workflow.execute_activity(
                    record_activity_db,
                    args=[run_id, "EVENT", f"Event Received: {event_data.get('event_type')}", f"Payload: {event_data.get('payload')}"],
                    activity_options=activity_retry_policy
                )

                # Lightweight Classifier Check
                classifier_res = await workflow.execute_activity(
                    classify_event_activity,
                    args=[event_data, wake_sensitivity],
                    activity_options=activity_retry_policy
                )

                await workflow.execute_activity(
                    record_activity_db,
                    args=[
                        run_id,
                        "CLASSIFIER_DECISION",
                        f"Classifier: {'WAKE AGENT' if classifier_res['wake_immediately'] else 'STAY ASLEEP'}",
                        classifier_res['reason'],
                        classifier_res
                    ],
                    activity_options=activity_retry_policy
                )

                if classifier_res.get("wake_immediately") or classifier_res.get("is_terminal_event"):
                    await workflow.execute_activity(
                        update_run_status_db,
                        args=[run_id, "ACTIVE"],
                        activity_options=activity_retry_policy
                    )

                    agent_result = await workflow.execute_activity(
                        run_agent_cycle_activity,
                        args=[run_id, event_data],
                        activity_options=activity_retry_policy
                    )

                    if agent_result.get("is_terminal") or classifier_res.get("is_terminal_event"):
                        self.is_completed = True
                        final_summary = await workflow.execute_activity(
                            generate_end_of_run_summary_activity,
                            args=[run_id],
                            activity_options=activity_retry_policy
                        )
                        return final_summary
                    
                    if agent_result.get("next_wake_in_seconds"):
                        self.sleep_duration_seconds = agent_result["next_wake_in_seconds"]

            # Scheduled Timer Wakeup
            elif not woken_by_signal:
                await workflow.execute_activity(
                    record_activity_db,
                    args=[run_id, "WORKFLOW_STATE", "Scheduled Wakeup Timer Triggered", "Agent waking up for routine order inspection."],
                    activity_options=activity_retry_policy
                )
                await workflow.execute_activity(
                    update_run_status_db,
                    args=[run_id, "ACTIVE"],
                    activity_options=activity_retry_policy
                )
                agent_result = await workflow.execute_activity(
                    run_agent_cycle_activity,
                    args=[run_id, {"event_type": "scheduled_wakeup", "payload": {}}],
                    activity_options=activity_retry_policy
                )
                if agent_result.get("next_wake_in_seconds"):
                    self.sleep_duration_seconds = agent_result["next_wake_in_seconds"]

        if self.is_terminated:
            await workflow.execute_activity(
                update_run_status_db,
                args=[run_id, "TERMINATED"],
                activity_options=activity_retry_policy
            )
            return {"status": "TERMINATED"}

        return {"status": "COMPLETED"}
