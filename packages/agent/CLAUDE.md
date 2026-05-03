# TOLLGATE — packages/agent CLAUDE.md

## What This Package Is

The autonomous demo agent for Tollgate. A Claude claude-sonnet-4-20250514 agent that
demonstrates the full manifest → pay → validate flow end-to-end.
Uses the Anthropic SDK with native tool use.

## Your Scope

Work ONLY inside packages/agent/.
Import types from: ../../shared/manifest-types
Do NOT modify shared/ or any other package.

## Prerequisite

shared/manifest-types must be complete before you start.
Build validate-response.ts FIRST and verify its tests pass before building agent.ts.

## Files to Build (in this order)

### 1. src/utils/validate-response.ts

This is the output validation function. Build and test it before anything else.

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

This handles the full payment loop and response validation.

Parameters:
```typescript
interface CallMcpToolParams {
  mcpUrl:        string;
  toolName:      string;
  toolInput:     Record<string, unknown>;
  expectedPrice: string;       // from manifest — agent sets this
  payee:         string;       // from manifest
  mcpName:       string;       // e.g. "crypto.tollgate.eth"
  manifestTools: ManifestTool[];
}
```
### 3. src/tools/call-mcp-tool.ts (WITH REAL KEEPERHUB x402 INTEGRATION)

This handles the full payment loop, autonomous transaction signing via KeeperHub, and response validation.

**Parameters:** `toolName: string`, `toolInput: any`, `mcpUrl: string`

**Flow:**
1. Connect to the target MCP via Streamable HTTP (`@modelcontextprotocol/sdk` Client).
2. Call `toolName` with `toolInput`.
3. **If 402 Payment Required:**
   a. Parse the challenge payload from the error: `{ maxAmountRequired, payTo }`.
   b. Convert `maxAmountRequired` (microUSDC) to standard USDC: `parseInt(maxAmountRequired) / 1e6`.
   c. **Price Verification:** If the USDC amount > `parseFloat(expectedPrice) * 1.05`, instantly return `{ error: "price_mismatch", declared: expectedPrice, charged: actualUSDC }`.
   d. **KeeperHub Intervention:** - Connect to the KeeperHub MCP server locally or via its SDK.
      - Call the KeeperHub tool `sign_x402_transaction` (or equivalent SDK method for the Agentic Wallet), passing the `payTo` address, the `maxAmountRequired`, and the Chain ID (84532 for Base Sepolia).
      - Extract the returned `txSignature` and `payerAddress` from the KeeperHub execution.
   e. Build the real `x-payment` header using base64 encoding: 
      `{ paymentAmount: maxAmountRequired, payerAddress, txSignature, toolName }`
   f. Retry the original tool call on the target MCP, attaching the `x-payment` header.
4. On success, run `validateResponse(toolName, data, manifestTools)`.
5. POST the payment event to `${process.env.NEXT_APP_URL}/api/activity`.
6. Return `{ data, validationResult, paymentAmount: expectedPrice }`.


### 4. src/agent.ts

Anthropic SDK agent with these tools registered:

**list_tollgate_services()**
GET `${process.env.NEXT_APP_URL}/api/ens/list`
Returns array of `{ name, url, manifestUrl, description, category }`

**fetch_manifest(manifestUrl: string)**
Calls fetchManifest() from fetch-manifest.ts
Returns TollgateManifest object

**call_mcp_tool(params)**
Calls callMcpTool() from call-mcp-tool.ts
Returns `{ data, validationResult, paymentAmount }`

**check_budget()**
Tracks spend internally across all call_mcp_tool calls
Returns `{ total: INITIAL_BUDGET, spent: number, remaining: number, calls: number }`

System prompt:
```
You are an autonomous research agent with a $5.00 USDC budget.
You use the Tollgate marketplace to discover and call paid MCP servers.

Your mandatory workflow for EVERY task:
1. list_tollgate_services() — discover what is available
2. fetch_manifest(url) — read the contract BEFORE paying anything
3. Verify the tool you need exists in the manifest and the price is acceptable
4. call_mcp_tool() — the payment and response validation happen automatically
5. After each call, check validationResult.valid — if false, report it explicitly
6. Never use data where validationResult.valid is false
7. Synthesise your answer and always include:
   - Which MCPs you used
   - Total USDC spent
   - Validation status for each call (e.g. "2/2 validated ✓")

Always show your reasoning at each step.
```

Export:
```typescript
export async function* runAgent(task: string): AsyncGenerator<AgentEvent> { ... }

export type AgentEvent =
  | { type: 'thinking';   data: { text: string } }
  | { type: 'tool_call';  data: { name: string; input: unknown } }
  | { type: 'payment';    data: { mcp: string; tool: string; amount: string; txHash?: string } }
  | { type: 'validation'; data: { tool: string; valid: boolean; summary: string } }
  | { type: 'result';     data: { answer: string; totalSpent: number; calls: number } }
  | { type: 'error';      data: { message: string } }
```

### 5. src/index.ts

Entry point for running the agent from CLI (useful for testing without the frontend):

```typescript
const task = process.argv.slice(2).join(' ') || "What is the current ETH price?"
console.log(`Running task: "${task}"\n`)
for await (const event of runAgent(task)) {
  if (event.type === 'thinking')   console.log('💭', event.data.text.slice(0, 100))
  if (event.type === 'payment')    console.log('💰', event.data.mcp, event.data.tool, event.data.amount + ' USDC')
  if (event.type === 'validation') console.log('✓', event.data.tool, event.data.summary)
  if (event.type === 'result')     console.log('\n📋 Answer:', event.data.answer)
}
```

## Tests Required

```typescript
// validate-response.test.ts — run these FIRST
it('passes for correct get_price response — all 5 fields present and typed')
it('fails when price_usd is missing')
it('fails when price_usd is string instead of number')
it('fails when required array field is not an array')
it('passes for unknown tool (no schema — allow through)')
it('fails when data is null')
it('fails when data is a string not an object')
it('summary contains field names when invalid')

// agent.test.ts
it('fetches manifest before making first payment', 30s timeout)
it('emits validation event after each tool call with valid: true', 30s timeout)
it('uses 2 different MCPs for multi-MCP task', 45s timeout)
it('result event contains totalSpent as a number', 30s timeout)
it('aborts with price_mismatch when 402 > manifest price * 1.05')
```

## Environment Variables (.env)

```
ANTHROPIC_API_KEY=sk-ant-...
NEXT_APP_URL=http://localhost:3000
AGENT_BUDGET=5.00
AGENT_ADDRESS=0x0000000000000000000000000000000000000001
```

Announce "agent complete" with validate-response test output first, then full test output.
