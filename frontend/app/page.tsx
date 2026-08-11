"use client";

import React, { useState, useEffect } from "react";
import {
  Bot,
  Play,
  Pause,
  Square,
  Zap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  Plus,
  RefreshCw,
  Package,
  User,
  CreditCard,
  Truck,
  MessageSquare,
  ShieldAlert,
  Brain,
  FileText,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Activity as ActivityIcon,
  Terminal,
  Settings,
  HelpCircle,
  X,
  Info,
  Sliders
} from "lucide-react";
import {
  fetchSupervisors,
  fetchRuns,
  fetchRunDetails,
  createRun,
  createSupervisor,
  injectEvent,
  addInstruction,
  pauseRun,
  resumeRun,
  terminateRun,
  Supervisor,
  Run
} from "./lib/api";

export default function Dashboard() {
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [currentRun, setCurrentRun] = useState<Run | null>(null);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [instructionInput, setInstructionInput] = useState<string>("");
  const [eventToast, setEventToast] = useState<string | null>(null);
  const [wakingRunId, setWakingRunId] = useState<string | null>(null);
  const [showEventInfo, setShowEventInfo] = useState<boolean>(false);
  
  // Modals
  const [guideModalOpen, setGuideModalOpen] = useState<boolean>(false);
  const [newRunModalOpen, setNewRunModalOpen] = useState<boolean>(false);
  const [newSupervisorModalOpen, setNewSupervisorModalOpen] = useState<boolean>(false);

  // New Run Form State
  const [newOrderId, setNewOrderId] = useState<string>(`ORD-${Math.floor(1000 + Math.random() * 9000)}`);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("Alex Rivera");
  const [customerEmail, setCustomerEmail] = useState<string>("alex.rivera@example.com");
  const [isVip, setIsVip] = useState<boolean>(true);
  const [orderItem, setOrderItem] = useState<string>("Wireless Noise-Canceling Headphones");
  const [orderTotal, setOrderTotal] = useState<number>(199.99);

  // New Supervisor Form State
  const [supName, setSupName] = useState<string>("Custom Logistics Sentinel");
  const [supInstruction, setSupInstruction] = useState<string>("Monitor order fulfillment. Escalate any courier delay exceeding 6 hours.");
  const [supSensitivity, setSupSensitivity] = useState<string>("HIGH");

  // Load Supervisors and Runs on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  // Poll current selected run details every 2 seconds
  useEffect(() => {
    if (!selectedRunId) return;
    const interval = setInterval(() => {
      loadRunDetails(selectedRunId, false);
    }, 2000);
    return () => clearInterval(interval);
  }, [selectedRunId]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const sups = await fetchSupervisors();
      setSupervisors(sups);
      if (sups.length > 0) {
        setSelectedSupervisorId(sups[0].id);
      }
      const runList = await fetchRuns();
      setRuns(runList);
      if (runList.length > 0 && !selectedRunId) {
        setSelectedRunId(runList[0].id);
        await loadRunDetails(runList[0].id, false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const refreshAll = async () => {
    setRefreshing(true);
    try {
      const sups = await fetchSupervisors();
      setSupervisors(sups);
      const runList = await fetchRuns();
      setRuns(runList);
      if (selectedRunId) {
        await loadRunDetails(selectedRunId, false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  };

  const loadRunDetails = async (runId: string, showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await fetchRunDetails(runId);
      setCurrentRun(data);
      setRuns((prev) => prev.map((r) => (r.id === runId ? data : r)));
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleStartNewRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupervisorId) return;
    try {
      const newRun = await createRun({
        order_id: newOrderId,
        supervisor_id: selectedSupervisorId,
        customer_info: {
          name: customerName,
          email: customerEmail,
          vip_status: isVip
        },
        order_details: {
          item: orderItem,
          total_amount: Number(orderTotal),
          carrier: "FedEx Express"
        }
      });
      setNewRunModalOpen(false);
      setNewOrderId(`ORD-${Math.floor(1000 + Math.random() * 9000)}`);
      await refreshAll();
      setSelectedRunId(newRun.id);
      await loadRunDetails(newRun.id);
    } catch (err) {
      alert("Failed to start run: " + err);
    }
  };

  const handleCreateSupervisor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newSup = await createSupervisor({
        name: supName,
        base_instruction: supInstruction,
        wake_sensitivity: supSensitivity,
        available_tools: [
          "message_fulfillment_team",
          "message_payments_team",
          "message_logistics_team",
          "message_customer",
          "create_internal_note",
          "escalate_issue"
        ]
      });
      setNewSupervisorModalOpen(false);
      await refreshAll();
      setSelectedSupervisorId(newSup.id);
    } catch (err) {
      alert("Failed to create supervisor template: " + err);
    }
  };

  const handleInjectPresetEvent = async (eventType: string, payload: any = {}) => {
    if (!selectedRunId) return;
    
    // Visibly trigger waking animation state for immediate feedback!
    setWakingRunId(selectedRunId);
    setEventToast(`⚡ Signal '${eventType}' Injected → Classifier Waking Agent & Reasoning...`);

    try {
      // Optimistic UI: show run as ACTIVE immediately while backend processes signal
      setRuns((prev) => prev.map((r) => (r.id === selectedRunId ? { ...r, status: "ACTIVE" } : r)));
      setCurrentRun((prev) => (prev ? { ...prev, status: "ACTIVE" } : prev));

      await injectEvent(selectedRunId, eventType, payload);
      await loadRunDetails(selectedRunId, false);
    } catch (err) {
      alert("Failed to inject event: " + err);
    } finally {
      setTimeout(() => {
        setWakingRunId(null);
      }, 1800);
      setTimeout(() => {
        setEventToast(null);
      }, 4500);
    }
  };

  const handleAddInstruction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRunId || !instructionInput.trim()) return;
    try {
      // Optimistic UI: mark run active while instruction is signaled
      setRuns((prev) => prev.map((r) => (r.id === selectedRunId ? { ...r, status: "ACTIVE" } : r)));
      setCurrentRun((prev) => (prev ? { ...prev, status: "ACTIVE" } : prev));
      setWakingRunId(selectedRunId);
      await addInstruction(selectedRunId, instructionInput.trim());
      setInstructionInput("");
      setEventToast(`⚡ Dynamic Instruction Signaled to Live Temporal Workflow!`);
      await loadRunDetails(selectedRunId, false);
    } catch (err) {
      alert("Failed to add instruction: " + err);
    } finally {
      setTimeout(() => setWakingRunId(null), 1800);
      setTimeout(() => setEventToast(null), 4000);
    }
  };

  const handlePause = async () => {
    if (!selectedRunId) return;
    await pauseRun(selectedRunId);
    await loadRunDetails(selectedRunId, false);
  };

  const handleResume = async () => {
    if (!selectedRunId) return;
    await resumeRun(selectedRunId);
    await loadRunDetails(selectedRunId, false);
  };

  const handleTerminate = async () => {
    if (!selectedRunId) return;
    if (confirm("Are you sure you want to terminate this workflow run?")) {
      await terminateRun(selectedRunId);
      await loadRunDetails(selectedRunId, false);
    }
  };

  const getStatusBadge = (status: string, runId?: string) => {
    if (runId && runId === wakingRunId) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          ⚡ WAKING & REASONING...
        </span>
      );
    }

    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 pulse-glow-emerald">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            🟢 ACTIVE
          </span>
        );
      case "SLEEPING":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 pulse-glow-indigo">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            😴 SLEEPING
          </span>
        );
      case "WAITING":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-700/10 text-slate-200 border border-slate-600/30">
            <Clock className="w-3.5 h-3.5 text-slate-300" />
            ⏳ WAITING
          </span>
        );
      case "PAUSED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <Pause className="w-3.5 h-3.5" />
            🔴 PAUSED
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            ✅ COMPLETED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-700 text-slate-300">
            {status}
          </span>
        );
    }
  };

  const getActivityBadge = (type: string) => {
    switch (type) {
      case "EVENT":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">EVENT SIGNAL</span>;
      case "CLASSIFIER_DECISION":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">CLASSIFIER</span>;
      case "AGENT_DECISION":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">AI REASONING</span>;
      case "TOOL_EXECUTION":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">TOOL EXECUTION</span>;
      case "WORKFLOW_STATE":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-300">SYSTEM STATE</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">{type}</span>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Bot className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-white tracking-tight">Order Supervisor</h1>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Agentic Workflow Engine
              </span>
            </div>
            <p className="text-xs text-slate-400">Long-Running Temporal AI Order Employee</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setGuideModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold transition"
          >
            <HelpCircle className="w-4 h-4 text-indigo-400" />
            How It Works
          </button>

          <button
            onClick={() => setNewSupervisorModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            Define Template
          </button>

          <button
            onClick={refreshAll}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg border border-slate-700/50 transition"
            title="Refresh state"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-indigo-400" : ""}`} />
          </button>
          
          <button
            onClick={() => setNewRunModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg font-medium text-xs shadow-md shadow-indigo-600/25 transition"
          >
            <Plus className="w-4 h-4" />
            Start Order Workflow
          </button>
        </div>
      </header>

      {/* Optional Signal Toast Notification Banner */}
      {eventToast && (
        <div className="bg-indigo-900/80 border-b border-indigo-500/40 text-indigo-200 text-xs px-6 py-2 flex items-center justify-between font-mono animate-pulse">
          <span className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> {eventToast}
          </span>
          <button onClick={() => setEventToast(null)} className="hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Quick intro banner */}
      <div className="px-6 py-4 max-w-[1700px] mx-auto w-full">
        <div className="glass-panel p-5 rounded-3xl border border-slate-800 shadow-lg shadow-slate-950/30">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-indigo-300 font-semibold">
                <Brain className="w-4 h-4 text-indigo-400" /> Order Supervisor
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-white max-w-2xl">A long-running AI supervisor for order lifecycle management.</h2>
              <p className="text-sm text-slate-300 max-w-3xl">
                Start one workflow per order, inject lifecycle events, and let the AI decide when to act, sleep, or wake later. The dashboard shows real-time status, timeline, memory, and final run learnings.
              </p>
            </div>
            <div className="rounded-3xl bg-slate-950/80 border border-slate-800 p-4 text-xs text-slate-300 space-y-3">
              <div className="font-semibold text-slate-100">Quick start</div>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-300">1</span>
                  <span>Choose a supervisor template and start a workflow run.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300">2</span>
                  <span>Send events or instructions into the live run.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-300">3</span>
                  <span>Watch the agent decide, execute tools, and produce final feedback.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-[1700px] mx-auto w-full">
        
        {/* Left Column: Order Supervisor Runs (Col-span 4) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="glass-panel p-4 rounded-xl flex items-center justify-between">
            <h2 className="font-semibold text-sm text-slate-200 flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-400" />
              Order Supervisor Runs
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-xs bg-slate-800 text-indigo-300 font-mono">
                {runs.length}
              </span>
            </h2>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-[calc(100vh-180px)] pr-1">
            {runs.length === 0 ? (
              <div className="glass-card p-8 rounded-xl text-center">
                <Bot className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No active order runs found.</p>
                <button
                  onClick={() => setNewRunModalOpen(true)}
                  className="mt-3 text-xs text-indigo-400 hover:underline font-medium"
                >
                  Start your first order workflow
                </button>
              </div>
            ) : (
              runs.map((r) => {
                const isSelected = r.id === selectedRunId;
                return (
                  <div
                    key={r.id}
                    onClick={async () => {
                      setSelectedRunId(r.id);
                      await loadRunDetails(r.id);
                    }}
                    className={`glass-card p-4 rounded-xl cursor-pointer transition border ${
                      isSelected
                        ? "border-indigo-500/80 bg-indigo-950/20 shadow-lg shadow-indigo-500/10"
                        : "border-slate-800/80 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-white">#{r.order_id}</span>
                        {r.customer_info?.vip_status && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            VIP
                          </span>
                        )}
                      </div>
                      {getStatusBadge(r.status, r.id)}
                    </div>

                    <p className="text-xs text-slate-300 mb-1 font-medium">
                      {r.order_details?.item || "Order Items"}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Customer: {r.customer_info?.name || "Customer"}</span>
                      <span className="font-mono text-slate-300">${r.order_details?.total_amount}</span>
                    </div>

                    {r.next_wakeup_at && r.status === "SLEEPING" && (
                      <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-indigo-300 font-mono">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-indigo-400" /> Scheduled Wakeup:
                        </span>
                        <span>{new Date(r.next_wakeup_at).toLocaleTimeString()}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Order Run Details Control Center (Col-span 8) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {!currentRun ? (
            <div className="glass-panel p-12 rounded-xl text-center flex flex-col items-center justify-center min-h-[500px]">
              <Brain className="w-12 h-12 text-indigo-400 mb-3 animate-pulse" />
              <h3 className="text-lg font-semibold text-white mb-1">Select an Order Supervisor Run</h3>
              <p className="text-sm text-slate-400 max-w-md">
                Select an order run from the left panel to inspect its real-time agent state, inject signals, add runtime instructions, and view the chronological timeline.
              </p>
            </div>
          ) : (
            <>
              {/* Header & Controls Bar */}
              <div className="glass-panel p-5 rounded-xl flex flex-wrap items-center justify-between gap-4 border border-slate-800">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-bold text-white font-mono">Order #{currentRun.order_id}</h2>
                    {getStatusBadge(currentRun.status, currentRun.id)}
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-2">
                    <span>Workflow Run ID: <code className="text-indigo-300 font-mono">{currentRun.id}</code></span>
                    <span>•</span>
                    <span>Started: {new Date(currentRun.created_at).toLocaleTimeString()}</span>
                  </p>
                </div>

                {/* Lifecycle Action Buttons */}
                <div className="flex items-center gap-2">
                  {currentRun.status === "PAUSED" ? (
                    <button
                      onClick={handleResume}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold transition"
                    >
                      <Play className="w-3.5 h-3.5" /> Resume Run
                    </button>
                  ) : currentRun.status !== "COMPLETED" && currentRun.status !== "TERMINATED" ? (
                    <button
                      onClick={handlePause}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-semibold transition"
                    >
                      <Pause className="w-3.5 h-3.5" /> Interrupt / Pause
                    </button>
                  ) : null}

                  {currentRun.status !== "COMPLETED" && currentRun.status !== "TERMINATED" && (
                    <button
                      onClick={handleTerminate}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-semibold transition"
                    >
                      <Square className="w-3.5 h-3.5" /> Terminate
                    </button>
                  )}
                </div>
              </div>

              {/* End-of-Run Summary (If Completed) */}
              {currentRun.status === "COMPLETED" && currentRun.final_summary && (
                <div className="glass-panel p-6 rounded-xl border border-cyan-500/30 bg-cyan-950/20 space-y-4">
                  <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
                    <Sparkles className="w-5 h-5 text-cyan-400" />
                    End-of-Run Final Summary & Learnings
                  </div>

                  <p className="text-sm text-slate-200 leading-relaxed font-medium">
                    {currentRun.final_summary.final_summary}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="glass-card p-4 rounded-lg">
                      <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Brain className="w-3.5 h-3.5 text-indigo-400" /> Key Operational Learnings
                      </h4>
                      <ul className="space-y-1.5">
                        {currentRun.final_summary.key_learnings?.map((l, i) => (
                          <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                            <span className="text-indigo-400 font-bold">•</span> {l}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="glass-card p-4 rounded-lg">
                      <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Actionable Recommendations
                      </h4>
                      <ul className="space-y-1.5">
                        {currentRun.final_summary.recommendations?.map((r, i) => (
                          <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                            <span className="text-emerald-400 font-bold">✓</span> {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Event Simulator Sandbox Panel */}
              <div className="glass-panel p-5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    Event Signal Injector Sandbox
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Inject signals into live workflow</span>
                    <button
                      onClick={() => setShowEventInfo((s) => !s)}
                      title="Quick info about injector"
                      className="text-xs text-slate-400 hover:text-white bg-slate-800/40 px-2 py-1 rounded"
                    >
                      i
                    </button>
                  </div>
                </div>

                {showEventInfo && (
                  <div className="mb-3 text-xs text-slate-300 p-3 bg-slate-900/60 rounded border border-slate-800">
                    <strong className="text-sm text-white">Injector Quick Guide:</strong>
                    <ul className="mt-2 space-y-1 pl-4 list-disc">
                      <li>Use preset buttons to simulate order events (payment, shipment, delay, delivery).</li>
                      <li>On anomaly events (e.g., shipment_delayed) the classifier wakes the agent immediately.</li>
                      <li>The UI optimistically shows the run as <span className="font-semibold">ACTIVE</span> while processing.</li>
                      <li>If you want to add custom instructions, use the runtime instruction bar below.</li>
                    </ul>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleInjectPresetEvent("payment_confirmed")}
                    className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-emerald-400" /> Payment Confirmed
                  </button>

                  <button
                    onClick={() => handleInjectPresetEvent("shipment_created", { carrier: "FedEx", tracking: "FX-99218" })}
                    className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
                  >
                    <Truck className="w-3.5 h-3.5 text-indigo-400" /> Shipment Created
                  </button>

                  <button
                    onClick={() => handleInjectPresetEvent("shipment_delayed", { delay_reason: "Severe Weather Anomaly", delay_hours: 24 })}
                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-medium transition flex items-center gap-1.5 font-bold animate-pulse"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> 🚨 Shipment Delayed
                  </button>

                  <button
                    onClick={() => handleInjectPresetEvent("customer_message_received", { message: "When will my package arrive?" })}
                    className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-purple-400" /> Customer Inquiry
                  </button>

                  <button
                    onClick={() => handleInjectPresetEvent("delivered")}
                    className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Order Delivered
                  </button>
                </div>
              </div>

              {/* Dynamic Runtime Instructions Prompt Bar */}
              <div className="glass-panel p-4 rounded-xl border border-slate-800">
                <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-400" /> Add Dynamic Runtime Instruction Signal
                </h3>

                <form onSubmit={handleAddInstruction} className="flex gap-2">
                  <input
                    type="text"
                    value={instructionInput}
                    onChange={(e) => setInstructionInput(e.target.value)}
                    placeholder="e.g. If shipment is delayed, offer a 15% discount code to customer immediately."
                    className="flex-1 bg-slate-900/80 border border-slate-700/80 rounded-lg px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" /> Signal Instruction
                  </button>
                </form>

                {currentRun.custom_instructions && currentRun.custom_instructions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {currentRun.custom_instructions.map((inst, idx) => (
                      <span key={idx} className="text-[11px] px-2.5 py-1 rounded bg-slate-800 text-indigo-200 border border-slate-700 flex items-center gap-1">
                        ⚡ {inst}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Rolling Memory & Timeline Section */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Memory Summary Card (Col 4) */}
                <div className="lg:col-span-4 glass-panel p-4 rounded-xl border border-slate-800 flex flex-col gap-3">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-400" /> Compact Rolling Memory
                  </h3>
                  <div className="glass-card p-3 rounded-lg flex-1 font-mono text-xs text-indigo-200 leading-relaxed overflow-y-auto max-h-[350px]">
                    {currentRun.memory?.rolling_summary || "No memory recorded."}
                  </div>
                </div>

                {/* Chronological Interactive Timeline Feed (Col 8) */}
                <div className="lg:col-span-8 glass-panel p-4 rounded-xl border border-slate-800 flex flex-col gap-3">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <ActivityIcon className="w-4 h-4 text-emerald-400" /> Chronological Timeline & Audit Trail
                  </h3>

                  <div className="space-y-3 overflow-y-auto max-h-[350px] pr-1">
                    {(!currentRun.activities || currentRun.activities.length === 0) ? (
                      <p className="text-xs text-slate-500 italic p-4 text-center">No timeline events recorded yet.</p>
                    ) : (
                      currentRun.activities.map((act) => (
                        <div key={act.id} className="glass-card p-3.5 rounded-lg border border-slate-800/80">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              {getActivityBadge(act.type)}
                              <span className="font-semibold text-xs text-white">{act.title}</span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">
                              {new Date(act.created_at).toLocaleTimeString()}
                            </span>
                          </div>

                          <p className="text-xs text-slate-300 leading-relaxed font-sans">{act.description}</p>

                          {act.activity_metadata && Object.keys(act.activity_metadata).length > 0 && (
                            <div className="mt-2 p-2 bg-slate-950/60 rounded border border-slate-800 text-[11px] font-mono text-slate-400">
                              <pre className="whitespace-pre-wrap">{JSON.stringify(act.activity_metadata, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </>
          )}
        </div>
      </div>

      {/* Guide Modal: How This System Works */}
      {guideModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl max-w-2xl w-full border border-indigo-500/30 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Info className="w-5 h-5 text-indigo-400" /> How The AI Order Supervisor System Works
              </h3>
              <button onClick={() => setGuideModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="glass-card p-3.5 rounded-lg border border-slate-800">
                <h4 className="font-bold text-white text-sm mb-1 flex items-center gap-1.5">
                  1. Long-Running Temporal Workflow (Workflow Manager)
                </h4>
                <p>
                  Each order spawns a persistent Temporal workflow execution (e.g. <code>order-workflow-ORD-9082</code>). Unlike chatbots that terminate after a response, this workflow stays alive throughout the order lifecycle.
                </p>
              </div>

              <div className="glass-card p-3.5 rounded-lg border border-slate-800">
                <h4 className="font-bold text-purple-300 text-sm mb-1 flex items-center gap-1.5">
                  2. Lightweight Event Wake-up Classifier
                </h4>
                <p>
                  When an event arrives, a lightweight classifier checks its urgency. Routine events (e.g., <code>payment_confirmed</code>) keep the workflow sleeping to save LLM tokens. Anomaly events (e.g., <code>shipment_delayed</code>) wake the agent immediately!
                </p>
              </div>

              <div className="glass-card p-3.5 rounded-lg border border-slate-800">
                <h4 className="font-bold text-indigo-300 text-sm mb-1 flex items-center gap-1.5">
                  3. Agent Reasoning & Tool Calls (Brain & Hands)
                </h4>
                <p>
                  When woken, the LLM agent analyzes the order context, rolling memory, and dynamic instructions. It outputs a structured JSON decision and triggers business tools like <code>message_logistics_team</code> and <code>message_customer</code>.
                </p>
              </div>

              <div className="glass-card p-3.5 rounded-lg border border-slate-800">
                <h4 className="font-bold text-emerald-300 text-sm mb-1 flex items-center gap-1.5">
                  4. Dynamic Runtime Instruction Signals
                </h4>
                <p>
                  You can type new instructions (e.g., <em>"If shipment is delayed, offer a 15% discount code"</em>) into live running workflows without interrupting or resetting state!
                </p>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setGuideModalOpen(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-xs"
              >
                Got It! Take Me To Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start New Run Modal */}
      {newRunModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl max-w-md w-full border border-slate-700 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-400" /> Start New Order Supervisor Workflow
            </h3>

            <form onSubmit={handleStartNewRun} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Order ID</label>
                <input
                  type="text"
                  value={newOrderId}
                  onChange={(e) => setNewOrderId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Select Supervisor Template</label>
                <select
                  value={selectedSupervisorId}
                  onChange={(e) => setSelectedSupervisorId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                >
                  {supervisors.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.wake_sensitivity} Sensitivity)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">VIP Status</label>
                  <select
                    value={isVip ? "yes" : "no"}
                    onChange={(e) => setIsVip(e.target.value === "yes")}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="yes">VIP Customer (True)</option>
                    <option value="no">Standard Customer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Order Item</label>
                <input
                  type="text"
                  value={orderItem}
                  onChange={(e) => setOrderItem(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewRunModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg text-xs font-semibold shadow-md"
                >
                  Spawn Workflow Run
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Define Custom Supervisor Template Modal */}
      {newSupervisorModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl max-w-md w-full border border-slate-700 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-400" /> Define Custom Supervisor Setup
            </h3>

            <form onSubmit={handleCreateSupervisor} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Supervisor Template Name</label>
                <input
                  type="text"
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Base Instruction Prompt</label>
                <textarea
                  value={supInstruction}
                  onChange={(e) => setSupInstruction(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Wake-up Guidance & Sensitivity</label>
                <select
                  value={supSensitivity}
                  onChange={(e) => setSupSensitivity(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="HIGH">HIGH (Wake on routine & minor events)</option>
                  <option value="MEDIUM">MEDIUM (Wake on operational delays & anomalies)</option>
                  <option value="LOW">LOW (Wake only on severe delays & delivery)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewSupervisorModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
