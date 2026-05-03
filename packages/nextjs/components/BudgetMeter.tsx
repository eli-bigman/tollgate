import { CreditCard } from "lucide-react";

type Props = {
  total: number;
  spent: number;
  callCount?: number;
  compact?: boolean;
};

export default function BudgetMeter({ total, spent, callCount, compact = false }: Props) {
  const remaining = Math.max(0, total - spent);
  const pct = total > 0 ? ((total - spent) / total) * 100 : 100;

  if (compact) {
    return (
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-text-secondary">Budget</span>
          <span className="font-mono text-xs text-text-primary">
            ${remaining.toFixed(3)} / ${total.toFixed(2)}
          </span>
        </div>
        <div className="w-full h-1.5 bg-surface-hover rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-border-light rounded-xl p-5 shadow-card hover:border-[#C7D2FE] hover:shadow-card-hover transition-all">
      <div className="flex items-start justify-between mb-5">
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
          <CreditCard className="w-4 h-4" />
          Agent Wallet
        </h3>
        <span className="bg-surface-subtle border border-border-light text-text-secondary font-mono text-[11px] px-2 py-0.5 rounded">
          0x1a…4fE2
        </span>
      </div>

      <div className="mb-1 text-sm text-text-secondary">Available Balance</div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[2rem] font-bold text-text-primary leading-none">{remaining.toFixed(3)}</span>
        <span className="font-mono text-xs text-text-muted">ETH</span>
      </div>

      <div className="mt-3 w-full h-2 bg-border-light rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-4 pt-3 border-t border-border-light flex items-center justify-between">
        <span className="text-sm text-text-secondary">Total Spent</span>
        <span className="font-mono text-xs font-medium text-text-primary">
          {spent.toFixed(3)} ETH
          {callCount !== undefined && (
            <span className="text-text-muted font-normal ml-2">· {callCount} call{callCount !== 1 ? "s" : ""}</span>
          )}
        </span>
      </div>
    </div>
  );
}
