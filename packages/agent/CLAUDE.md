# TOLLGATE — packages/agent CLAUDE.md (v3 — 0G Compute)

## What This Package Is

The autonomous demo agent for Tollgate. Uses 0G Compute Network (via the Router)
as the LLM backend instead of Anthropic directly — free decentralised inference
from a hackathon sponsor, OpenAI-compatible API.

## Why 0G Compute (Not Anthropic SDK directly)

The 0G Compute Router is an OpenAI-compatible API gateway over decentralised
TEE-backed providers. It uses the same code shape as OpenAI/Anthropic SDK calls
but routes through 0G's compute network. This is a hackathon sponsor — using it
qualifies Tollgate for the 0G prize track (up to $15,000 additional prize pool).

Reference: https://docs.0g.ai/developer-hub/building-on-0g/compute-network/inference
Router quickstart: https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/quickstart

## Your Scope

Work ONLY inside packages/agent/.
Import types from: ../../shared/manifest-types
Do NOT modify shared/ or any other package.

## Prerequisite

shared/manifest-types must be complete before you start.
Build validate-response.ts FIRST and verify its tests pass before building agent.ts.

## 0G Compute Router Setup

The agent uses the 0G Router via the openai npm package (OpenAI-compatible):

```typescript
import OpenAI from "openai"

const client = new OpenAI({
  baseURL: "https://router-api.0g.ai/v1",
  apiKey: process.env.ZEROG_API_KEY,   // sk-... from pc.0g.ai dashboard
})
```

Model to use: `zai-org/GLM-5-FP8` (available on 0G testnet)
Fallback model: check live catalog at https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/models

The SDK call is identical to OpenAI — same messages format, same tool_use shape.

## Files to Build (in this order)

### 1. src/utils/validate-response.ts

Build and test this first before touching anything else.

```typescript
import { ManifestTool, ValidationResult } from '../../../shared/manifest-types'

export function validateResponse(
  toolName: string,
  data: unknown,
  tools: ManifestTool[]
): ValidationResult {
  const tool = tools.find(t => t.name === toolName)

  // Unknown tool — allow through, don't block
  if (!tool) return {
    valid: true, missingFields: [], wrongTypeFields: [],
    summary: `unknown tool "${toolName}" — skipped validation`
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) return {
    valid: false, missingFields: ["(entire response is not an object)"],
    wrongTypeFields: [], summary: "response is not an object"
  }

  const obj = data as Record<string, unknown>
  const missingFields:   string[] = []
  const wrongTypeFields: string[] = []

  for (const [field, schema] of Object.entries(tool.outputSchema)) {
    if (!schema.required) continue

    if (obj[field] === null || obj[field] === undefined) {
      missingFields.push(field)
      continue
    }

    const actual = Array.isArray(obj[field]) ? "array" : typeof obj[field]
    if (schema.type !== actual) {
      wrongTypeFields.push(`${field} (expected ${schema.type}, got ${actual})`)
    }
  }

  const requiredCount = Object.values(tool.outputSchema).filter(s => s.required).length
  const valid = missingFields.length === 0 && wrongTypeFields.length === 0
  const summary = valid
    ? `all ${requiredCount} required fields present`
    : `INVALID — missing: [${missingFields.join(", ")}]` +
      (wrongTypeFields.length ? ` wrong type: [${wrongTypeFields.join(", ")}]` : "")

  return { valid, missingFields, wrongTypeFields, summary }
}
```

### 2. src/tools/fetch-manifest.ts

```typescript
import { TollgateManifest } from '../../../shared/manifest-types'

export async function fetchManifest(manifestUrl: string): Promise<TollgateManifest | null> {
  try {
    const res = await fetch(manifestUrl, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    return await res.json() as TollgateManifest
  } catch {
    return null
  }
}
```

### 3. src/tools/call-mcp-tool.ts

Handles the full payment loop and response validation.

```typescript
interface CallMcpToolParams {
  mcpUrl:        string
  toolName:      string
  toolInput:     Record<string, unknown>
  expectedPrice: string        // from manifest — agent sets this
  payee:         string        // from manifest
  mcpName:       string        // e.g. "crypto.tollgate.eth"
  manifestTools: ManifestTool[]
}
```

