const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Supervisor {
  id: string;
  name: string;
  base_instruction: string;
  wake_sensitivity: string;
  available_tools: string[];
  created_at: string;
}

export interface Activity {
  id: string;
  type: "EVENT" | "CLASSIFIER_DECISION" | "AGENT_DECISION" | "TOOL_EXECUTION" | "MEMORY_UPDATE" | "WORKFLOW_STATE";
  title: string;
  description: string;
  activity_metadata: any;
  created_at: string;
}

export interface Memory {
  id: string;
  rolling_summary: string;
  important_facts: string[];
  last_updated_at: string;
}

export interface Run {
  id: string;
  order_id: string;
  supervisor_id: string;
  status: "ACTIVE" | "WAITING" | "SLEEPING" | "PAUSED" | "COMPLETED" | "TERMINATED";
  next_wakeup_at: string | null;
  customer_info: {
    name: string;
    email: string;
    vip_status?: boolean;
  };
  order_details: {
    item: string;
    total_amount: number;
    shipping_method?: string;
    carrier?: string;
  };
  custom_instructions: string[];
  final_summary: {
    final_summary: string;
    actions_taken_summary: string[];
    key_learnings: string[];
    recommendations: string[];
  } | null;
  created_at: string;
  updated_at: string;
  memory?: Memory;
  activities?: Activity[];
}

export async function fetchSupervisors(): Promise<Supervisor[]> {
  const res = await fetch(`${API_BASE}/api/supervisors`);
  if (!res.ok) throw new Error("Failed to fetch supervisor templates");
  return res.json();
}

export async function createSupervisor(data: Partial<Supervisor>): Promise<Supervisor> {
  const res = await fetch(`${API_BASE}/api/supervisors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create supervisor template");
  return res.json();
}

export async function fetchRuns(): Promise<Run[]> {
  const res = await fetch(`${API_BASE}/api/runs`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch runs");
  return res.json();
}

export async function fetchRunDetails(runId: string): Promise<Run> {
  const res = await fetch(`${API_BASE}/api/runs/${runId}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch run details");
  return res.json();
}

export async function createRun(payload: {
  order_id: string;
  supervisor_id: string;
  customer_info: any;
  order_details: any;
  initial_instructions?: string[];
}): Promise<Run> {
  const res = await fetch(`${API_BASE}/api/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to start run");
  return res.json();
}

export async function injectEvent(runId: string, event_type: string, payload: any = {}): Promise<any> {
  const res = await fetch(`${API_BASE}/api/runs/${runId}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event_type, payload }),
  });
  if (!res.ok) throw new Error("Failed to inject event");
  return res.json();
}

export async function addInstruction(runId: string, instruction: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/runs/${runId}/instructions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instruction }),
  });
  if (!res.ok) throw new Error("Failed to add instruction");
  return res.json();
}

export async function pauseRun(runId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/runs/${runId}/pause`, { method: "POST" });
  return res.json();
}

export async function resumeRun(runId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/runs/${runId}/resume`, { method: "POST" });
  return res.json();
}

export async function terminateRun(runId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/runs/${runId}/terminate`, { method: "POST" });
  return res.json();
}
