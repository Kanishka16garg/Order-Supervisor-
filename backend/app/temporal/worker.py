import asyncio
import logging
from temporalio.client import Client
from temporalio.worker import Worker

from backend.app.config import settings
from backend.app.temporal.workflows import OrderSupervisorWorkflow
from backend.app.temporal.activities import (
    classify_event_activity,
    record_activity_db,
    update_run_status_db,
    run_agent_cycle_activity,
    generate_end_of_run_summary_activity
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("temporal_worker")

async def run_worker():
    logger.info(f"Connecting to Temporal server at {settings.TEMPORAL_HOST}...")
    client = await Client.connect(settings.TEMPORAL_HOST)
    
    worker = Worker(
        client,
        task_queue=settings.TEMPORAL_TASK_QUEUE,
        workflows=[OrderSupervisorWorkflow],
        activities=[
            classify_event_activity,
            record_activity_db,
            update_run_status_db,
            run_agent_cycle_activity,
            generate_end_of_run_summary_activity
        ]
    )
    logger.info(f"Temporal Worker running on task queue: '{settings.TEMPORAL_TASK_QUEUE}'...")
    await worker.run()

if __name__ == "__main__":
    asyncio.run(run_worker())