Flow:
1. Connect to MCP via Streamable HTTP (MCP SDK Client)
2. Call toolName with toolInput
3. If 402:
   a. Parse challenge maxAmountRequired (microUSDC) → convert to USDC: `parseInt(max) / 1e6`
   b. If USDC > parseFloat(expectedPrice) * 1.05:
      return `{ error: "price_mismatch", declared: expectedPrice, charged: actualUSDC }`
   c. Build mock x-payment header (hackathon mode):
      `base64(JSON.stringify({ paymentAmount: max, payerAddress: AGENT_ADDRESS, txSignature: "0x" + "a".repeat(130), toolName }))`
   d. Retry with x-payment header
4. Run validateResponse(toolName, data, manifestTools)
5. POST payment event to `${process.env.NEXT_APP_URL}/api/activity`
6. Return `{ data, validationResult, paymentAmount: expectedPrice }`

### 4. src/agent.ts — 0G Compute Router implementation

```typescript
import OpenAI from "openai"
import { validateResponse } from "./utils/validate-response"
import { fetchManifest } from "./tools/fetch-manifest"
import { callMcpTool } from "./tools/call-mcp-tool"

// 0G Compute Router — OpenAI-compatible
const client = new OpenAI({
  baseURL: "https://router-api.0g.ai/v1",
  apiKey: process.env.ZEROG_API_KEY!,
})

const MODEL = process.env.ZEROG_MODEL || "zai-org/GLM-5-FP8"
```

Define tools for the LLM in OpenAI tool_calling format:

```typescript
const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_tollgate_services",
      description: "List all registered MCP services in the Tollgate marketplace",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "fetch_manifest",
      description: "Fetch the Tollgate Manifest for a service. ALWAYS call this before paying.",
      parameters: {
        type: "object",
        properties: {
          manifestUrl: { type: "string", description: "URL of the /.well-known/tollgate.json" }
        },
        required: ["manifestUrl"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "call_mcp_tool",
      description: "Call a paid MCP tool. Payment and validation handled automatically.",
      parameters: {
        type: "object",
        properties: {
          mcpUrl:        { type: "string" },
          toolName:      { type: "string" },
          toolInput:     { type: "object" },
          expectedPrice: { type: "string", description: "Price in USDC from manifest" },
          payee:         { type: "string", description: "Payee wallet from manifest" },
          mcpName:       { type: "string" }
        },
        required: ["mcpUrl", "toolName", "toolInput", "expectedPrice", "payee", "mcpName"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_budget",
      description: "Check remaining USDC budget",
      parameters: { type: "object", properties: {}, required: [] }
    }
  }
]
```

System prompt:
```typescript
const SYSTEM_PROMPT = `You are an autonomous research agent with a $5.00 USDC budget.
You use the Tollgate marketplace to discover and call paid MCP servers.

Your mandatory workflow for EVERY task:
1. list_tollgate_services() — discover what is available
2. fetch_manifest(url) — read the contract BEFORE paying anything
3. Verify the tool you need exists and the price is acceptable
4. call_mcp_tool() — payment and response validation happen automatically
5. After each call, check validationResult.valid — report if false
6. Never use data where validationResult.valid is false
7. Synthesise your answer with: which MCPs used, total USDC spent, validation status

Always show your reasoning at each step.`
```

Agent loop — standard OpenAI tool_use loop:

