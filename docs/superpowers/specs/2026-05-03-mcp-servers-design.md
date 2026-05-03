# Tollgate MCP Servers — Design Spec

**Date:** 2026-05-03
**Scope:** `shared/manifest-types`, `shared/x402-middleware`, `packages/mcp-crypto`, `packages/mcp-weather`, `packages/mcp-chain`

---

## Overview

Build five packages that form the paid MCP server layer of Tollgate: two shared foundations and three MCP servers, each exposing real-world data behind x402 USDC payment gating. Every server hosts `/.well-known/tollgate.json` — the Tollgate Manifest — which is the on-chain contract declaring tool names, prices, and schemas.

---

## Build Order

Phase 1 (serial — each depends on the previous):
1. `shared/manifest-types` — zero-import TypeScript interfaces
2. `shared/x402-middleware` — Express middleware (imports manifest-types)

Phase 2 (parallel — all depend on both shared packages):
3. `packages/mcp-crypto`
4. `packages/mcp-weather`
5. `packages/mcp-chain`

---

## Phase 1: Shared Packages

### shared/manifest-types

**Purpose:** Single canonical TypeScript type definitions. No imports. No logic.

**Exports:**
- `ToolSchema` — `{ type, description?, required, enum?, example? }`
- `ManifestTool` — `{ name, description, price: string, inputSchema, outputSchema }`
- `TollgateManifest` — `{ ens, version, description, category, payee, chain, usdcContract, defaultPrice, tools[], updatedAt }`
- `ValidationResult` — `{ valid, missingFields[], wrongTypeFields[], summary }`
- `TollgateENSRecord` — all `tollgate:*` text record keys

**Files:**
```
shared/manifest-types/
  index.ts
  package.json
  tsconfig.json
```

**Verification:** `npx tsc --noEmit` must pass with zero errors.

---

### shared/x402-middleware

**Purpose:** Express middleware factory that payment-gates MCP `tools/call` requests.

**Exports:**
- `createPaymentMiddleware(opts: PaymentMiddlewareOptions): RequestHandler`
- `getActivityLog(): ActivityEvent[]`
- `clearActivityLog(): void`

**Types:**
```typescript
PaymentMiddlewareOptions {
  getToolPrice: (toolName: string) => string   // reads per-tool price from manifest
  payee:        string
  mcpName:      string
  usdcContract: string
}

ActivityEvent {
  ts:     number    // Date.now()
  mcp:    string
  tool:   string
  amount: string
  caller: string
  txSig?: string
}
```

**Middleware logic:**
- `tools/list` → always `next()` (free)
- `tools/call` without `x-payment` header → HTTP 402 JSON with payment instructions
- `tools/call` with `x-payment` header → decode base64 JSON payload, verify `paymentAmount / 1e6 >= parseFloat(declaredPrice)`, append to activityLog, `next()`

**402 response shape:**
```json
{
  "error": "Payment Required",
  "x402Version": "1",
  "toolName": "<name>",
  "accepts": [{
    "scheme": "exact",
    "network": "base-sepolia",
    "maxAmountRequired": "<price * 1e6 as integer string>",
    "asset": "<usdcContract>",
    "payTo": "<payee>",
    "memo": "tollgate-<mcpName>-<toolName>"
  }]
}
```

**Files:**
```
shared/x402-middleware/
  index.ts
  types.ts
  package.json
  tsconfig.json
  tests/middleware.test.ts
```

---

## Phase 2: MCP Servers

All three servers share the same structural pattern:

```
packages/mcp-{name}/
  src/
    manifest.ts          ← TollgateManifest const, hydrated from env vars
    tools/               ← one file per tool
    data/                ← external API helpers
    server.ts            ← Express + McpServer, payment middleware applied
    index.ts             ← startup validation, writes tollgate.json, starts server
  public/
    .well-known/
      tollgate.json      ← written at startup from manifest.ts
  tests/
  package.json
  tsconfig.json
  vitest.config.ts
```

### Startup sequence (all three servers)
1. Verify `PAYEE_WALLET` is set and starts with `0x`
2. Verify all tools have `price > 0`
3. Write manifest to `public/.well-known/tollgate.json`
4. Log: `✓ Manifest written: N tools`
5. Start Express on `process.env.PORT || <default>`
6. Log each tool name and price

### Payment middleware wiring (all three servers)
```typescript
const paymentMiddleware = createPaymentMiddleware({
  getToolPrice: (name) =>
    manifest.tools.find(t => t.name === name)?.price ?? manifest.defaultPrice,
  payee:        process.env.PAYEE_WALLET!,
  mcpName:      process.env.MCP_NAME!,
  usdcContract: process.env.USDC_CONTRACT!
})
// applied BEFORE McpServer handler
app.use(paymentMiddleware)
```

---

