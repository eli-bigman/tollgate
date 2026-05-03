"use client";

import { useState, useRef, useEffect } from "react";
import BudgetMeter from "./BudgetMeter";
import ActivityFeed from "./ActivityFeed";
import type { AgentEventType, ActivityEntry } from "~~/types";
import { Bot, Keyboard, Hexagon, FileText, Check, X, Zap, Link as LinkIcon } from "lucide-react";

const BUDGET_TOTAL = 5.0;

const PRESET_TASKS = [
  "ETH price →",
  "What are the trending tokens? →",
  "Full market data for bitcoin →",
];

type AgentStatus = "idle" | "running" | "done" | "error";

// Maps raw agent SSE events into the UI AgentEventType shape
function mapAgentEvent(raw: Record<string, unknown>): AgentEventType | null {
  const type = raw.type as string;
  const data = raw.data as Record<string, unknown> | undefined;

  if (type === "thinking" && data?.text) {
    return { type: "thinking", content: String(data.text) };
  }

  if (type === "manifest_fetched" && data) {
    return {
      type: "manifest_fetch",
      service: String(data.ens ?? data.url ?? ""),
      tools: (data.tools as Array<{ name: string; price: string }> | undefined ?? []).map(t => ({
        name: t.name,
        price: `${t.price} ETH`,
      })),
    };
  }

  if (type === "price_check" && data) {
    return {
      type: "price_check",
      price: String(data.price ?? ""),
      manifestPrice: String(data.manifestPrice ?? ""),
      match: data.match === true,
    };
  }

  if (type === "payment_required" && data) {
    return {
      type: "payment_required",
      paymentId:  String(data.paymentId ?? ""),
      payee:      String(data.payee ?? ""),
      amountEth: String(data.amountEth ?? ""),
      amountMicro: String(data.amountMicro ?? ""),
      token:      String(data.token ?? ""),
      toolName:   String(data.toolName ?? ""),
      mcpName:    String(data.mcpName ?? ""),
    };
  }

  if (type === "payment" && data) {
    return {
      type: "payment",
      amount: `${data.amount} ETH`,
      service: String(data.mcp ?? ""),
      tool: String(data.tool ?? ""),
      txHash: String(data.txHash ?? ""),
    };
  }

  if (type === "validation" && data) {
    const valid = data.valid === true;
    return {
      type: "validation",
      passed: valid,
      fieldCount: undefined,
      missingFields: valid ? [] : (data.summary as string ?? "").match(/missing: \[([^\]]*)\]/)?.[1]?.split(", ") ?? [],
    };
  }

  if (type === "result" && data) {
    const answer = String(data.answer ?? "");
    const spent = data.totalSpent as number ?? 0;
    const calls = data.calls as number ?? 0;
    return {
      type: "result",
      content: answer,
      summary: `${calls} call${calls !== 1 ? "s" : ""} · ${calls}/${calls} validated ✓ · ${spent.toFixed(4)} ETH spent`,
    };
  }

  if (type === "error" && data?.message) {
    return { type: "thinking", content: `⚠️ ${String(data.message)}` };
  }

  return null;
}

