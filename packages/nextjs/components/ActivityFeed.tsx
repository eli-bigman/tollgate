import type { ActivityEntry } from "~~/types";
import { Zap, Check, X } from "lucide-react";

type Props = {
  entries: ActivityEntry[];
};

export default function ActivityFeed({ entries }: Props) {
  return (
    <div className="bg-white border border-border-light rounded-xl overflow-hidden shadow-card flex flex-col">
      {/* Header */}
      <div className="px-5 py-3.5 bg-surface-subtle border-b border-border-light flex items-center justify-between shrink-0">
        <h3 className="font-semibold text-sm text-text-primary">Live Activity Feed</h3>
        <span className="bg-accent-emerald-bg text-on-secondary-container text-[11px] font-semibold px-2 py-0.5 rounded-full">
          Live
        </span>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto max-h-72 divide-y divide-border-light">
        {entries.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <p className="text-sm text-text-secondary">No activity yet</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="px-4 py-3 hover:bg-surface-subtle transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-full bg-accent-indigo-light flex items-center justify-center shrink-0">
                  <Zap className="w-3.5 h-3.5 text-primary-dark" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-xs text-text-primary truncate block">
                    {entry.service}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-text-secondary">
                    {entry.tool}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono text-xs font-semibold text-[#F59E0B]">
                    -{entry.amount}
                  </div>
                  <div
                    className={`text-[10px] font-mono mt-0.5 flex items-center gap-1 justify-end ${
                      entry.validated ? "text-on-secondary-container" : "text-accent-red"
                    }`}
                  >
                    {entry.validated ? <><Check className="w-3 h-3" /> validated</> : <><X className="w-3 h-3" /> failed</>}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pl-9">
                <a
                  href={`https://basescan.org/tx/${entry.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[10px] text-primary hover:underline"
                >
                  {entry.txHash} ↗
                </a>
                <span className="text-[10px] text-text-muted">{entry.time}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="bg-surface-subtle border-t border-border-light px-4 py-2.5 shrink-0">
        <p className="text-[10px] text-text-muted text-center">x402 · Base Sepolia</p>
      </div>
    </div>
  );
}
