# Order Supervisor — Autonomous Order Supervisor (AI Implementation Engineer Assignment)

An event-driven, long-running **AI Order Supervisor** proof-of-concept that continuously monitors a single order throughout its entire lifecycle. Built with **Temporal Python SDK**, **FastAPI**, **PostgreSQL / SQLite**, and **Next.js**.

---

## 🌟 Core Features

- **Long-Running Temporal Workflows**: One workflow execution per order (`OrderSupervisorWorkflow`), keeping state alive, supporting sleep timers, and waking on incoming signals.
- **Lightweight Event Classifier**: Filters incoming order signals (`payment_confirmed`, `shipment_delayed`, `delivered`) before waking the main LLM agent to prevent wasteful inference calls.
- **Structured Agentic Decision Engine**: Pydantic-validated agent outputs (`ACT`, `WAIT`, `TERMINATE`) with automatic tool calling (`message_logistics_team`, `message_customer`, `create_internal_note`, `escalate_issue`).
- **Dynamic Runtime Instructions**: Inject custom policy rules into running workflows (e.g. *"If shipment is delayed, offer a 15% discount code"*) via Temporal signals without interrupting state.
- **Compact Rolling Memory & Audit Timeline**: Maintains concise rolling context for token efficiency alongside a complete chronological event/activity timeline.
- **Workflow Lifecycle Controls**: Start, Pause/Interrupt, Resume, and Terminate order workflows from the dashboard UI.
- **End-of-Run Summary & Learnings**: Automatically synthesizes final summary, executed actions list, operational learnings, and recommendations when the order reaches terminal state (`delivered`).

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

## 🎥 Walkthrough Video Script / Demo Scenario

1. **Start Workflow**: Select "High-Value VIP Order Guard" template and click **Spawn Workflow Run** for Order `#ORD-9082`.
2. **Observe Sleep State**: Note badge transitioning to `😴 SLEEPING` with next scheduled wakeup timer.
3. **Inject Event**: Click `[Payment Confirmed]` preset button -> Note classifier decision in timeline.
4. **Inject Delay Anomaly**: Click `[🚨 Shipment Delayed]` -> Observe Agent waking immediately, executing `message_logistics_team` and `message_customer` tools, and updating compact memory.
5. **Add Dynamic Instruction**: Type *"If shipment is delayed, offer a 15% discount code"* into the prompt bar -> Observe instant signal processing.
6. **Finalize Lifecycle**: Click `[Order Delivered]` -> Observe status transitioning to `✅ COMPLETED` and rendering the End-of-Run Summary & Learnings card!