```typescript
export async function* runAgent(task: string): AsyncGenerator<AgentEvent> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user",   content: task }
  ]

  let spent = 0
  let calls = 0
  const manifests: Map<string, TollgateManifest> = new Map()

  while (true) {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages,
      tools,
      tool_choice: "auto",
    })

    const msg = response.choices[0].message

    if (msg.content) {
      yield { type: "thinking", data: { text: msg.content } }
    }

    // No more tool calls — agent is done
    if (!msg.tool_calls?.length) {
      yield { type: "result", data: { answer: msg.content || "", totalSpent: spent, calls } }
      break
    }

    messages.push(msg)

    // Execute each tool call
    const toolResults: OpenAI.Chat.ChatCompletionToolMessageParam[] = []

    for (const tc of msg.tool_calls) {
      const args = JSON.parse(tc.function.arguments)
      yield { type: "tool_call", data: { name: tc.function.name, input: args } }

      let result: unknown

      if (tc.function.name === "list_tollgate_services") {
        const res = await fetch(`${process.env.NEXT_APP_URL}/api/ens/list`)
        result = await res.json()

      } else if (tc.function.name === "fetch_manifest") {
        const manifest = await fetchManifest(args.manifestUrl)
        if (manifest) manifests.set(args.manifestUrl, manifest)
        result = manifest || { error: "manifest not found" }

      } else if (tc.function.name === "call_mcp_tool") {
        const manifest = [...manifests.values()].find(m => m.tools.some(t => t.name === args.toolName))
        const callResult = await callMcpTool({
          ...args,
          manifestTools: manifest?.tools || []
        })
        if (callResult.paymentAmount) {
          spent += parseFloat(callResult.paymentAmount)
          calls++
          yield { type: "payment", data: {
            mcp: args.mcpName, tool: args.toolName,
            amount: callResult.paymentAmount
          }}
        }
        if (callResult.validationResult) {
          yield { type: "validation", data: {
            tool: args.toolName,
            valid: callResult.validationResult.valid,
            summary: callResult.validationResult.summary
          }}
        }
        result = callResult

      } else if (tc.function.name === "check_budget") {
        result = { total: 5.00, spent, remaining: 5.00 - spent, calls }
      }

      toolResults.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(result)
      })
    }

    messages.push(...toolResults)
  }
}
```

### 5. src/index.ts (CLI entry for testing)

```typescript
import { runAgent } from "./agent"

const task = process.argv.slice(2).join(" ") || "What is the current ETH price?"
console.log(`Task: "${task}"\n`)

for await (const event of runAgent(task)) {
  if (event.type === "thinking")   console.log("💭", event.data.text?.slice(0, 120))
  if (event.type === "payment")    console.log("💰", event.data.mcp, "→", event.data.tool, event.data.amount + " USDC")
  if (event.type === "validation") console.log("✓", event.data.tool, event.data.summary)
  if (event.type === "result")     console.log("\n📋", event.data.answer, "\n💸 Spent:", event.data.totalSpent)
}
```

## AgentEvent Types

```typescript
export type AgentEvent =
  | { type: "thinking";   data: { text: string } }
  | { type: "tool_call";  data: { name: string; input: unknown } }
  | { type: "payment";    data: { mcp: string; tool: string; amount: string; txHash?: string } }
  | { type: "validation"; data: { tool: string; valid: boolean; summary: string } }
  | { type: "result";     data: { answer: string; totalSpent: number; calls: number } }
  | { type: "error";      data: { message: string } }
```

## Tests Required

```typescript
// validate-response.test.ts — run FIRST
it("passes for correct get_price response — all 5 fields present")
it("fails when price_usd is missing")
it("fails when price_usd is string instead of number")
it("passes for unknown tool — allow through")
it("fails when data is null")

// agent.test.ts
it("fetches manifest before first payment", { timeout: 30000 })
it("emits validation event after tool call with valid: true", { timeout: 30000 })
it("uses 2 MCPs for compound task", { timeout: 45000 })
it("result event contains totalSpent as number", { timeout: 30000 })
it("aborts with price_mismatch when 402 > manifest price * 1.05")
```

## Package Dependencies

```json
{
  "dependencies": {
    "openai": "^4.0.0",
    "@modelcontextprotocol/sdk": "^1.10.0",
    "dotenv": "^16.0.0"
  }
}
```

Note: DO NOT add @anthropic-ai/sdk — the agent uses 0G Compute via openai package.

## Environment Variables (.env)

```
ZEROG_API_KEY=sk-...              ← from pc.0g.ai Dashboard → API Keys
ZEROG_MODEL=zai-org/GLM-5-FP8    ← check live catalog at router/models
NEXT_APP_URL=http://localhost:3000
AGENT_BUDGET=5.00
AGENT_ADDRESS=0x0000000000000000000000000000000000000001
```

## 0G Account Setup (YOU do this before running)

1. Go to https://pc.0g.ai
2. Connect MetaMask
3. Deposit 0G tokens (testnet faucet: check 0G Discord)
4. Dashboard → API Keys → Create key with "inference" permission
5. Copy the sk-... key into ZEROG_API_KEY

Announce "agent complete" with validate-response test results first, then full test output.