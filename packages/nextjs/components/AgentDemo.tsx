"use client";

import { useState, useRef, useEffect } from "react";
import BudgetMeter from "./BudgetMeter";
import ActivityFeed from "./ActivityFeed";
import type { AgentEventType, ActivityEntry } from "~~/types";
import { Bot, Keyboard, Hexagon, FileText, Check, X, Zap, Link as LinkIcon } from "lucide-react";

const BUDGET_TOTAL = 5.0;

const PRESET_TASKS = [
  "ETH price →",
  "Morning briefing →",
  "Analyse Vitalik's wallet →",
];

type AgentStatus = "idle" | "running" | "done";

// Simulated demo sequence — each step resolves after `delay` ms
function buildDemoSequence(task: string): { delay: number; event: AgentEventType }[] {
  const isWalletTask = task.toLowerCase().includes("wallet");
  const isMorning = task.toLowerCase().includes("morning");

  return [
    {
      delay: 600,
      event: {
        type: "thinking",
        content: isWalletTask
          ? "Analyzing wallet address. Will query on-chain transaction history and token balances."
          : isMorning
          ? "Morning briefing requested. Will fetch crypto prices and weather data from separate MCPs."
          : "Analyzing request. Requires real-time token pricing data. Querying Tollgate directory.",
      },
    },
    {
      delay: 1800,
      event: {
        type: "manifest_fetch",
        service: "crypto.tollgate.eth",
        tools: [
          { name: "get_price", price: "0.01 USDC" },
          { name: "get_trending", price: "0.01 USDC" },
          { name: "get_market_data", price: "0.02 USDC" },
        ],
      },
    },
    {
      delay: 2800,
      event: { type: "price_check", price: "0.01 USDC", manifestPrice: "0.01 USDC", match: true },
    },
    {
      delay: 3600,
      event: {
        type: "payment",
        amount: "0.01 USDC",
        service: "crypto.tollgate.eth",
        tool: "get_price",
        txHash: "0x8f7a…3b92",
      },
    },
    {
      delay: 4600,
      event: { type: "validation", passed: true, fieldCount: 5 },
    },
    ...(isMorning
      ? [
          {
            delay: 5200,
            event: {
              type: "manifest_fetch" as const,
              service: "weather.tollgate.eth",
              tools: [{ name: "get_forecast", price: "0.01 USDC" }],
            },
          },
          {
            delay: 6000,
            event: {
              type: "payment" as const,
              amount: "0.01 USDC",
              service: "weather.tollgate.eth",
              tool: "get_forecast",
              txHash: "0xc3d1…7ef4",
            },
          },
          {
            delay: 6800,
            event: { type: "validation" as const, passed: true, fieldCount: 4 },
          },
        ]
      : []),
    {
      delay: isMorning ? 7600 : 5600,
      event: {
        type: "result",
        content: isMorning
          ? "Morning briefing: ETH is at $3,247.82 (↓2.1%). NYC weather: 68°F, partly cloudy. Top mover: SOL +5.4%."
          : isWalletTask
          ? "Vitalik's wallet holds 244.5 ETH ($793,847). Last 30-day activity: 12 transactions, primarily ENS interactions."
          : "ETH is currently trading at $3,247.82 USD, down 2.1% in the last 24 hours. Volume: $14.2B.",
        summary: isMorning
          ? "2 MCPs · 2 tool calls · 2/2 validated ✓ · 0.02 USDC spent · $4.98 remaining"
          : "1 MCP · 1 tool call · 1/1 validated ✓ · 0.01 USDC spent · $4.99 remaining",
      },
    },
  ];
}

