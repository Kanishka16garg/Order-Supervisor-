# Architecture & Design Note — Sagepilot AI Order Supervisor

This document summarizes the system architecture, the core components, and where the assignment features are implemented in the codebase. It also includes a short demo checklist you can follow during the walkthrough.

## Component Overview

- **Frontend (Next.js)** — [frontend/app/page.tsx](frontend/app/page.tsx#L1) and [frontend/app/lib/api.ts](frontend/app/lib/api.ts#L1)
  - UI for creating templates, starting runs, injecting events, adding instructions, and viewing timeline/memory.

- **Backend (FastAPI)** — [backend/app/main.py](backend/app/main.py#L1) and [backend/app/api](backend/app/api)
  - REST endpoints for supervisors and runs, DB initialization, and health checks.

- **Workflow Layer (Temporal-style)** — [backend/app/temporal/workflows.py](backend/app/temporal/workflows.py#L1) and [backend/app/services/temporal_manager.py](backend/app/services/temporal_manager.py#L1)
  - Long-running `OrderSupervisorWorkflow` model, signal handling, timers, and Temporal client integration. `temporal_manager.py` contains the Temporal client logic and a fallback executor used when Temporal is unavailable.

- **Agent & Classifier** — [backend/app/services/agent.py](backend/app/services/agent.py#L1) and [backend/app/services/classifier.py](backend/app/services/classifier.py#L1)
  - Lightweight classifier to decide whether to wake the agent, and an agent runtime that supports both LLM calls (via `OPENAI_API_KEY`) and deterministic fallback rules.

- **Tools & Activities** — [backend/app/tools/actions.py](backend/app/tools/actions.py#L1) and [backend/app/temporal/activities.py](backend/app/temporal/activities.py#L1)
  - Mocked business tools and activity wrappers that write audit records to the database.

- **Persistence** — [backend/app/db](backend/app/db)
  - SQLAlchemy models (`Supervisor`, `Run`, `Event`, `Activity`, `Memory`) and async DB engine (supports SQLite for zero-setup or Postgres for production).

## Workflow sequence (high level)

1. A user creates a run through the dashboard or API (`POST /api/runs`). The backend creates a `Run` row and starts `OrderSupervisorWorkflow` for that run.
2. The workflow executes an initial agent cycle, records a `WORKFLOW_STATE` activity, then enters a `wait_condition` loop.
3. Incoming events are signaled into the workflow using `inject_event` and buffered on `events_queue`.
4. Each event is first passed to the lightweight classifier. If classified as urgent/terminal, the workflow wakes and runs the agent; otherwise it stays asleep until the scheduled wake-up.
5. When the agent runs, it may call tools. Tools are executed (mocked) and `TOOL_EXECUTION` activities are recorded.
6. On terminal event (for example `delivered`), the workflow generates an end-of-run summary and marks the run `COMPLETED`.

## Where assignment requirements live in the code

- One workflow per order: [backend/app/temporal/workflows.py](backend/app/temporal/workflows.py#L1)
- Event signals into workflow: [backend/app/api/runs.py](backend/app/api/runs.py#L1) -> `temporal_manager.signal_event_to_workflow`
- Classifier and wake/sleep policy: [backend/app/services/classifier.py](backend/app/services/classifier.py#L1)
- Agent decision & tool calls: [backend/app/services/agent.py](backend/app/services/agent.py#L1) and [backend/app/tools/actions.py](backend/app/tools/actions.py#L1)
- Rolling memory and timeline: [backend/app/db/models.py](backend/app/db/models.py#L1) and [backend/app/temporal/activities.py](backend/app/temporal/activities.py#L1)
- Final summary generation: [backend/app/temporal/activities.py](backend/app/temporal/activities.py#L1) -> `generate_end_of_run_summary_activity`

## Demo checklist (quick)

1. Start backend and show logs from `uvicorn`.
2. (Optional) Start Temporal in Docker and show connection message. If not available, show fallback message in `temporal_manager` logs.
3. Start frontend and open `http://localhost:3000`.
4. Spawn run for `ORD-9082` using `High-Value VIP Order Guard`.
5. Inject `payment_confirmed` and explain classifier decision.
6. Inject `shipment_delayed` and show agent wake + tool calls.
7. Add dynamic instruction (15% discount) and show `WORKFLOW_STATE` activity.
8. Inject `delivered` and show final summary + recommendations.

## Notes on Postgres vs SQLite

The repository is written to work in either mode:
- For quick local demos we use SQLite by default (`sqlite+aiosqlite:///./order_supervisor.db`).
- For production-like evaluation use Postgres; set `DATABASE_URL` to a Postgres URI. The backend code will adapt the URI for the async driver automatically.

---

If you want a one-slide visual or a small diagram file for your video, tell me whether you prefer a PNG or a plaintext ASCII diagram and I’ll generate it next.