export default function AgentDemo() {
  const [task, setTask] = useState("");
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [events, setEvents] = useState<AgentEventType[]>([]);
  const [spent, setSpent] = useState(0);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [expandedManifest, setExpandedManifest] = useState<number | null>(null);
  const [expandedThinking, setExpandedThinking] = useState<Set<number>>(new Set());
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const streamRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (streamRef.current) {
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }
  }, [events]);

  useEffect(() => {
    const fetchBal = async () => {
      const eth = (window as unknown as { ethereum?: any }).ethereum;
      if (eth) {
        try {
          const accounts = await eth.request({ method: "eth_accounts" });
          if (accounts && accounts.length > 0) {
            const balHex = await eth.request({ method: "eth_getBalance", params: [accounts[0], "latest"] });
            const balEth = parseInt(balHex, 16) / 1e18;
            setWalletBalance(balEth);
          }
        } catch {}
      }
    };
    fetchBal();
    const interval = setInterval(fetchBal, 10000);
    return () => clearInterval(interval);
  }, []);

  // Poll activity feed every 2s while running
  useEffect(() => {
    if (status !== "running") return;
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/activity");
        if (!res.ok) return;
        const entries = await res.json() as Array<{
          id: string; mcp: string; tool: string; amount: string; validated: boolean; timestamp: number; txHash: string;
        }>;
        setActivity(
          entries.map(e => ({
            id: e.id,
            service: e.mcp,
            tool: e.tool,
            amount: `${e.amount} ETH`,
            validated: e.validated,
            txHash: e.txHash || "0x0000000000000000000000000000000000000000000000000000000000000000",
            time: new Date(e.timestamp).toLocaleTimeString(),
          }))
        );
      } catch { /* ignore */ }
    }, 2000);
    return () => clearInterval(id);
  }, [status]);

  async function handleMetaMaskPayment(payment: Extract<AgentEventType, { type: "payment_required" }>) {
    const eth = (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
    if (!eth) {
      setPaymentError("MetaMask not found. Please install MetaMask to pay.");
      return;
    }

    setPaymentError(null);

    try {
      await eth.request({ method: "eth_requestAccounts" });

      // Switch to Base Sepolia (chainId 84532 = 0x14a34)
      try {
        await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x14a34" }] });
      } catch (switchErr: unknown) {
        if ((switchErr as { code?: number }).code === 4902) {
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: "0x14a34",
              chainName: "Base Sepolia",
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://sepolia.base.org"],
              blockExplorerUrls: ["https://sepolia.basescan.org"],
            }],
          });
        } else {
          throw switchErr;
        }
      }

      // FORCE native ETH to simplify the demo and bypass old token requirements
      const isNative = true;
      const toAddr = payment.payee;
      
      const amountEthFloat = parseFloat(payment.amountEth || "0.01");
      const amountWei = BigInt(Math.floor(amountEthFloat * 1e18));
      const amountHex = "0x" + amountWei.toString(16);

      const accounts = await eth.request({ method: "eth_accounts" }) as string[];
      const from = accounts[0];

      const txHash = await eth.request({
        method: "eth_sendTransaction",
        params: [{ from, to: toAddr, value: amountHex, chainId: "0x14a34" }],
      }) as string;

      // Notify backend — agent will resume with this txHash
      await fetch("/api/agent/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: payment.paymentId, txHash }),
      });

      setSpent(prev => prev + parseFloat(payment.amountEth));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("User rejected") && !msg.includes("user rejected")) {
        setPaymentError(`Payment failed: ${msg}`);
      }
    }
  }

  async function runAgent(taskText: string) {
    if (!taskText.trim()) return;

    // Cancel any in-flight stream
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setEvents([]);
    setStatus("running");
    setSpent(0);
    setActivity([]);
    setExpandedManifest(null);
    setExpandedThinking(new Set());
    setPaymentError(null);

    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: taskText }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        setStatus("error");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          let parsed: Record<string, unknown>;
          try {
            parsed = JSON.parse(raw);
          } catch {
            continue;
          }

          const uiEvent = mapAgentEvent(parsed);
          if (!uiEvent) continue;

          setEvents(prev => [...prev, uiEvent]);

          if (uiEvent.type === "payment_required") {
            // Trigger MetaMask immediately — backend is waiting for /api/agent/payment
            handleMetaMaskPayment(uiEvent).catch(() => {});
          }

          if (uiEvent.type === "payment") {
            const amount = parseFloat(uiEvent.amount.replace(" ETH", ""));
            setSpent(prev => prev + amount);
          }

          if (uiEvent.type === "result") {
            setStatus("done");
          }
        }
      }

      if (status === "running") setStatus("done");
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        setStatus("error");
      }
    }
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
            placeholder="Try: 'What is the current ETH price?' or 'Get trending tokens'"
            className="flex-1 bg-transparent border-none outline-none text-sm text-text-primary placeholder:text-text-muted"
          />
          <button
            type="button"
            onClick={() => {
              if (status === "running") {
                abortRef.current?.abort();
                setStatus("idle");
              } else {
                runAgent(task);
              }
            }}
            className="bg-primary hover:bg-primary-dark text-white text-sm font-medium px-5 py-2 rounded-md transition-colors shrink-0 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {status === "running" ? (
              <>
                <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Stop
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
              type="button"
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
        <div className="flex flex-col bg-white border border-border-light rounded-xl shadow-card overflow-hidden h-[600px]">
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
                  : status === "error"
                  ? "bg-red-50 text-red-600"
                  : "bg-surface-hover text-text-muted"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  status === "running"
                    ? "bg-on-secondary-container animate-pulse"
                    : status === "done"
                    ? "bg-primary"
                    : status === "error"
                    ? "bg-red-500"
                    : "bg-text-muted"
                }`}
              />
              {status === "running" ? "Running" : status === "done" ? "Done" : status === "error" ? "Error" : "Idle"}
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
                const isExpanded = expandedThinking.has(i);
                const text = event.content;
                const isLong = text.length > 160;
                const preview = isLong && !isExpanded ? text.slice(0, 160) + "…" : text;
                return (
                  <div key={i} className="relative pl-5 border-l-2 border-border-strong bg-surface-subtle rounded-r-lg px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setExpandedThinking(prev => {
                        const next = new Set(prev);
                        next.has(i) ? next.delete(i) : next.add(i);
                        return next;
                      })}
                      className="flex items-center gap-1.5 w-full text-left mb-1 group"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted group-hover:text-primary transition-colors">Thinking</p>
                      <span className="text-[10px] text-text-muted group-hover:text-primary ml-auto">{isExpanded ? "↑ collapse" : "↓ expand"}</span>
                    </button>
                    {isExpanded || !isLong ? (
                      <p className="text-sm text-text-secondary italic">{text}</p>
                    ) : (
                      <p className="text-sm text-text-secondary italic">{preview}</p>
                    )}
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
                      type="button"
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
                      {event.match ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-accent-red" />}
                      {" "}Price confirmed: {event.price} (manifest: {event.manifestPrice})
                    </div>
                  </div>
                );
              }

              if (event.type === "payment") {
                return (
                  <div key={i} className="relative pl-5 border-l-2 border-primary bg-accent-indigo-light/50 rounded-r-lg px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-primary-dark mb-1">Payment</p>
                    <p className="font-semibold text-sm text-[#3730A3] flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-primary" /> {event.amount} paid
                    </p>
                    <p className="font-mono text-xs text-text-secondary mt-0.5">
                      {event.service} → {event.tool}
                    </p>
                    <span className="inline-flex items-center gap-1 mt-1 text-primary font-mono text-xs">
                      <LinkIcon className="w-3 h-3" /> {event.txHash}
                    </span>
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
                        ? `Validated: all required fields present`
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
            <BudgetMeter total={walletBalance + spent} spent={spent} compact />
          </div>
        </div>

        {/* ── RIGHT: Budget card + Activity feed ── */}
        <div className="flex flex-col gap-4 h-[600px]">
          <div className="shrink-0">
            <BudgetMeter total={walletBalance + spent} spent={spent} callCount={callCount} />
          </div>
          <div className="flex-1 min-h-0">
            <ActivityFeed entries={activity} />
          </div>
        </div>
      </div>
    </div>
  );
}
