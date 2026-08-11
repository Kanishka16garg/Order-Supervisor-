# Walkthrough & Speakable Demo Script

This file contains a concise, speakable walkthrough you can use for a presentation or video demo. Follow the recording checklist, then run the demo steps while reading the narration lines and cues.

## Recording Checklist

- Environment: Backend running (`uvicorn`) on `http://127.0.0.1:8000` and frontend on `http://localhost:3000`.
- Optional: Temporal Docker container on `localhost:7233` for production-like demo.
- Show terminal with `uvicorn` logs and the browser with the dashboard.
- Microphone checklist: short pauses between lines, highlight file edits visually.

## Files to open and describe (quick map)

- `backend/app/main.py` — FastAPI entrypoint, DB init, router mounts.
- `backend/app/api/runs.py` — Run lifecycle endpoints, event injection.
- `backend/app/services/temporal_manager.py` — Temporal client & fallback executor.
- `backend/app/services/agent.py` — LLM integration and deterministic fallback.
- `backend/app/services/classifier.py` — Event classifier policy.
- `backend/app/temporal/workflows.py` — `OrderSupervisorWorkflow` implementation.
- `backend/app/temporal/activities.py` — Activities recorded by the workflow.
- `frontend/app/page.tsx` — Dashboard UI and event controls.
- `frontend/app/lib/api.ts` — REST API client used by the UI.

## Demo commands (copyable)

Start backend (PowerShell):

```powershell
cd "C:\Users\Kanishka\OneDrive\문서\Desktop\Assignment Internship"
.venv\Scripts\activate
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

Start frontend:

```powershell
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

Inject events via curl (example):

```bash
curl -X POST http://127.0.0.1:8000/api/runs -H "Content-Type: application/json" -d '{"supervisor_template":"High-Value VIP Order Guard","order_id":"ORD-9082"}'

# Replace RUN_ID below with returned run_id
curl -X POST http://127.0.0.1:8000/api/runs/{RUN_ID}/inject_event -H "Content-Type: application/json" -d '{"type":"shipment_delayed","payload":{"reason":"Severe Weather","delay_hours":24}}'
```

## Speakable Script (short form)

Intro (15s):
"Hi, I'm Kanishka — this demo shows an autonomous Order Supervisor architecture. The system runs a long-lived workflow per order, uses a classifier to decide when to wake the agent, and executes mocked business tools for actions like notifying logistics or customers."

Show architecture (30s):
Open `ARCHITECTURE.md` and say: "This diagram lists the frontend, backend, workflow layer, agent, tools, and persistence. Key files are mapped on the left — we'll open a few now."

Open `backend/app/main.py` (10s):
"This is the FastAPI entrypoint. It creates the DB tables, mounts API routers, and starts the worker loop for fallback workflows when Temporal is not present."

Open `backend/app/services/classifier.py` and `agent.py` (20s):
"The classifier quickly decides whether an incoming event should wake the agent. The agent then produces a structured JSON decision that may include tool calls — these are validated by Pydantic and executed by the `tools` module."

Live demo (90s):
1. Create a run from the UI: Click 'Create Run' using `High-Value VIP Order Guard`.
   Narration: "Creating a run spawns a workflow and persists the run row in the database."
2. Inject `payment_confirmed` (UI button):
   Narration: "Payment confirmed is usually routine; the classifier logs it and keeps the workflow asleep for efficiency."
3. Inject `shipment_delayed` (UI button):
   Narration: "Shipment delayed is classified as an anomaly — it wakes the agent. The agent decides to message logistics and notify the customer. Watch the backend logs and the timeline for two TOOL_EXECUTION activities."
4. Add a dynamic instruction: "Offer 15% goodwill discount if customer is VIP".
   Narration: "Runtime instructions are appended to the agent prompt and influence subsequent decisions."
5. Inject `delivered`:
   Narration: "Delivered is terminal — the workflow generates an end-of-run summary and marks the run completed. We'll show the final summary printed in the UI."

Closing (15s):
"The code supports SQLite for zero-setup demos and Postgres for production. If you want I can push these changes to your GitHub repo now so you can present from any machine."

## Expected outputs to show

- Backend logs: agent decisions and tool execution lines.
- Timeline in UI: `WORKFLOW_STATE`, `TOOL_EXECUTION`, and `FINAL_SUMMARY` entries.
- DB: `Run.final_summary` contains the narrative summary.

---

If you want I can now commit these docs and push to `https://github.com/Kanishka16garg/Order-Supervisor`. (I'll proceed with the push if you confirm.)
