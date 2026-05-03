import ManifestViewer from "./ManifestViewer";
import type { Service } from "~~/types";

type Props = {
  service: Service;
};

const MAX_VISIBLE_TOOLS = 3;

export default function ServiceCard({ service }: Props) {
  const { ensName, type, description, tools, manifestUrl, isLive } = service;
  const visibleTools = tools.slice(0, MAX_VISIBLE_TOOLS);
  const extraCount = tools.length - MAX_VISIBLE_TOOLS;
  const fromPrice = tools.reduce(
    (min, t) => {
      const price = parseFloat(t.price.replace(" USDC", ""));
      return price < min ? price : min;
    },
    parseFloat(tools[0]?.price?.replace(" USDC", "") ?? "0")
  );

  return (
    <div className="bg-white border border-border-light rounded-xl p-card-padding shadow-card hover:border-[#C7D2FE] hover:shadow-card-hover hover:-translate-y-px transition-all flex flex-col gap-4">
      {/* Top row: type badge + live pill */}
      <div className="flex items-center justify-between">
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            type === "MCP"
              ? "bg-accent-indigo-light text-primary-dark"
              : "bg-blue-50 text-blue-700"
          }`}
        >
          {type}
        </span>

        {isLive && (
          <div className="flex items-center gap-1.5 text-xs text-on-secondary-container bg-accent-emerald-bg px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed-dim pulse-dot" />
            Live
          </div>
        )}
      </div>

      {/* ENS name + description */}
      <div>
        <h3 className="font-mono text-sm font-semibold text-text-primary">{ensName}</h3>
        <p className="text-sm text-text-secondary mt-1.5 line-clamp-2">{description}</p>
      </div>

      {/* Tool pricing rows */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-text-muted mb-1.5">Tools &amp; prices</p>
        <div className="space-y-1">
          {visibleTools.map((tool) => (
            <div
              key={tool.name}
              className="flex items-center justify-between bg-surface-subtle rounded-md px-2 py-1.5"
            >
              <span className="font-mono text-xs text-text-primary">{tool.name}</span>
              <span className="font-mono text-xs font-semibold text-[#F59E0B]">{tool.price}</span>
            </div>
          ))}
          {extraCount > 0 && (
            <a href={manifestUrl} target="_blank" rel="noopener noreferrer" className="block text-xs text-primary hover:underline pl-2 pt-0.5">
              + {extraCount} more tool{extraCount > 1 ? "s" : ""} →
            </a>
          )}
        </div>
      </div>

      {/* Manifest viewer toggle */}
      <ManifestViewer tools={tools} manifestUrl={manifestUrl} />

      {/* Bottom: price + connect */}
      <div className="mt-auto pt-3 border-t border-surface-hover flex items-center justify-between">
        <span className="font-mono text-sm font-semibold text-[#F59E0B]">
          from {fromPrice.toFixed(3).replace(/\.?0+$/, "")} USDC / call
        </span>
        <a href={manifestUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
          Connect →
        </a>
      </div>
    </div>
  );
}
