# TOLLGATE — shared/x402-middleware CLAUDE.md

## What This Package Is

The shared Express middleware that gates all MCP tool calls behind x402 USDC payment.
Used by all three MCP servers (mcp-crypto, mcp-weather, mcp-chain).
Build this immediately after shared/manifest-types.

## Your Scope

Work ONLY inside shared/x402-middleware/.
Import types from: ../manifest-types/index.ts
Do NOT modify any other package.

## What to Build

### shared/x402-middleware/types.ts

```typescript
export interface PaymentMiddlewareOptions {
  getToolPrice: (toolName: string) => string;  // reads from manifest
  payee:        string;
  mcpName:      string;
  usdcContract: string;
}

export interface ActivityEvent {
  ts:     number;   // Date.now()
  mcp:    string;   // e.g. "crypto"
  tool:   string;   // e.g. "get_price"
  amount: string;   // "0.01"
  caller: string;   // payer address
  txSig?: string;   // payment signature if available
}
```

### shared/x402-middleware/index.ts

Export `createPaymentMiddleware(opts: PaymentMiddlewareOptions)` — an Express middleware:

**On tools/list requests:** Always allow. Call next() immediately.

**On tools/call requests WITHOUT x-payment header:**
Return HTTP 402:
```json
{
  "error": "Payment Required",
  "x402Version": "1",
  "toolName": "<name from request body>",
  "accepts": [{
    "scheme": "exact",
    "network": "base-sepolia",
    "maxAmountRequired": "<price * 1e6 as integer string>",
    "asset": "<opts.usdcContract>",
    "payTo": "<opts.payee>",
    "memo": "tollgate-<mcpName>-<toolName>"
  }]
}
```
The tool name comes from `req.body?.params?.name` (MCP JSON-RPC format).

**On tools/call WITH x-payment header:**
1. Decode base64 JSON: `{ paymentAmount, payerAddress, txSignature, toolName }`
2. Parse paymentAmount as float (it's in microUSDC — divide by 1e6 to compare)
3. Get declared price: `opts.getToolPrice(toolName)`
4. If paymentAmount / 1e6 < parseFloat(declaredPrice): return 402 with error "Underpayment"
5. For hackathon: accept if syntactically valid (skip on-chain verification)
6. Append to in-memory activityLog array: ActivityEvent
7. Call next()

**Also export:**
- `getActivityLog(): ActivityEvent[]` — returns the full in-memory log
- `clearActivityLog(): void` — for testing

## Critical: Per-Tool Pricing

The middleware must call `opts.getToolPrice(toolName)` for every request.
It must NOT use a flat env var price. The manifest drives the price.

Example of how MCP servers call this:
```typescript
import { manifest } from './manifest'
import { createPaymentMiddleware } from '../../shared/x402-middleware'

const paymentMiddleware = createPaymentMiddleware({
  getToolPrice: (name) =>
    manifest.tools.find(t => t.name === name)?.price ?? manifest.defaultPrice,
  payee:        process.env.PAYEE_WALLET!,
  mcpName:      process.env.MCP_NAME!,
  usdcContract: process.env.USDC_CONTRACT!
})
```

## Tests Required

```typescript
describe('x402 Middleware', () => {
  it('allows tools/list without payment')
  it('returns 402 for tools/call with no x-payment header')
  it('402 response includes correct tool price from getToolPrice')
  it('404 memo format is tollgate-{mcpName}-{toolName}')
  it('passes request with valid x-payment header')
  it('rejects underpayment')
  it('logs ActivityEvent on successful payment')
  it('getActivityLog returns accumulated events')
})
```

Announce "shared/x402-middleware complete" when tests pass.
