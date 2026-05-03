export type ServiceType = "MCP" | "API";

export type ToolEntry = {
  name: string;
  price: string;
  description?: string;
  inputSchema?: Record<string, { type: string; required: boolean }>;
  outputSchema?: Record<string, { type: string }>;
};

export type Service = {
  ensName: string;
  type: ServiceType;
  description: string;
  tools: ToolEntry[];
  manifestUrl: string;
  isLive: boolean;
};

export type ActivityEntry = {
  id: string;
  service: string;
  tool: string;
  amount: string;
  validated: boolean;
  txHash: string;
  time: string;
};

export type AgentEventType =
  | { type: "thinking"; content: string }
  | { type: "manifest_fetch"; service: string; tools: { name: string; price: string }[] }
  | { type: "price_check"; price: string; manifestPrice: string; match: boolean }
  | { type: "payment_required"; paymentId: string; payee: string; amountUsdc: string; amountMicro: string; token: string; toolName: string; mcpName: string }
  | { type: "payment"; amount: string; service: string; tool: string; txHash: string }
  | { type: "validation"; passed: boolean; fieldCount?: number; missingFields?: string[] }
  | { type: "result"; content: string; summary: string };

export type ManifestData = {
  name?: string;
  type?: string;
  endpoint?: string;
  payment?: { currency: string; amount: string; wallet: string };
  tools?: Array<{
    name: string;
    description?: string;
    price?: string;
    inputSchema?: Record<string, unknown>;
    outputSchema?: Record<string, unknown>;
  }>;
};
