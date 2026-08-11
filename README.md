
# Sagepilot — Autonomous Order Supervisor

Sagepilot is an autonomous Order Supervisor prototype that continuously monitors and manages the lifecycle of an order. It demonstrates durable, long-running workflows, event-driven agentic reasoning, and safe tool execution suitable for evaluation in an AI systems engineering assignment.

---

**Task & Problem Statement**

- Task: Build an automated supervisor that can run for the lifetime of an order, react to incoming events, and perform operational actions while maintaining a concise, rolling memory and audit trail.
- Problem: Real-world order supervision involves long delays, intermittent signals, and costly LLM calls. The system must minimize unnecessary inference, preserve state across long waits, support runtime policy changes, and produce auditable outcomes.

---

**What I built**

- A Temporal-style `OrderSupervisorWorkflow` that persists state and supports signals (events, instructions, pause/resume, terminate).
- A lightweight classifier that filters events and wakes the agent only when necessary.
- A structured agent runtime that returns Pydantic-validated decisions and safely invokes mocked business tools.
- A Next.js dashboard to spawn runs, inject events, add instructions, and inspect timeline and summaries.
- A deterministic fallback executor and agent behavior so the demo is reproducible without paid LLM or Temporal.

---

**Tech stack**

- Backend: Python, FastAPI, async SQLAlchemy
- Workflow: Temporal SDK pattern with a local fallback executor
- Frontend: Next.js (App Router)
- Persistence: Postgres recommended (production) / SQLite (zero-setup demo)
- Optional: OpenAI / Gemini for LLMs (optional; fallback available)

---

**Core functionalities**

- Long-running per-order workflows supporting sleep/wake and durable signals
- Event classification to reduce unnecessary LLM inference
- Structured agent outputs: `ACT`, `WAIT`, `TERMINATE` with tool call lists
- Mocked business tools for safe side-effect demonstration and audit logging
- Runtime policy injection (dynamic instructions) while workflows run
- End-of-run summary generation with learnings and recommended actions
- End-to-end automated verification script: `backend/test_e2e.py`

---

**Architecture (visual)**

```mermaid
flowchart LR
       A[Next.js Dashboard] -->|HTTP| B[FastAPI Backend]
       B --> C[(Database)]
       B --> D[Temporal Engine / Fallback Executor]
       D --> E[Activities: Classifier, Agent, Tools, Summary]
       E --> C
```

---

**How this satisfies the assignment**

- Implements long-running workflows with durable signals and timers.
- Includes event classification and an agent with structured outputs.
- Demonstrates safe tool calls and audit logging.
- Provides local reproducibility via SQLite + deterministic fallback.
- Includes an automated end-to-end test to reproduce the full lifecycle.
- Clear documentation and a demo scenario focused for evaluators.

---

**Quick evaluation checklist**

1. `python backend/test_e2e.py` runs and produces lifecycle logs.
2. Start backend & frontend and reproduce: spawn run → inject events (payment_confirmed, shipment_delayed, delivered) → confirm timeline and final summary.
3. Verify `Run.final_summary` exists in DB and UI.
4. Review `backend/app/services/temporal_manager.py` to confirm Temporal integration and fallback behavior.

---

If you want, I will also:
- Add a short `EVALUATION.md` with explicit checkboxes for reviewers.
- Produce a PNG architecture diagram for your presentation slides.

Tell me which of the optional items you'd like and I'll add them and push the repo.

---

## 🏗️ Architecture

```
                               ┌─────────────────────────┐
                               │   Next.js Dashboard     │
                               └────────────┬────────────┘
                                            │ HTTP REST
                                            ▼
                               ┌─────────────────────────┐
                               │     FastAPI Backend     │
                               └──────┬───────────┬──────┘
                                      │           │
                          Read/Write  │           │ Start / Signal / Query
                                      ▼           ▼
                         ┌────────────────┐   ┌───────────────────────────┐
                         │  PostgreSQL /  │   │     Temporal Engine       │
                         │    SQLite      │   │ (OrderSupervisorWorkflow) │
                         └────────────────┘   └─────────────┬─────────────┘
                                                            │
                                                            ▼
                                              ┌───────────────────────────┐
                                              │    Temporal Activities    │
                                              ├───────────────────────────┤
                                              │ 1. Event Classifier       │
                                              │ 2. Agent Decision & Tools │
                                              │ 3. Rolling Memory         │
                                              │ 4. End-of-Run Summary     │
                                              └───────────────────────────┘
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10+
- Node.js v18+ and npm

### 0. Configure Environment
1. Copy the example `.env` into the backend folder:

```bash
cd "Assignment Internship"
copy backend\.env.example backend\.env
```

2. Edit `backend/.env` and set the variables described below. IMPORTANT: this project supports both SQLite (zero-setup) and Postgres. If you have a Postgres database (recommended for production), set `DATABASE_URL` to your Postgres URI (for example `postgresql://user:pass@host:5432/dbname`). The backend code will automatically convert `postgres://` / `postgresql://` to the async driver prefix used by SQLAlchemy.

Example `backend/.env` (Postgres):

```
DATABASE_URL=postgresql://myuser:mypassword@db.example.com:5432/order_supervisor
TEMPORAL_HOST=localhost:7233
OPENAI_API_KEY=
GEMINI_API_KEY=
```

Or, for a zero-setup local demo (SQLite):

```
DATABASE_URL=sqlite+aiosqlite:///./order_supervisor.db
TEMPORAL_HOST=localhost:7233
```

Note: `OPENAI_API_KEY` and `GEMINI_API_KEY` are optional. If not present the backend uses a deterministic fallback agent so the demo is reproducible without paid LLM access.

### 0.5. Temporal Server
This project is designed to use a Temporal service at `localhost:7233` for durable long-running workflows. To run Temporal locally (recommended for a production-like demo) use Docker:

```bash
docker run --rm -p 7233:7233 temporalio/auto-setup:latest
```

If Temporal is unavailable in your environment the backend falls back to an internal async executor so the demo continues to work. The fallback preserves the expected behavior for the assignment while making evaluation simpler.

### 1. Backend Setup (FastAPI & Temporal Engine)
Create and activate a virtual environment, install dependencies, and start the backend. Example (Windows):

```bash
# From the project root
python -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt

# Start FastAPI Backend Server
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

### 2. Frontend Setup (Next.js Control Dashboard)
In a separate terminal, install frontend dependencies and start Next.js:

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

The control dashboard will be available at `http://localhost:3000`.

---

## 🧪 Automated End-to-End Test Verification

Run the built-in end-to-end simulation script to verify the entire order lifecycle:
```bash
python backend/test_e2e.py
```

### Verified Lifecycle Output:
1. Workflow Initialized for Order `#ORD-9082`.
2. Event `payment_confirmed` received -> Classifier evaluates -> Agent inspects order context.
3. Event `shipment_delayed` received -> Urgent Anomaly -> Classifier wakes Agent -> Agent triggers `message_logistics_team` and `message_customer` tools!
4. Dynamic Instruction Signaled -> `"Offer 15% discount code"`.
5. Event `delivered` received -> Terminal state -> Final Summary, Learnings & Recommendations generated!

---