export default function AgentDemo() {
  const [task, setTask] = useState("");
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [events, setEvents] = useState<AgentEventType[]>([]);
  const [spent, setSpent] = useState(0);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [expandedManifest, setExpandedManifest] = useState<number | null>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [events]);

  function clearTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }

  function runAgent(taskText: string) {
    if (!taskText.trim()) return;
    clearTimers();
    setEvents([]);
    setStatus("running");
    setSpent(0);
    setActivity([]);

    const sequence = buildDemoSequence(taskText);
    let totalSpent = 0;

    sequence.forEach(({ delay, event }) => {
      const t = setTimeout(() => {
        setEvents((prev) => [...prev, event]);

        if (event.type === "payment") {
          const amount = parseFloat(event.amount.replace(" USDC", ""));
          totalSpent += amount;
          setSpent(totalSpent);
          setActivity((prev) => [
            {
              id: `${Date.now()}-${Math.random()}`,
              service: event.service,
              tool: event.tool,
              amount: event.amount,
              validated: false,
              txHash: event.txHash,
              time: "just now",
            },
            ...prev,
          ]);
        }

        if (event.type === "validation" && event.passed) {
          setActivity((prev) =>
            prev.map((a, i) => (i === 0 ? { ...a, validated: true } : a))
          );
        }

        if (event.type === "result") {
          setStatus("done");
        }
      }, delay);
      timersRef.current.push(t);
    });
  }

  const callCount = activity.length;

  return (
    <div className="space-y-6">
      {/* ── Task input ── */}
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 bg-white border border-border-strong rounded-xl px-4 py-3 shadow-card focus-within:border-primary focus-within:ring-2 focus-within:ring-accent-indigo-light transition-all">
          <Bot className="w-5 h-5 text-text-muted shrink-0 mx-2" />
          <input
            value={task}
            onChange={(e) => setTask(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runAgent(task)}
            placeholder="Try: 'Give me a morning briefing with top crypto and NYC weather'"
            className="flex-1 bg-transparent border-none outline-none text-sm text-text-primary placeholder:text-text-muted"
          />
          <button
            onClick={() => runAgent(task)}
            disabled={status === "running"}
            className="bg-primary hover:bg-primary-dark text-white text-sm font-medium px-5 py-2 rounded-md transition-colors shrink-0 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {status === "running" ? (
              <>
                <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Running
              </>
            ) : (
              "Execute ▶"
            )}
          </button>
        </div>

        {/* Preset pills */}
        <div className="flex flex-wrap gap-2 mt-3">
          {PRESET_TASKS.map((preset) => (
            <button
              key={preset}
              onClick={() => {
                const clean = preset.replace(" →", "");
                setTask(clean);
                runAgent(clean);
              }}
              className="text-xs bg-surface-subtle border border-border-light text-text-secondary px-3 py-1.5 rounded-full hover:bg-accent-indigo-light hover:border-[#C7D2FE] hover:text-primary-dark transition-colors"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* ── Split layout ── */}
      <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-5">
        {/* ── LEFT: Agent reasoning ── */}
        <div className="flex flex-col bg-white border border-border-light rounded-xl shadow-card overflow-hidden" style={{ height: "600px" }}>
          {/* Panel header */}
          <div className="px-5 py-3.5 bg-surface-subtle border-b border-border-light flex items-center justify-between shrink-0">
            <h2 className="font-semibold text-sm text-text-primary flex items-center gap-2">
              <Keyboard className="w-4 h-4 text-primary" />
              Agent Monologue
            </h2>
            <div
              className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                status === "running"
                  ? "bg-accent-emerald-bg text-on-secondary-container"
                  : status === "done"
                  ? "bg-accent-indigo-light text-primary"
                  : "bg-surface-hover text-text-muted"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  status === "running"
                    ? "bg-on-secondary-container animate-pulse"
                    : status === "done"
                    ? "bg-primary"
                    : "bg-text-muted"
                }`}
              />
              {status === "running" ? "Running" : status === "done" ? "Done" : "Idle"}
            </div>
          </div>

          {/* Event stream */}
          <div ref={streamRef} className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-hide">
            {events.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-10 gap-3">
                <Hexagon className="w-8 h-8 opacity-20 text-text-muted" />
                <p className="text-sm text-text-secondary">Run a task above</p>
              </div>
            )}

            {events.map((event, i) => {
              if (event.type === "thinking") {
                return (
                  <div key={i} className="relative pl-5 border-l-2 border-border-strong bg-surface-subtle rounded-r-lg px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-1">Thinking</p>
                    <p className="text-sm text-text-secondary italic">{event.content}</p>
                  </div>
                );
              }

              if (event.type === "manifest_fetch") {
                const isExpanded = expandedManifest === i;
                return (
                  <div key={i} className="relative pl-5 border-l-2 border-[#F59E0B] bg-accent-amber-bg/40 rounded-r-lg px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#92400E] mb-1">Reading manifest</p>
                    <p className="font-mono text-xs text-text-primary flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-text-secondary" /> {event.service}
                    </p>
                    <button
                      onClick={() => setExpandedManifest(isExpanded ? null : i)}
                      className="text-[10px] text-primary mt-1 hover:underline"
                    >
                      {isExpanded ? "Hide tools ↑" : "Show tools ↓"}
                    </button>
                    {isExpanded && (
                      <div className="mt-2 bg-white border border-border-light rounded-md p-2 space-y-1">
                        {event.tools.map((t) => (
                          <div key={t.name} className="flex justify-between font-mono text-xs">
                            <span className="text-text-primary">{t.name}</span>
                            <span className="text-[#F59E0B] font-semibold">{t.price}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              if (event.type === "price_check") {
                return (
                  <div key={i} className="relative pl-5 border-l-2 border-on-secondary-container bg-accent-emerald-bg/40 rounded-r-lg px-3 py-2">
                    <div className="font-mono text-xs text-on-secondary-container flex items-center gap-1.5">
                      {event.match ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-accent-red" />} Price confirmed: {event.price} (manifest: {event.manifestPrice}, 402 challenge: {event.price})
                    </div>
                  </div>
                );
              }

              if (event.type === "payment") {
                return (
                  <div key={i} className="relative pl-5 border-l-2 border-primary bg-accent-indigo-light/50 rounded-r-lg px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-primary-dark mb-1">Payment (TX hash)</p>
                    <p className="font-semibold text-sm text-[#3730A3] flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-primary" /> {event.amount} paid
                    </p>
                    <p className="font-mono text-xs text-text-secondary mt-0.5">
                      {event.service} → {event.tool}
                    </p>
                    <a href="#" className="inline-flex items-center gap-1 mt-1 text-primary font-mono text-xs hover:underline">
                      <LinkIcon className="w-3 h-3" /> {event.txHash}
                    </a>
                  </div>
                );
              }

              if (event.type === "validation") {
                return (
                  <div
                    key={i}
                    className={`relative pl-5 border-l-2 rounded-r-lg px-3 py-2 ${
                      event.passed
                        ? "border-on-secondary-container bg-accent-emerald-bg/40"
                        : "border-accent-red bg-red-50"
                    }`}
                  >
                    <p
                      className={`font-mono text-xs flex items-center gap-1.5 ${
                        event.passed ? "text-on-secondary-container" : "text-accent-red"
                      }`}
                    >
                      {event.passed ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      {event.passed
                        ? `Validated: all ${event.fieldCount} required fields present`
                        : `Validation failed: missing [${event.missingFields?.join(", ")}]`}
                    </p>
                  </div>
                );
              }

              if (event.type === "result") {
                return (
                  <div key={i}>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-1.5">Agent</p>
                    <p className="text-sm text-text-primary leading-relaxed">{event.content}</p>
                    <div className="mt-3 bg-surface-subtle border border-border-light rounded-lg px-3 py-2">
                      <p className="font-mono text-xs text-text-secondary">{event.summary}</p>
                    </div>
                  </div>
                );
              }

              return null;
            })}

            {/* Running indicator */}
            {status === "running" && (
              <div className="flex items-center gap-1.5 pl-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary bounce-1 inline-block" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary bounce-2 inline-block" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary bounce-3 inline-block" />
              </div>
            )}
          </div>

          {/* Budget meter at bottom of left panel */}
          <div className="px-5 py-3.5 bg-surface-subtle border-t border-border-light shrink-0">
            <BudgetMeter total={BUDGET_TOTAL} spent={spent} compact />
          </div>
        </div>

        {/* ── RIGHT: Budget card + Activity feed ── */}
        <div className="flex flex-col gap-4 h-[600px]">
          <div className="shrink-0">
            <BudgetMeter total={BUDGET_TOTAL} spent={spent} callCount={callCount} />
          </div>
          <div className="flex-1 min-h-0">
            <ActivityFeed entries={activity} />
          </div>
        </div>
      </div>
    </div>
  );
}
