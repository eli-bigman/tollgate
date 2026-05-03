"use client";

import { useState } from "react";
import type { ToolEntry } from "~~/types";

type Props = {
  tools: ToolEntry[];
  manifestUrl: string;
};

export default function ManifestViewer({ tools, manifestUrl }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const firstTool = tools[0];

  return (
    <div className="mt-3">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark transition-colors cursor-pointer"
      >
        <span>📄 View Manifest Schema</span>
        <span className="transition-transform duration-200" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
          ↓
        </span>
      </button>

      {isOpen && firstTool && (
        <div className="mt-2 bg-surface-subtle border border-border-light rounded-lg p-3 text-xs">
          <p className="font-semibold text-text-primary mb-2 font-mono">{firstTool.name}</p>

          {firstTool.inputSchema && (
            <>
              <p className="text-text-muted uppercase tracking-wide text-[10px] mb-1">Input</p>
              <div className="space-y-0.5 mb-3">
                {Object.entries(firstTool.inputSchema).map(([field, schema]) => (
                  <div key={field} className="flex items-center gap-1.5 font-mono">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: schema.required ? "#EF4444" : "#9CA3AF" }}
                    />
                    <span className="text-text-primary">
                      {field}: <span className="text-text-secondary">{schema.type}</span>
                      {schema.required && <span className="text-accent-red ml-1">*</span>}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {firstTool.outputSchema && (
            <>
              <p className="text-text-muted uppercase tracking-wide text-[10px] mb-1">Output</p>
              <div className="space-y-0.5 mb-3">
                {Object.entries(firstTool.outputSchema).map(([field, schema]) => (
                  <div key={field} className="flex items-center gap-1.5 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-secondary-fixed-dim" />
                    <span className="text-text-primary">
                      {field}: <span className="text-text-secondary">{schema.type}</span>
                      <span className="text-on-secondary-container ml-1">✓</span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          <a
            href={manifestUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline text-[11px]"
          >
            View full manifest JSON ↗
          </a>
        </div>
      )}
    </div>
  );
}
