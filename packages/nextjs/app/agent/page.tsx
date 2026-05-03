import type { Metadata } from "next";
import AgentDemo from "~~/components/AgentDemo";

export const metadata: Metadata = {
  title: "Agent Demo — Tollgate",
  description: "Watch an autonomous agent discover, pay, and validate Tollgate MCP tool calls in real time.",
};

const MINI_FLOW_STEPS = [
  { icon: "🔍", label: "Discover" },
  { icon: "📄", label: "Read manifest" },
  { icon: "⚡", label: "Pay & call" },
  { icon: "✓", label: "Validate" },
];

export default function AgentPage() {
  return (
    <div className="max-w-container mx-auto px-6 py-[72px] space-y-[72px]">
      {/* Page header */}
      <section className="text-center max-w-3xl mx-auto space-y-3">
        <h1 className="text-4xl font-bold text-text-primary tracking-tight">
          Watch an agent use the manifest
        </h1>
        <p className="text-lg text-text-secondary leading-relaxed">
          The agent reads the contract, confirms prices, pays, and validates data — automatically.
        </p>

        {/* Mini flow diagram */}
        <div className="inline-flex flex-wrap items-center justify-center gap-3 mt-8 bg-surface-subtle border border-border-light rounded-full px-6 py-3 shadow-card">
          {MINI_FLOW_STEPS.map((step, i) => (
            <div key={step.label} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <span>{step.icon}</span>
                <span>{step.label}</span>
              </div>
              {i < MINI_FLOW_STEPS.length - 1 && (
                <span className="text-border-strong text-sm">→</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Agent demo interactive section */}
      <AgentDemo />
    </div>
  );
}
