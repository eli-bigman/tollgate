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
  price: string;
  inputSchema: Record<string, ToolSchema>;
  outputSchema: Record<string, ToolSchema>;
}

export interface TollgateManifest {
  ens: string;
  version: "1.0";
  description: string;
  category: string;
  payee: string;
  chain: "base-sepolia" | "base";
  usdcContract: string;
  defaultPrice: string;
  tools: ManifestTool[];
  updatedAt: string;
}

export interface ValidationResult {
  valid: boolean;
  missingFields: string[];
  wrongTypeFields: string[];
  summary: string;
}

export interface TollgateENSRecord {
  "tollgate:url": string;
  "tollgate:manifest": string;
  "tollgate:type": "mcp" | "api";
  "tollgate:payee": string;
  "tollgate:description": string;
  "tollgate:category": string;
  "tollgate:version": string;
}
