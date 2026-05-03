# TOLLGATE — shared/manifest-types CLAUDE.md

## What This Package Is

The single canonical TypeScript type definitions for the Tollgate Manifest.
Every other package in this monorepo imports from here.
This file is the **foundation** — build it first, nothing else starts until it compiles.

## Your Scope

Work ONLY inside shared/manifest-types/.
Do NOT modify any other package.

## The Types to Export

```typescript
// shared/manifest-types/index.ts

export interface ToolSchema {
  type: "string" | "number" | "boolean" | "array" | "object";
  description?: string;
  required: boolean;
  enum?: string[];
  example?: unknown;
}

export interface ManifestTool {
  name: string;
  description: string;
  price: string;                            // USDC as string e.g. "0.01"
  inputSchema:  Record<string, ToolSchema>;
  outputSchema: Record<string, ToolSchema>;
}

export interface TollgateManifest {
  ens:          string;                     // "crypto.tollgate.eth"
  version:      "1.0";
  description:  string;
  category:     string;
  payee:        string;                     // 0x... wallet
  chain:        "base-sepolia" | "base";
  usdcContract: string;
  defaultPrice: string;
  tools:        ManifestTool[];
  updatedAt:    string;                     // ISO timestamp
}

// Used by the agent after each tool call
export interface ValidationResult {
  valid:            boolean;
  missingFields:    string[];
  wrongTypeFields:  string[];
  summary:          string;
}

// ENS text records stored on each subname
export interface TollgateENSRecord {
  "tollgate:url":         string;
  "tollgate:manifest":    string;
  "tollgate:type":        "mcp" | "api";
  "tollgate:payee":       string;
  "tollgate:description": string;
  "tollgate:category":    string;
  "tollgate:version":     string;
}
```

## Rules

- This file must have ZERO imports (pure types only)
- Export every interface — all packages need them
- Run `npx tsc --noEmit` to verify before telling the orchestrator you are done
- Announce "shared/manifest-types complete" when verified
