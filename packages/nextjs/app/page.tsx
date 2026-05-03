"use client";

import { useState } from "react";
import Link from "next/link";
import ServiceCard from "~~/components/ServiceCard";
import HeroBackground from "~~/components/HeroBackground";
import type { Service, ServiceType } from "~~/types";

const STUB_SERVICES: Service[] = [
  {
    ensName: "crypto.tollgate.eth",
    type: "MCP",
    description: "Real-time cryptocurrency price feeds and historical market data analytics.",
    tools: [
      {
        name: "get_price",
        price: "0.01 USDC",
        inputSchema: { token: { type: "string", required: true } },
        outputSchema: {
          token: { type: "string" },
          price_usd: { type: "number" },
          currency: { type: "string" },
          source: { type: "string" },
          timestamp: { type: "number" },
        },
      },
      { name: "get_trending", price: "0.01 USDC" },
      { name: "get_market_data", price: "0.02 USDC" },
    ],
    manifestUrl: "https://crypto-mcp.example.com/.well-known/tollgate.json",
    isLive: true,
  },
  {
    ensName: "weather.tollgate.eth",
    type: "MCP",
    description: "Global weather forecasts, historical climate data, and active weather alerts.",
    tools: [
      { name: "get_forecast", price: "0.01 USDC" },
      { name: "get_alerts", price: "0.02 USDC" },
    ],
    manifestUrl: "https://weather-mcp.example.com/.well-known/tollgate.json",
    isLive: true,
  },
  {
    ensName: "chain.tollgate.eth",
    type: "MCP",
    description: "On-chain analytics: block data, transaction history, and contract event queries.",
    tools: [
      { name: "get_block", price: "0.005 USDC" },
      { name: "get_tx_history", price: "0.01 USDC" },
      { name: "get_events", price: "0.01 USDC" },
    ],
    manifestUrl: "https://chain-mcp.example.com/.well-known/tollgate.json",
    isLive: true,
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    bg: "#EEF2FF",
    color: "#6366F1",
    title: "Publish under ENS",
    body: "Register your MCP server as crypto.tollgate.eth. The ENS record holds a manifest URL — a machine-readable contract declaring your tools, schemas, and per-call prices.",
  },
  {
    step: "02",
    bg: "#ECFDF5",
    color: "#10B981",
    title: "Agents read the contract first",
    body: "Before paying, agents fetch the Tollgate Manifest. They know exactly what inputs to send, what they'll get back, and how much each tool costs. No surprises.",
  },
  {
    step: "03",
    bg: "#FFFBEB",
    color: "#F59E0B",
    title: "Pay, get data, validate",
    body: "Agents pay per tool call via USDC. The MCP returns data matching the declared schema. The agent validates required fields before using the result. You earn per call.",
  },
];

type Filter = "All" | ServiceType;

export default function HomePage() {
  const [filter, setFilter] = useState<Filter>("All");

  const filtered = STUB_SERVICES.filter((s) => filter === "All" || s.type === filter);

  return (
    <div className="max-w-container mx-auto px-6">
      {/* ── Hero ── */}
      <section className="relative text-center pt-[72px] pb-[140px] flex flex-col items-center">
        <HeroBackground />
        
        {/* Eyebrow pill */}
        <div className="inline-flex items-center gap-2 bg-accent-indigo-light border border-[#C7D2FE] rounded-full px-3 py-1 mb-4">
          <span className="text-xs uppercase tracking-widest font-semibold text-primary-dark">
            MCP Marketplace · Powered by ENS
          </span>
        </div>

        <h1 className="text-4xl font-bold text-text-primary mt-2 tracking-tight">
          The toll road for AI agents
        </h1>

        <p className="text-lg text-text-secondary max-w-lg mt-3 mx-auto leading-relaxed">
          Publish MCP servers under ENS names. Agents discover the manifest, pay per tool call,
          and validate the response — without API keys.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <Link
            href="/register"
            className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-medium text-sm transition-colors"
          >
            Register an MCP →
          </Link>
          <a
            href="#how-it-works"
            className="bg-white border border-border-strong text-text-primary px-6 py-3 rounded-lg font-medium text-sm hover:bg-surface-hover transition-colors"
          >
            How it works ↓
          </a>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-8 mt-11 pt-6 border-t border-border-light">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-2xl font-bold text-text-primary">3</span>
            <span className="text-sm text-text-secondary">MCPs live</span>
          </div>
          <span className="text-border-strong">·</span>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-2xl font-bold font-mono text-[#F59E0B]">0.01 USDC</span>
            <span className="text-sm text-text-secondary">per call</span>
          </div>
          <span className="text-border-strong">·</span>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-2xl font-bold text-on-secondary-container">Base Sepolia</span>
            <span className="text-sm text-text-secondary">testnet</span>
          </div>
        </div>

      </section>

      {/* ── How it Works ── */}
      <section id="how-it-works" className="py-14">
        <h2 className="text-2xl font-bold text-center text-text-primary mb-8">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {HOW_IT_WORKS.map(({ step, bg, color, title, body }) => (
            <div key={step} className="bg-surface-subtle border border-border-light rounded-xl p-6">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold mb-4"
                style={{ backgroundColor: bg, color }}
              >
                {step}
              </div>
              <h3 className="font-semibold text-text-primary text-sm mb-2">{title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Directory ── */}
      <section className="pb-16">
        {/* Section header + filter pills */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-text-primary">Live Services</h2>
          <div className="flex items-center gap-2">
            {(["All", "MCP", "API"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  filter === f
                    ? "bg-primary text-white border-primary"
                    : "bg-white border-border-strong text-text-secondary hover:border-primary hover:text-primary"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Service grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((service) => (
            <ServiceCard key={service.ensName} service={service} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-text-secondary text-sm">
            No services found for this filter.
          </div>
        )}
      </section>
    </div>
  );
}
