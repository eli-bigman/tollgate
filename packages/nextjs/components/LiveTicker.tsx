"use client";

import { Zap, Check } from "lucide-react";

const TICKER_ITEMS = [
  { service: "crypto.tollgate.eth", tool: "get_price", amount: "0.01 ETH", ago: "2s ago" },
  { service: "weather.tollgate.eth", tool: "get_weather", amount: "0.01 ETH", ago: "7s ago" },
  { service: "chain.tollgate.eth", tool: "get_block", amount: "0.005 ETH", ago: "14s ago" },
  { service: "crypto.tollgate.eth", tool: "get_trending", amount: "0.01 ETH", ago: "21s ago" },
  { service: "weather.tollgate.eth", tool: "get_alerts", amount: "0.02 ETH", ago: "33s ago" },
];

function TickerContent() {
  return (
    <>
      {TICKER_ITEMS.map((item, i) => (
        <span key={i} className="inline-flex items-center gap-1.5 mx-4">
          <Zap className="w-3 h-3 text-[#F59E0B]" />
          <span>{item.service} → {item.tool} → validated</span>
          <Check className="w-3 h-3 text-[#10B981]" />
          <span>→ {item.amount} · {item.ago}</span>
        </span>
      ))}
    </>
  );
}

export default function LiveTicker() {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border-light flex items-center overflow-hidden"
      style={{ height: "36px" }}
    >
      <span className="text-xs text-text-muted px-4 shrink-0 font-medium">Live:</span>
      <div className="flex-1 overflow-hidden">
        <div className="inline-flex whitespace-nowrap items-center animate-marquee font-mono text-[12px] text-text-secondary">
          <TickerContent />
          <TickerContent />
        </div>
      </div>
    </div>
  );
}
