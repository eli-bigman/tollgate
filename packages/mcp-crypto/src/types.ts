export interface ToolSchema {
  type: "string" | "number" | "boolean" | "array" | "object"
  description?: string
  required: boolean
  enum?: string[]
  example?: unknown
}

export interface ManifestTool {
  name: string
  description: string
  price: string
  inputSchema:  Record<string, ToolSchema>
  outputSchema: Record<string, ToolSchema>
}

export interface TollgateManifest {
  ens:          string
  version:      "1.0"
  description:  string
  category:     string
  payee:        string
  chain:        "base-sepolia" | "base"
  usdcContract: string
  defaultPrice: string
  tools:        ManifestTool[]
  updatedAt:    string
}
