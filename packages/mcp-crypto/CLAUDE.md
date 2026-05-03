# TOLLGATE — packages/mcp-crypto CLAUDE.md

## What This Package Is

The CryptoData MCP server. Wraps the CoinGecko public API (no key required)
and exposes three paid tools behind x402 payment gating.
Runs on port 3001. Registered as `crypto.tollgate.eth`.

## Your Scope

Work ONLY inside packages/mcp-crypto/.
Import types from: ../../shared/manifest-types
Import middleware from: ../../shared/x402-middleware
Do NOT modify shared/ or any other package.

## Prerequisite

shared/manifest-types and shared/x402-middleware must be complete before you start.

## Files to Build

### src/manifest.ts

Define the TollgateManifest object for this MCP. It is the single source of truth
for tool names, prices, and schemas. Export it as a const.

At module load, hydrate the payee from process.env.PAYEE_WALLET and ens from
process.env.ENS_NAME.

```typescript
export const manifest: TollgateManifest = {
  ens:          process.env.ENS_NAME     || "crypto.tollgate.eth",
  version:      "1.0",
  description:  "Real-time crypto prices, trending tokens, and market data",
  category:     "finance",
  payee:        process.env.PAYEE_WALLET || "",
  chain:        "base-sepolia",
  usdcContract: "0x5dEaC602762362FE5f135FA5904351916053cF70",
  defaultPrice: "0.01",
  tools: [
    {
      name:        "get_price",
      description: "Get the current USD price for a token",
      price:       "0.01",
      inputSchema: {
        token: { type: "string", required: true,
                 description: "CoinGecko ID e.g. bitcoin, ethereum", example: "ethereum" }
      },
      outputSchema: {
        token:     { type: "string", required: true },
        price_usd: { type: "number", required: true },
        currency:  { type: "string", required: true, enum: ["USD"] },
        source:    { type: "string", required: true },
        timestamp: { type: "number", required: true }
      }
    },
    {
      name:        "get_trending",
      description: "Get the top 7 trending tokens right now",
      price:       "0.01",
      inputSchema: {},
      outputSchema: {
        tokens:     { type: "array",  required: true,
                      description: "[{ name, symbol, market_cap_rank, price_btc }]" },
        fetched_at: { type: "number", required: true }
      }
    },
    {
      name:        "get_market_data",
      description: "Full market data: price, cap, volume, 24h/7d change",
      price:       "0.02",
      inputSchema: {
        token: { type: "string", required: true, example: "ethereum" }
      },
      outputSchema: {
        token:      { type: "string", required: true },
        price_usd:  { type: "number", required: true },
        market_cap: { type: "number", required: true },
        volume_24h: { type: "number", required: true },
        change_24h: { type: "number", required: true },
        change_7d:  { type: "number", required: true },
        source:     { type: "string", required: true },
        timestamp:  { type: "number", required: true }
      }
    }
  ],
  updatedAt: new Date().toISOString()
}
```

### src/tools/get-price.ts

```typescript
export async function getPrice(input: { token: string }) {
  await delay(300) // CoinGecko rate limit protection
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${input.token}&vs_currencies=usd`
  )
  const json = await res.json()
  if (!json[input.token]) throw new Error(`Token "${input.token}" not found`)
  return {
    token:     input.token,
    price_usd: json[input.token].usd as number,
    currency:  "USD",
    source:    "coingecko",
    timestamp: Date.now()
  }
  // ALL 5 required outputSchema fields must be present
}
```

### src/tools/get-trending.ts

Fetch: `GET https://api.coingecko.com/api/v3/search/trending`
Response path: `json.coins[].item` → { name, symbol, market_cap_rank, price_btc }
Return: `{ tokens: top7, fetched_at: Date.now() }`
Add 300ms delay before fetch.

### src/tools/get-market-data.ts

Fetch: `GET https://api.coingecko.com/api/v3/coins/${token}`
Map to: `{ token, price_usd, market_cap, volume_24h, change_24h, change_7d, source, timestamp }`
Price path: `json.market_data.current_price.usd`
Market cap: `json.market_data.market_cap.usd`
Volume: `json.market_data.total_volume.usd`
24h change: `json.market_data.price_change_percentage_24h`
7d change: `json.market_data.price_change_percentage_7d`
Handle 429: throw Error("CoinGecko rate limit — wait 60 seconds")
Add 300ms delay before fetch.

### src/server.ts

- McpServer from @modelcontextprotocol/sdk
- Express + mcpExpressMiddleware from @modelcontextprotocol/express
- Apply createPaymentMiddleware BEFORE the MCP handler
- Register all 3 tools
- app.use(express.static('public')) — serves /.well-known/tollgate.json

### src/index.ts

Startup sequence:
1. Verify PAYEE_WALLET env var is set and starts with "0x"
2. Verify all tools have price > 0
3. Write manifest to public/.well-known/tollgate.json
4. Log: "✓ Manifest written: 3 tools"
5. Start Express server on process.env.PORT || 3001
6. Log each tool price on startup

## CoinGecko Rate Limit Notes

- Free tier: ~50 requests/minute
- Always add 300ms delay between calls
- Cache get_trending response for 60 seconds (use a module-level variable)
- On 429: return a helpful error message, do not crash

## Tests Required

```typescript
it('manifest has ens, payee, tools array with 3 items')
it('each tool has price as string parseable to float > 0')
it('get_price returns all 5 required outputSchema fields for ethereum')
it('get_price price_usd is a number not a string')
it('get_trending returns tokens array with fetched_at timestamp')
it('get_market_data returns all 8 required fields')
it('handles unknown token gracefully with descriptive error')
it('handles CoinGecko 429 with clear error message')
it('GET /.well-known/tollgate.json returns valid manifest JSON')
it('tools/call without payment returns 402')
it('tools/call with payment header returns tool result')
```

## Environment Variables (.env)

```
PORT=3001
MCP_NAME=crypto
ENS_NAME=crypto.tollgate.eth
PAYEE_WALLET=0x...
USDC_CONTRACT=0x5dEaC602762362FE5f135FA5904351916053cF70
```

Announce "mcp-crypto complete" when all tests pass and server starts cleanly.