### packages/mcp-crypto

| | |
|---|---|
| ENS | `crypto.tollgate.eth` |
| Port | 3001 |
| External API | CoinGecko v3 (free, no key) |

**Tools:**

| Tool | Price | API endpoint |
|---|---|---|
| `get_price` | $0.01 | `/simple/price?ids={token}&vs_currencies=usd` |
| `get_trending` | $0.01 | `/search/trending` |
| `get_market_data` | $0.02 | `/coins/{token}` |

**CoinGecko rules:**
- 300ms delay before every fetch (rate limit protection)
- Cache `get_trending` response for 60s (module-level variable)
- On 429: throw `Error("CoinGecko rate limit — wait 60 seconds")`

**Files:** `src/manifest.ts`, `src/tools/get-price.ts`, `src/tools/get-trending.ts`, `src/tools/get-market-data.ts`, `src/server.ts`, `src/index.ts`

---

### packages/mcp-weather

| | |
|---|---|
| ENS | `weather.tollgate.eth` |
| Port | 3002 |
| External API | Open-Meteo (completely free, no key) |

**Tools:**

| Tool | Price | Flow |
|---|---|---|
| `get_weather` | $0.01 | geocode city → fetch current weather |
| `get_forecast` | $0.01 | geocode city → fetch daily forecast |

**Helper:** `src/data/open-meteo.ts`
- `geocodeCity(city)` → `{ lat, lng, displayName }` via geocoding-api.open-meteo.com
- `wmoToCondition(code)` → human string (Clear sky / Partly cloudy / Fog / Rain / Snow / Rain showers / Thunderstorm)

**Files:** `src/manifest.ts`, `src/data/open-meteo.ts`, `src/tools/get-weather.ts`, `src/tools/get-forecast.ts`, `src/server.ts`, `src/index.ts`

---

### packages/mcp-chain

| | |
|---|---|
| ENS | `chain.tollgate.eth` |
| Port | 3003 |
| External API | Alchemy JSON-RPC (via `ALCHEMY_BASE_SEPOLIA_RPC`) + Viem |

**Tools:**

| Tool | Price | Method |
|---|---|---|
| `get_eth_balance` | $0.01 | Viem `client.getBalance()` |
| `get_token_holdings` | $0.02 | `alchemy_getTokenBalances` JSON-RPC |
| `get_recent_txs` | $0.02 | `alchemy_getAssetTransfers` JSON-RPC |

**Helper:** `src/data/alchemy.ts` — `alchemyRpc(method, params)` via raw `fetch` POST to `ALCHEMY_BASE_SEPOLIA_RPC`

**Files:** `src/manifest.ts`, `src/data/alchemy.ts`, `src/tools/get-eth-balance.ts`, `src/tools/get-token-holdings.ts`, `src/tools/get-recent-txs.ts`, `src/server.ts`, `src/index.ts`

---

## Environment Variables

Root `.env` already has `ALCHEMY_BASE_SEPOLIA_RPC`, `DEPLOYER_WALLET_ADDRESS`. Each MCP package reads:

```
PORT          (dynamic — Railway provides this; defaults to 3001/3002/3003)
MCP_NAME      (crypto / weather / chain)
ENS_NAME      (crypto.tollgate.eth / weather.tollgate.eth / chain.tollgate.eth)
PAYEE_WALLET  (0x... — payment receiver)
USDC_CONTRACT (0x5dEaC602762362FE5f135FA5904351916053cF70)
ALCHEMY_BASE_SEPOLIA_RPC  (mcp-chain only)
```

---

## Dependencies (all MCP packages)

```json
{
  "@modelcontextprotocol/sdk": "latest",
  "@modelcontextprotocol/express": "latest",
  "express": "^4",
  "viem": "^2"  // mcp-chain only
}
```

Dev:
```json
{
  "vitest": "latest",
  "typescript": "^5",
  "@types/express": "^4",
  "dotenv": "^16",
  "tsx": "latest"
}
```

---

## Testing Strategy

All packages use **Vitest**. Tests are in `tests/` alongside `src/`.

- Unit tests mock external APIs (CoinGecko, Open-Meteo, Alchemy)
- Middleware tests use `supertest` against an Express app
- Manifest tests assert shape — no network calls

Each package's `package.json` has `"test": "vitest run"`.

---

## Key Constraints

1. `tools/list` is always free — no payment check
2. Per-tool pricing: middleware calls `getToolPrice(toolName)` on every request — NOT a flat env var
3. Manifest is the source of truth — never hardcode prices in tools
4. outputSchema compliance: every tool must return all `required: true` fields with correct types
5. Price mismatch rule: if 402 challenge price > manifest price by >5%, agent aborts (enforced by agent, not server)
6. On-chain payment verification skipped for hackathon — syntactically valid header is accepted
