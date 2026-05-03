# Tollgate MCP Servers — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build three fully self-contained MCP servers (mcp-crypto, mcp-weather, mcp-chain) with x402 USDC payment gating, each deployable independently to Railway or any Node host.

**Architecture:** Each MCP package is standalone — types and middleware are embedded locally (`src/types.ts`, `src/middleware.ts`), no `file:` references to sibling packages. All dependencies are npm packages. Payment middleware gates `tools/call` at the Express layer before the MCP SDK processes it.

**Tech Stack:** Node 20, TypeScript 5, `@modelcontextprotocol/sdk`, Express 4, Zod, Viem 2 (mcp-chain only), Vitest, Supertest

---

## File Map

### packages/mcp-crypto/
```
src/
  types.ts             ← TollgateManifest + ManifestTool interfaces (self-contained)
  middleware.ts         ← createPaymentMiddleware, getActivityLog, clearActivityLog
  manifest.ts          ← TollgateManifest const (source of truth for tool prices)
  tools/
    get-price.ts       ← CoinGecko /simple/price
    get-trending.ts    ← CoinGecko /search/trending (60s cache)
    get-market-data.ts ← CoinGecko /coins/{token}
  server.ts            ← McpServer + Express + static files
  index.ts             ← startup validation, writes tollgate.json, starts server
public/
  .well-known/         ← created at startup by index.ts
tests/
  types.test.ts
  middleware.test.ts
  get-price.test.ts
  get-trending.test.ts
  get-market-data.test.ts
  server.test.ts
package.json
tsconfig.json
vitest.config.ts
.env.example
```

### packages/mcp-weather/ (same structure)
```
src/
  types.ts
  middleware.ts
  manifest.ts
  data/
    open-meteo.ts      ← geocodeCity + wmoToCondition helpers
  tools/
    get-weather.ts
    get-forecast.ts
  server.ts
  index.ts
public/.well-known/
tests/
  middleware.test.ts
  open-meteo.test.ts
  get-weather.test.ts
  get-forecast.test.ts
  server.test.ts
package.json / tsconfig.json / vitest.config.ts / .env.example
```

### packages/mcp-chain/ (same structure)
```
src/
  types.ts
  middleware.ts
  manifest.ts
  data/
    alchemy.ts         ← alchemyRpc JSON-RPC helper
  tools/
    get-eth-balance.ts ← Viem createPublicClient
    get-token-holdings.ts
    get-recent-txs.ts
  server.ts
  index.ts
public/.well-known/
tests/
  middleware.test.ts
  alchemy.test.ts
  get-eth-balance.test.ts
  get-token-holdings.test.ts
  get-recent-txs.test.ts
  server.test.ts
package.json / tsconfig.json / vitest.config.ts / .env.example
```

---

## Shared Patterns (used in every task below)

### package.json template
```json
{
  "name": "@tollgate/mcp-REPLACE",
  "version": "1.0.0",
  "private": true,
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.11.0",
    "express": "^4.21.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "vitest": "^2.1.0",
    "supertest": "^7.0.0",
    "@types/supertest": "^6.0.0",
    "typescript": "^5.6.0",
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "dotenv": "^16.4.0"
  }
}
```

### tsconfig.json template (all MCPs)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "moduleResolution": "node",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### vitest.config.ts template (all MCPs)
```typescript
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    environment: 'node',
    globals: true
  }
})
```

### src/types.ts (same in all three MCPs)
```typescript
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
```

### src/middleware.ts (same in all three MCPs)
```typescript
import { Request, Response, NextFunction, RequestHandler } from 'express'

export interface PaymentMiddlewareOptions {
  getToolPrice: (toolName: string) => string
  payee:        string
  mcpName:      string
  usdcContract: string
}

interface ActivityEvent {
  ts:     number
  mcp:    string
  tool:   string
  amount: string
  caller: string
  txSig?: string
}

const activityLog: ActivityEvent[] = []

export function getActivityLog(): ActivityEvent[] { return activityLog }
export function clearActivityLog(): void { activityLog.length = 0 }

export function createPaymentMiddleware(opts: PaymentMiddlewareOptions): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const method: string = req.body?.method ?? ''

    if (method === 'tools/list') { next(); return }
    if (method !== 'tools/call') { next(); return }

    const toolName: string = req.body?.params?.name ?? ''
    const declaredPrice = opts.getToolPrice(toolName)
    const paymentHeader = req.headers['x-payment'] as string | undefined

    if (!paymentHeader) {
      const amountMicro = Math.round(parseFloat(declaredPrice) * 1e6).toString()
      res.status(402).json({
        error:       "Payment Required",
        x402Version: "1",
        toolName,
        accepts: [{
          scheme:            "exact",
          network:           "base-sepolia",
          maxAmountRequired: amountMicro,
          asset:             opts.usdcContract,
          payTo:             opts.payee,
          memo:              `tollgate-${opts.mcpName}-${toolName}`
        }]
      })
      return
    }

    let payload: { paymentAmount?: number; payerAddress?: string; txSignature?: string; toolName?: string }
    try {
      payload = JSON.parse(Buffer.from(paymentHeader, 'base64').toString('utf8'))
    } catch {
      res.status(402).json({ error: "Invalid payment header" })
      return
    }

    const paidAmount = (payload.paymentAmount ?? 0) / 1e6
    if (paidAmount < parseFloat(declaredPrice)) {
      res.status(402).json({ error: "Underpayment", required: declaredPrice, received: paidAmount.toString() })
      return
    }

    activityLog.push({
      ts:     Date.now(),
      mcp:    opts.mcpName,
      tool:   toolName,
      amount: declaredPrice,
      caller: payload.payerAddress ?? 'unknown',
      txSig:  payload.txSignature
    })

    next()
  }
}
```

### src/server.ts pattern (all MCPs — tools vary)
```typescript
import express from 'express'
import path from 'path'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { manifest } from './manifest'
import { createPaymentMiddleware } from './middleware'
// import tool functions here

export function createServer() {
  const app = express()
  app.use(express.json())
  app.use(express.static(path.join(__dirname, '..', 'public')))

  app.use(createPaymentMiddleware({
    getToolPrice: (name) =>
      manifest.tools.find(t => t.name === name)?.price ?? manifest.defaultPrice,
    payee:        process.env.PAYEE_WALLET!,
    mcpName:      process.env.MCP_NAME!,
    usdcContract: process.env.USDC_CONTRACT!
  }))

  const mcpServer = new McpServer({
    name:    manifest.ens,
    version: manifest.version
  })

  // Register tools here with mcpServer.tool(...)

  app.post('/mcp', async (req, res) => {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    res.on('close', () => transport.close())
    await mcpServer.connect(transport)
    await transport.handleRequest(req, res, req.body)
  })

  app.get('/mcp', async (req, res) => {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    res.on('close', () => transport.close())
    await mcpServer.connect(transport)
    await transport.handleRequest(req, res)
  })

  return app
}
```

### src/index.ts pattern (all MCPs)
```typescript
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { manifest } from './manifest'
import { createServer } from './server'

function validateEnv() {
  const payee = process.env.PAYEE_WALLET
  if (!payee || !payee.startsWith('0x')) {
    throw new Error('PAYEE_WALLET must be set and start with 0x')
  }
  for (const tool of manifest.tools) {
    if (parseFloat(tool.price) <= 0) {
      throw new Error(`Tool ${tool.name} has invalid price: ${tool.price}`)
    }
  }
}

function writeManifest() {
  const dir = path.join(__dirname, '..', 'public', '.well-known')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'tollgate.json'), JSON.stringify(manifest, null, 2))
  console.log(`✓ Manifest written: ${manifest.tools.length} tools`)
  for (const tool of manifest.tools) {
    console.log(`  ${tool.name}: $${tool.price}`)
  }
}

validateEnv()
writeManifest()

const port = parseInt(process.env.PORT ?? 'PORT_DEFAULT', 10)
const app = createServer()
app.listen(port, () => console.log(`${manifest.ens} running on :${port}`))
```
_(Replace `PORT_DEFAULT` with `3001`, `3002`, or `3003` per server.)_

---

## Task 1: Scaffold mcp-crypto

**Files:** Create all config files for `packages/mcp-crypto/`

- [ ] **Step 1.1 — Create package.json**

  ```json
  // packages/mcp-crypto/package.json
  {
    "name": "@tollgate/mcp-crypto",
    "version": "1.0.0",
    "private": true,
    "main": "dist/index.js",
    "scripts": {
      "build": "tsc",
      "start": "node dist/index.js",
      "dev": "tsx src/index.ts",
      "test": "vitest run",
      "test:watch": "vitest"
    },
    "dependencies": {
      "@modelcontextprotocol/sdk": "^1.11.0",
      "express": "^4.21.0",
      "zod": "^3.23.0",
      "dotenv": "^16.4.0"
    },
    "devDependencies": {
      "vitest": "^2.1.0",
      "supertest": "^7.0.0",
      "@types/supertest": "^6.0.0",
      "typescript": "^5.6.0",
      "@types/express": "^5.0.0",
      "@types/node": "^22.0.0",
      "tsx": "^4.19.0"
    }
  }
  ```

- [ ] **Step 1.2 — Create tsconfig.json** (use template from Shared Patterns above)

- [ ] **Step 1.3 — Create vitest.config.ts** (use template from Shared Patterns above)

- [ ] **Step 1.4 — Create .env.example**
  ```
  PORT=3001
  MCP_NAME=crypto
  ENS_NAME=crypto.tollgate.eth
  PAYEE_WALLET=0x...
  USDC_CONTRACT=0x5dEaC602762362FE5f135FA5904351916053cF70
  ```

- [ ] **Step 1.5 — Create src/ and tests/ directories, install deps**
  ```bash
  cd packages/mcp-crypto
  mkdir -p src/tools tests public/.well-known
  npm install
  ```

---

## Task 2: mcp-crypto types + middleware (TDD)

**Files:** `packages/mcp-crypto/src/types.ts`, `packages/mcp-crypto/src/middleware.ts`, `packages/mcp-crypto/tests/middleware.test.ts`

- [ ] **Step 2.1 — Write tests/middleware.test.ts first**

  ```typescript
  // packages/mcp-crypto/tests/middleware.test.ts
  import { describe, it, expect, beforeEach } from 'vitest'
  import express from 'express'
  import request from 'supertest'
  import { createPaymentMiddleware, getActivityLog, clearActivityLog } from '../src/middleware'

  const opts = {
    getToolPrice: (name: string) => name === 'get_market_data' ? '0.02' : '0.01',
    payee:        '0xPayee',
    mcpName:      'crypto',
    usdcContract: '0x5dEaC602762362FE5f135FA5904351916053cF70'
  }

  function buildApp() {
    const app = express()
    app.use(express.json())
    app.use(createPaymentMiddleware(opts))
    app.post('/mcp', (_req, res) => res.json({ ok: true }))
    return app
  }

  beforeEach(() => clearActivityLog())

  describe('x402 middleware', () => {
    it('allows tools/list without payment', async () => {
      const res = await request(buildApp())
        .post('/mcp')
        .send({ method: 'tools/list' })
      expect(res.status).toBe(200)
    })

    it('returns 402 for tools/call with no x-payment header', async () => {
      const res = await request(buildApp())
        .post('/mcp')
        .send({ method: 'tools/call', params: { name: 'get_price' } })
      expect(res.status).toBe(402)
      expect(res.body.error).toBe('Payment Required')
    })

    it('402 body includes correct price from getToolPrice', async () => {
      const res = await request(buildApp())
        .post('/mcp')
        .send({ method: 'tools/call', params: { name: 'get_market_data' } })
      expect(res.status).toBe(402)
      expect(res.body.accepts[0].maxAmountRequired).toBe('20000')
    })

    it('memo format is tollgate-{mcpName}-{toolName}', async () => {
      const res = await request(buildApp())
        .post('/mcp')
        .send({ method: 'tools/call', params: { name: 'get_price' } })
      expect(res.body.accepts[0].memo).toBe('tollgate-crypto-get_price')
    })

    it('passes request with valid x-payment header', async () => {
      const payload = Buffer.from(JSON.stringify({
        paymentAmount: 10000,
        payerAddress: '0xUser',
        txSignature: '0xsig',
        toolName: 'get_price'
      })).toString('base64')
      const res = await request(buildApp())
        .post('/mcp')
        .set('x-payment', payload)
        .send({ method: 'tools/call', params: { name: 'get_price' } })
      expect(res.status).toBe(200)
    })

    it('rejects underpayment', async () => {
      const payload = Buffer.from(JSON.stringify({
        paymentAmount: 1,
        payerAddress: '0xUser'
      })).toString('base64')
      const res = await request(buildApp())
        .post('/mcp')
        .set('x-payment', payload)
        .send({ method: 'tools/call', params: { name: 'get_price' } })
      expect(res.status).toBe(402)
      expect(res.body.error).toBe('Underpayment')
    })

    it('logs ActivityEvent on successful payment', async () => {
      const payload = Buffer.from(JSON.stringify({
        paymentAmount: 10000,
        payerAddress: '0xUser',
        txSignature: '0xsig',
        toolName: 'get_price'
      })).toString('base64')
      await request(buildApp())
        .post('/mcp')
        .set('x-payment', payload)
        .send({ method: 'tools/call', params: { name: 'get_price' } })
      expect(getActivityLog()).toHaveLength(1)
      expect(getActivityLog()[0].tool).toBe('get_price')
      expect(getActivityLog()[0].caller).toBe('0xUser')
    })
  })
  ```

- [ ] **Step 2.2 — Run tests, confirm they fail**
  ```bash
  cd packages/mcp-crypto && npm test
  ```
  Expected: FAIL — modules not found

- [ ] **Step 2.3 — Write src/types.ts** (exact content from Shared Patterns section)

- [ ] **Step 2.4 — Write src/middleware.ts** (exact content from Shared Patterns section)

- [ ] **Step 2.5 — Run tests, confirm they pass**
  ```bash
  cd packages/mcp-crypto && npm test
  ```
  Expected: 7 tests passing

- [ ] **Step 2.6 — Commit**
  ```bash
  git add packages/mcp-crypto/src/types.ts packages/mcp-crypto/src/middleware.ts packages/mcp-crypto/tests/middleware.test.ts packages/mcp-crypto/package.json packages/mcp-crypto/tsconfig.json packages/mcp-crypto/vitest.config.ts packages/mcp-crypto/.env.example
  git commit -m "feat(mcp-crypto): scaffold + types + x402 middleware"
  ```

---

## Task 3: mcp-crypto manifest + tools (TDD)

**Files:** `src/manifest.ts`, `src/tools/get-price.ts`, `src/tools/get-trending.ts`, `src/tools/get-market-data.ts`, `tests/get-price.test.ts`, `tests/get-trending.test.ts`, `tests/get-market-data.test.ts`

- [ ] **Step 3.1 — Write tests/get-price.test.ts**

  ```typescript
  // packages/mcp-crypto/tests/get-price.test.ts
  import { describe, it, expect, vi, afterEach } from 'vitest'
  import { getPrice } from '../src/tools/get-price'

  afterEach(() => vi.restoreAllMocks())

  describe('getPrice', () => {
    it('returns all 5 required outputSchema fields for ethereum', async () => {
      vi.stubGlobal('fetch', async () => ({
        json: async () => ({ ethereum: { usd: 3000.50 } })
      }))
      const result = await getPrice({ token: 'ethereum' })
      expect(result.token).toBe('ethereum')
      expect(typeof result.price_usd).toBe('number')
      expect(result.currency).toBe('USD')
      expect(result.source).toBe('coingecko')
      expect(typeof result.timestamp).toBe('number')
    })

    it('price_usd is a number not a string', async () => {
      vi.stubGlobal('fetch', async () => ({
        json: async () => ({ bitcoin: { usd: 50000 } })
      }))
      const result = await getPrice({ token: 'bitcoin' })
      expect(typeof result.price_usd).toBe('number')
    })

    it('throws for unknown token', async () => {
      vi.stubGlobal('fetch', async () => ({
        json: async () => ({})
      }))
      await expect(getPrice({ token: 'notareal' })).rejects.toThrow('Token "notareal" not found')
    })
  })
  ```

- [ ] **Step 3.2 — Write tests/get-trending.test.ts**

  ```typescript
  // packages/mcp-crypto/tests/get-trending.test.ts
  import { describe, it, expect, vi, afterEach } from 'vitest'
  import { getTrending } from '../src/tools/get-trending'

  afterEach(() => vi.restoreAllMocks())

  describe('getTrending', () => {
    it('returns tokens array with fetched_at timestamp', async () => {
      const mockCoins = Array.from({ length: 7 }, (_, i) => ({
        item: { name: `Token${i}`, symbol: `T${i}`, market_cap_rank: i + 1, price_btc: 0.001 }
      }))
      vi.stubGlobal('fetch', async () => ({
        json: async () => ({ coins: mockCoins })
      }))
      const result = await getTrending()
      expect(Array.isArray(result.tokens)).toBe(true)
      expect(result.tokens).toHaveLength(7)
      expect(typeof result.fetched_at).toBe('number')
    })

    it('each token has name, symbol, market_cap_rank, price_btc', async () => {
      const mockCoins = [{ item: { name: 'Eth', symbol: 'ETH', market_cap_rank: 2, price_btc: 0.05 } }]
      vi.stubGlobal('fetch', async () => ({
        json: async () => ({ coins: mockCoins })
      }))
      const result = await getTrending()
      expect(result.tokens[0]).toMatchObject({ name: 'Eth', symbol: 'ETH', market_cap_rank: 2, price_btc: 0.05 })
    })
  })
  ```

- [ ] **Step 3.3 — Write tests/get-market-data.test.ts**

  ```typescript
  // packages/mcp-crypto/tests/get-market-data.test.ts
  import { describe, it, expect, vi, afterEach } from 'vitest'
  import { getMarketData } from '../src/tools/get-market-data'

  afterEach(() => vi.restoreAllMocks())

  const mockCoinResponse = {
    market_data: {
      current_price: { usd: 3000 },
      market_cap:    { usd: 350_000_000_000 },
      total_volume:  { usd: 15_000_000_000 },
      price_change_percentage_24h: 2.5,
      price_change_percentage_7d:  -1.2
    }
  }

  describe('getMarketData', () => {
    it('returns all 8 required fields', async () => {
      vi.stubGlobal('fetch', async () => ({ status: 200, json: async () => mockCoinResponse }))
      const result = await getMarketData({ token: 'ethereum' })
      expect(result.token).toBe('ethereum')
      expect(typeof result.price_usd).toBe('number')
      expect(typeof result.market_cap).toBe('number')
      expect(typeof result.volume_24h).toBe('number')
      expect(typeof result.change_24h).toBe('number')
      expect(typeof result.change_7d).toBe('number')
      expect(result.source).toBe('coingecko')
      expect(typeof result.timestamp).toBe('number')
    })

    it('throws CoinGecko rate limit error on 429', async () => {
      vi.stubGlobal('fetch', async () => ({ status: 429, json: async () => ({}) }))
      await expect(getMarketData({ token: 'ethereum' })).rejects.toThrow('CoinGecko rate limit')
    })
  })
  ```

- [ ] **Step 3.4 — Run tests, confirm failures**
  ```bash
  cd packages/mcp-crypto && npm test
  ```
  Expected: FAIL — tool files not found

- [ ] **Step 3.5 — Write src/manifest.ts**

  ```typescript
  // packages/mcp-crypto/src/manifest.ts
  import 'dotenv/config'
  import type { TollgateManifest } from './types'

  export const manifest: TollgateManifest = {
    ens:          process.env.ENS_NAME     ?? 'crypto.tollgate.eth',
    version:      '1.0',
    description:  'Real-time crypto prices, trending tokens, and market data',
    category:     'finance',
    payee:        process.env.PAYEE_WALLET ?? '',
    chain:        'base-sepolia',
    usdcContract: '0x5dEaC602762362FE5f135FA5904351916053cF70',
    defaultPrice: '0.01',
    tools: [
      {
        name:        'get_price',
        description: 'Get the current USD price for a token',
        price:       '0.01',
        inputSchema: {
          token: { type: 'string', required: true, description: 'CoinGecko ID e.g. bitcoin, ethereum', example: 'ethereum' }
        },
        outputSchema: {
          token:     { type: 'string', required: true },
          price_usd: { type: 'number', required: true },
          currency:  { type: 'string', required: true, enum: ['USD'] },
          source:    { type: 'string', required: true },
          timestamp: { type: 'number', required: true }
        }
      },
      {
        name:        'get_trending',
        description: 'Get the top 7 trending tokens right now',
        price:       '0.01',
        inputSchema: {},
        outputSchema: {
          tokens:     { type: 'array',  required: true, description: '[{ name, symbol, market_cap_rank, price_btc }]' },
          fetched_at: { type: 'number', required: true }
        }
      },
      {
        name:        'get_market_data',
        description: 'Full market data: price, cap, volume, 24h/7d change',
        price:       '0.02',
        inputSchema: {
          token: { type: 'string', required: true, example: 'ethereum' }
        },
        outputSchema: {
          token:      { type: 'string', required: true },
          price_usd:  { type: 'number', required: true },
          market_cap: { type: 'number', required: true },
          volume_24h: { type: 'number', required: true },
          change_24h: { type: 'number', required: true },
          change_7d:  { type: 'number', required: true },
          source:     { type: 'string', required: true },
          timestamp:  { type: 'number', required: true }
        }
      }
    ],
    updatedAt: new Date().toISOString()
  }
  ```

- [ ] **Step 3.6 — Write src/tools/get-price.ts**

  ```typescript
  // packages/mcp-crypto/src/tools/get-price.ts
  const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

  export async function getPrice(input: { token: string }) {
    await delay(300)
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${input.token}&vs_currencies=usd`
    )
    const json = await res.json() as Record<string, { usd?: number }>
    if (!json[input.token]) throw new Error(`Token "${input.token}" not found`)
    return {
      token:     input.token,
      price_usd: json[input.token].usd as number,
      currency:  'USD' as const,
      source:    'coingecko',
      timestamp: Date.now()
    }
  }
  ```

- [ ] **Step 3.7 — Write src/tools/get-trending.ts**

  ```typescript
  // packages/mcp-crypto/src/tools/get-trending.ts
  const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

  let trendingCache: { tokens: unknown[]; fetched_at: number } | null = null
  let cacheTime = 0

  export async function getTrending() {
    if (trendingCache && Date.now() - cacheTime < 60_000) {
      return trendingCache
    }
    await delay(300)
    const res = await fetch('https://api.coingecko.com/api/v3/search/trending')
    const json = await res.json() as { coins: Array<{ item: unknown }> }
    const tokens = json.coins.slice(0, 7).map((c) => c.item)
    trendingCache = { tokens, fetched_at: Date.now() }
    cacheTime = Date.now()
    return trendingCache
  }
  ```

- [ ] **Step 3.8 — Write src/tools/get-market-data.ts**

  ```typescript
  // packages/mcp-crypto/src/tools/get-market-data.ts
  const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

  interface CoinGeckoMarket {
    market_data: {
      current_price:               { usd: number }
      market_cap:                  { usd: number }
      total_volume:                { usd: number }
      price_change_percentage_24h: number
      price_change_percentage_7d:  number
    }
  }

  export async function getMarketData(input: { token: string }) {
    await delay(300)
    const res = await fetch(`https://api.coingecko.com/api/v3/coins/${input.token}`)
    if (res.status === 429) throw new Error('CoinGecko rate limit — wait 60 seconds')
    const json = await res.json() as CoinGeckoMarket
    return {
      token:      input.token,
      price_usd:  json.market_data.current_price.usd,
      market_cap: json.market_data.market_cap.usd,
      volume_24h: json.market_data.total_volume.usd,
      change_24h: json.market_data.price_change_percentage_24h,
      change_7d:  json.market_data.price_change_percentage_7d,
      source:     'coingecko',
      timestamp:  Date.now()
    }
  }
  ```

- [ ] **Step 3.9 — Run tool tests, confirm pass**
  ```bash
  cd packages/mcp-crypto && npm test
  ```
  Expected: all tool tests + middleware tests pass

- [ ] **Step 3.10 — Commit**
  ```bash
  git add packages/mcp-crypto/src/ packages/mcp-crypto/tests/
  git commit -m "feat(mcp-crypto): manifest + tools (get_price, get_trending, get_market_data)"
  ```

---

## Task 4: mcp-crypto server + index + manifest endpoint

**Files:** `src/server.ts`, `src/index.ts`, `tests/server.test.ts`

- [ ] **Step 4.1 — Write tests/server.test.ts**

  ```typescript
  // packages/mcp-crypto/tests/server.test.ts
  import { describe, it, expect, beforeEach, vi } from 'vitest'
  import request from 'supertest'
  import { createServer } from '../src/server'

  process.env.PAYEE_WALLET  = '0xTestPayee'
  process.env.MCP_NAME      = 'crypto'
  process.env.USDC_CONTRACT = '0x5dEaC602762362FE5f135FA5904351916053cF70'

  describe('mcp-crypto server', () => {
    it('tools/call without payment returns 402', async () => {
      const app = createServer()
      const res = await request(app)
        .post('/mcp')
        .send({ method: 'tools/call', params: { name: 'get_price' } })
      expect(res.status).toBe(402)
    })

    it('tools/list returns 200 without payment', async () => {
      const app = createServer()
      const res = await request(app)
        .post('/mcp')
        .send({ method: 'tools/list' })
      expect(res.status).not.toBe(402)
    })
  })
  ```

- [ ] **Step 4.2 — Write src/server.ts**

  ```typescript
  // packages/mcp-crypto/src/server.ts
  import express from 'express'
  import path from 'path'
  import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
  import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
  import { z } from 'zod'
  import { manifest } from './manifest'
  import { createPaymentMiddleware } from './middleware'
  import { getPrice } from './tools/get-price'
  import { getTrending } from './tools/get-trending'
  import { getMarketData } from './tools/get-market-data'

  export function createServer() {
    const app = express()
    app.use(express.json())
    app.use(express.static(path.join(__dirname, '..', 'public')))

    app.use(createPaymentMiddleware({
      getToolPrice: (name) =>
        manifest.tools.find(t => t.name === name)?.price ?? manifest.defaultPrice,
      payee:        process.env.PAYEE_WALLET ?? '',
      mcpName:      process.env.MCP_NAME ?? 'crypto',
      usdcContract: process.env.USDC_CONTRACT ?? ''
    }))

    const mcpServer = new McpServer({ name: manifest.ens, version: manifest.version })

    mcpServer.tool('get_price', { token: z.string() }, async ({ token }) => {
      const result = await getPrice({ token })
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] }
    })

    mcpServer.tool('get_trending', {}, async () => {
      const result = await getTrending()
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] }
    })

    mcpServer.tool('get_market_data', { token: z.string() }, async ({ token }) => {
      const result = await getMarketData({ token })
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] }
    })

    app.post('/mcp', async (req, res) => {
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
      res.on('close', () => transport.close())
      await mcpServer.connect(transport)
      await transport.handleRequest(req, res, req.body)
    })

    app.get('/mcp', async (req, res) => {
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
      res.on('close', () => transport.close())
      await mcpServer.connect(transport)
      await transport.handleRequest(req, res)
    })

    return app
  }
  ```

- [ ] **Step 4.3 — Write src/index.ts**

  ```typescript
  // packages/mcp-crypto/src/index.ts
  import 'dotenv/config'
  import fs from 'fs'
  import path from 'path'
  import { manifest } from './manifest'
  import { createServer } from './server'

  function validateEnv() {
    const payee = process.env.PAYEE_WALLET
    if (!payee || !payee.startsWith('0x')) throw new Error('PAYEE_WALLET must be set and start with 0x')
    for (const tool of manifest.tools) {
      if (parseFloat(tool.price) <= 0) throw new Error(`Tool ${tool.name} has invalid price`)
    }
  }

  function writeManifest() {
    const dir = path.join(__dirname, '..', 'public', '.well-known')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'tollgate.json'), JSON.stringify(manifest, null, 2))
    console.log(`✓ Manifest written: ${manifest.tools.length} tools`)
    for (const tool of manifest.tools) console.log(`  ${tool.name}: $${tool.price}`)
  }

  validateEnv()
  writeManifest()

  const port = parseInt(process.env.PORT ?? '3001', 10)
  createServer().listen(port, () => console.log(`${manifest.ens} running on :${port}`))
  ```

- [ ] **Step 4.4 — Run all tests**
  ```bash
  cd packages/mcp-crypto && npm test
  ```
  Expected: all tests pass

- [ ] **Step 4.5 — Test build compiles**
  ```bash
  cd packages/mcp-crypto && npm run build
  ```
  Expected: `dist/` produced, no TypeScript errors

- [ ] **Step 4.6 — Commit**
  ```bash
  git add packages/mcp-crypto/src/server.ts packages/mcp-crypto/src/index.ts packages/mcp-crypto/tests/server.test.ts
  git commit -m "feat(mcp-crypto): server + index — complete, all tests pass"
  ```

---

## Task 5: Scaffold + types + middleware for mcp-weather

**Files:** All config and foundation files for `packages/mcp-weather/`

- [ ] **Step 5.1 — Create packages/mcp-weather/package.json**

  ```json
  {
    "name": "@tollgate/mcp-weather",
    "version": "1.0.0",
    "private": true,
    "main": "dist/index.js",
    "scripts": {
      "build": "tsc",
      "start": "node dist/index.js",
      "dev": "tsx src/index.ts",
      "test": "vitest run",
      "test:watch": "vitest"
    },
    "dependencies": {
      "@modelcontextprotocol/sdk": "^1.11.0",
      "express": "^4.21.0",
      "zod": "^3.23.0",
      "dotenv": "^16.4.0"
    },
    "devDependencies": {
      "vitest": "^2.1.0",
      "supertest": "^7.0.0",
      "@types/supertest": "^6.0.0",
      "typescript": "^5.6.0",
      "@types/express": "^5.0.0",
      "@types/node": "^22.0.0",
      "tsx": "^4.19.0"
    }
  }
  ```

- [ ] **Step 5.2 — Create tsconfig.json and vitest.config.ts** (use Shared Patterns templates)

- [ ] **Step 5.3 — Create .env.example**
  ```
  PORT=3002
  MCP_NAME=weather
  ENS_NAME=weather.tollgate.eth
  PAYEE_WALLET=0x...
  USDC_CONTRACT=0x5dEaC602762362FE5f135FA5904351916053cF70
  ```

- [ ] **Step 5.4 — Create directories and install**
  ```bash
  cd packages/mcp-weather
  mkdir -p src/tools src/data tests public/.well-known
  npm install
  ```

- [ ] **Step 5.5 — Copy types.ts and middleware.ts from mcp-crypto**
  ```bash
  cp packages/mcp-crypto/src/types.ts packages/mcp-weather/src/types.ts
  cp packages/mcp-crypto/src/middleware.ts packages/mcp-weather/src/middleware.ts
  ```

- [ ] **Step 5.6 — Copy tests/middleware.test.ts and update mcpName**

  Copy `packages/mcp-crypto/tests/middleware.test.ts` to `packages/mcp-weather/tests/middleware.test.ts`, then change:
  - `mcpName: 'crypto'` → `mcpName: 'weather'`
  - `memo: 'tollgate-crypto-get_price'` → `memo: 'tollgate-weather-get_weather'`
  - `params: { name: 'get_market_data' }` → `params: { name: 'get_forecast' }` (the $0.01 price)
  - Keep `maxAmountRequired: '10000'` (both tools are $0.01 for weather)
  - Update `getToolPrice` to always return `'0.01'`

- [ ] **Step 5.7 — Run middleware tests, confirm pass**
  ```bash
  cd packages/mcp-weather && npm test
  ```
  Expected: 7 tests pass

- [ ] **Step 5.8 — Commit**
  ```bash
  git add packages/mcp-weather/
  git commit -m "feat(mcp-weather): scaffold + types + middleware"
  ```

---

## Task 6: mcp-weather data layer + tools (TDD)

**Files:** `src/data/open-meteo.ts`, `src/tools/get-weather.ts`, `src/tools/get-forecast.ts`, tests

- [ ] **Step 6.1 — Write tests/open-meteo.test.ts**

  ```typescript
  // packages/mcp-weather/tests/open-meteo.test.ts
  import { describe, it, expect, vi, afterEach } from 'vitest'
  import { geocodeCity, wmoToCondition } from '../src/data/open-meteo'

  afterEach(() => vi.restoreAllMocks())

  describe('geocodeCity', () => {
    it('returns lat/lng/displayName for London', async () => {
      vi.stubGlobal('fetch', async () => ({
        json: async () => ({
          results: [{ latitude: 51.5, longitude: -0.12, name: 'London', country: 'United Kingdom' }]
        })
      }))
      const result = await geocodeCity('London')
      expect(result.lat).toBe(51.5)
      expect(result.lng).toBe(-0.12)
      expect(result.displayName).toBe('London, United Kingdom')
    })

    it('throws for invalid city', async () => {
      vi.stubGlobal('fetch', async () => ({ json: async () => ({ results: [] }) }))
      await expect(geocodeCity('zzzznotacity')).rejects.toThrow('City "zzzznotacity" not found')
    })
  })

  describe('wmoToCondition', () => {
    it('returns Clear sky for code 0', () => { expect(wmoToCondition(0)).toBe('Clear sky') })
    it('returns Partly cloudy for code 2', () => { expect(wmoToCondition(2)).toBe('Partly cloudy') })
    it('returns Rain for code 61', () => { expect(wmoToCondition(61)).toBe('Rain') })
    it('returns Thunderstorm for code 95', () => { expect(wmoToCondition(95)).toBe('Thunderstorm') })
  })
  ```

- [ ] **Step 6.2 — Write tests/get-weather.test.ts**

  ```typescript
  // packages/mcp-weather/tests/get-weather.test.ts
  import { describe, it, expect, vi, afterEach } from 'vitest'
  import { getWeather } from '../src/tools/get-weather'

  afterEach(() => vi.restoreAllMocks())

  const geocodeResponse = { results: [{ latitude: 51.5, longitude: -0.12, name: 'London', country: 'United Kingdom' }] }
  const weatherResponse = {
    current: {
      temperature_2m: 15.2,
      relative_humidity_2m: 72,
      wind_speed_10m: 12.5,
      weather_code: 2
    }
  }

  describe('getWeather', () => {
    it('returns all 9 required fields', async () => {
      let call = 0
      vi.stubGlobal('fetch', async () => ({
        json: async () => call++ === 0 ? geocodeResponse : weatherResponse
      }))
      const result = await getWeather({ city: 'London' })
      expect(result.city).toBe('London, United Kingdom')
      expect(typeof result.latitude).toBe('number')
      expect(typeof result.longitude).toBe('number')
      expect(typeof result.temp_c).toBe('number')
      expect(typeof result.humidity_pct).toBe('number')
      expect(typeof result.wind_kmh).toBe('number')
      expect(typeof result.condition).toBe('string')
      expect(result.condition.length).toBeGreaterThan(0)
      expect(result.source).toBe('open-meteo')
      expect(typeof result.timestamp).toBe('number')
    })

    it('temp_c is a number not a string', async () => {
      let call = 0
      vi.stubGlobal('fetch', async () => ({
        json: async () => call++ === 0 ? geocodeResponse : weatherResponse
      }))
      const result = await getWeather({ city: 'London' })
      expect(typeof result.temp_c).toBe('number')
    })
  })
  ```

- [ ] **Step 6.3 — Write tests/get-forecast.test.ts**

  ```typescript
  // packages/mcp-weather/tests/get-forecast.test.ts
  import { describe, it, expect, vi, afterEach } from 'vitest'
  import { getForecast } from '../src/tools/get-forecast'

  afterEach(() => vi.restoreAllMocks())

  const geocodeResponse = { results: [{ latitude: 51.5, longitude: -0.12, name: 'London', country: 'United Kingdom' }] }
  const forecastResponse = {
    daily: {
      time:                ['2026-05-03', '2026-05-04', '2026-05-05'],
      temperature_2m_max:  [18, 20, 17],
      temperature_2m_min:  [10, 12, 9],
      weather_code:        [0, 61, 2]
    }
  }

  describe('getForecast', () => {
    it('returns forecast array with 3 items for days=3', async () => {
      let call = 0
      vi.stubGlobal('fetch', async () => ({
        json: async () => call++ === 0 ? geocodeResponse : forecastResponse
      }))
      const result = await getForecast({ city: 'London', days: 3 })
      expect(result.forecast).toHaveLength(3)
      expect(result.source).toBe('open-meteo')
      expect(typeof result.timestamp).toBe('number')
    })

    it('each forecast item has date, high_c, low_c, condition', async () => {
      let call = 0
      vi.stubGlobal('fetch', async () => ({
        json: async () => call++ === 0 ? geocodeResponse : forecastResponse
      }))
      const result = await getForecast({ city: 'London' })
      expect(result.forecast[0]).toMatchObject({
        date: '2026-05-03',
        high_c: 18,
        low_c: 10,
        condition: 'Clear sky'
      })
    })
  })
  ```

- [ ] **Step 6.4 — Run tests, confirm failures**
  ```bash
  cd packages/mcp-weather && npm test
  ```
  Expected: FAIL — source files missing

- [ ] **Step 6.5 — Write src/data/open-meteo.ts**

  ```typescript
  // packages/mcp-weather/src/data/open-meteo.ts
  export async function geocodeCity(city: string): Promise<{ lat: number; lng: number; displayName: string }> {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
    )
    const json = await res.json() as { results?: Array<{ latitude: number; longitude: number; name: string; country: string }> }
    if (!json.results?.length) throw new Error(`City "${city}" not found`)
    const { latitude, longitude, name, country } = json.results[0]
    return { lat: latitude, lng: longitude, displayName: `${name}, ${country}` }
  }

  export function wmoToCondition(code: number): string {
    if (code === 0)   return 'Clear sky'
    if (code <= 3)    return 'Partly cloudy'
    if (code <= 48)   return 'Fog'
    if (code <= 67)   return 'Rain'
    if (code <= 77)   return 'Snow'
    if (code <= 82)   return 'Rain showers'
    if (code <= 99)   return 'Thunderstorm'
    return 'Unknown'
  }
  ```

- [ ] **Step 6.6 — Write src/tools/get-weather.ts**

  ```typescript
  // packages/mcp-weather/src/tools/get-weather.ts
  import { geocodeCity, wmoToCondition } from '../data/open-meteo'

  interface OpenMeteoCurrentResponse {
    current: {
      temperature_2m:          number
      relative_humidity_2m:    number
      wind_speed_10m:          number
      weather_code:            number
    }
  }

  export async function getWeather(input: { city: string }) {
    const { lat, lng, displayName } = await geocodeCity(input.city)
    const params = new URLSearchParams({
      latitude:  lat.toString(),
      longitude: lng.toString(),
      current:   'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code',
      wind_speed_unit: 'kmh'
    })
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
    const json = await res.json() as OpenMeteoCurrentResponse
    return {
      city:         displayName,
      latitude:     lat,
      longitude:    lng,
      temp_c:       json.current.temperature_2m,
      humidity_pct: json.current.relative_humidity_2m,
      wind_kmh:     json.current.wind_speed_10m,
      condition:    wmoToCondition(json.current.weather_code),
      source:       'open-meteo',
      timestamp:    Date.now()
    }
  }
  ```

- [ ] **Step 6.7 — Write src/tools/get-forecast.ts**

  ```typescript
  // packages/mcp-weather/src/tools/get-forecast.ts
  import { geocodeCity, wmoToCondition } from '../data/open-meteo'

  interface OpenMeteoForecastResponse {
    daily: {
      time:                string[]
      temperature_2m_max:  number[]
      temperature_2m_min:  number[]
      weather_code:        number[]
    }
  }

  export async function getForecast(input: { city: string; days?: number }) {
    const days = Math.min(input.days ?? 3, 7)
    const { lat, lng, displayName } = await geocodeCity(input.city)
    const params = new URLSearchParams({
      latitude:      lat.toString(),
      longitude:     lng.toString(),
      daily:         'temperature_2m_max,temperature_2m_min,weather_code',
      forecast_days: days.toString(),
      timezone:      'auto'
    })
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
    const json = await res.json() as OpenMeteoForecastResponse
    const forecast = json.daily.time.map((date, i) => ({
      date,
      high_c:    json.daily.temperature_2m_max[i],
      low_c:     json.daily.temperature_2m_min[i],
      condition: wmoToCondition(json.daily.weather_code[i])
    }))
    return { city: displayName, forecast, source: 'open-meteo', timestamp: Date.now() }
  }
  ```

- [ ] **Step 6.8 — Run tests, confirm pass**
  ```bash
  cd packages/mcp-weather && npm test
  ```
  Expected: all tests pass

- [ ] **Step 6.9 — Commit**
  ```bash
  git add packages/mcp-weather/src/ packages/mcp-weather/tests/
  git commit -m "feat(mcp-weather): data layer + tools (get_weather, get_forecast)"
  ```

---

## Task 7: mcp-weather manifest + server + index

**Files:** `src/manifest.ts`, `src/server.ts`, `src/index.ts`, `tests/server.test.ts`

- [ ] **Step 7.1 — Write tests/server.test.ts**

  ```typescript
  // packages/mcp-weather/tests/server.test.ts
  import { describe, it, expect } from 'vitest'
  import request from 'supertest'
  import { createServer } from '../src/server'

  process.env.PAYEE_WALLET  = '0xTestPayee'
  process.env.MCP_NAME      = 'weather'
  process.env.USDC_CONTRACT = '0x5dEaC602762362FE5f135FA5904351916053cF70'

  describe('mcp-weather server', () => {
    it('tools/call without payment returns 402', async () => {
      const res = await request(createServer())
        .post('/mcp')
        .send({ method: 'tools/call', params: { name: 'get_weather' } })
      expect(res.status).toBe(402)
    })

    it('tools/list passes without payment', async () => {
      const res = await request(createServer())
        .post('/mcp')
        .send({ method: 'tools/list' })
      expect(res.status).not.toBe(402)
    })
  })
  ```

- [ ] **Step 7.2 — Write src/manifest.ts**

  ```typescript
  // packages/mcp-weather/src/manifest.ts
  import 'dotenv/config'
  import type { TollgateManifest } from './types'

  export const manifest: TollgateManifest = {
    ens:          process.env.ENS_NAME     ?? 'weather.tollgate.eth',
    version:      '1.0',
    description:  'Current weather and forecasts for any city worldwide',
    category:     'weather',
    payee:        process.env.PAYEE_WALLET ?? '',
    chain:        'base-sepolia',
    usdcContract: '0x5dEaC602762362FE5f135FA5904351916053cF70',
    defaultPrice: '0.01',
    tools: [
      {
        name:        'get_weather',
        description: 'Get current weather conditions for a city',
        price:       '0.01',
        inputSchema: {
          city: { type: 'string', required: true, example: 'London' }
        },
        outputSchema: {
          city:         { type: 'string', required: true },
          latitude:     { type: 'number', required: true },
          longitude:    { type: 'number', required: true },
          temp_c:       { type: 'number', required: true },
          humidity_pct: { type: 'number', required: true },
          wind_kmh:     { type: 'number', required: true },
          condition:    { type: 'string', required: true },
          source:       { type: 'string', required: true },
          timestamp:    { type: 'number', required: true }
        }
      },
      {
        name:        'get_forecast',
        description: 'Multi-day weather forecast for a city',
        price:       '0.01',
        inputSchema: {
          city: { type: 'string', required: true },
          days: { type: 'number', required: false, description: '1-7, default 3' }
        },
        outputSchema: {
          city:      { type: 'string', required: true },
          forecast:  { type: 'array',  required: true, description: '[{ date, high_c, low_c, condition }]' },
          source:    { type: 'string', required: true },
          timestamp: { type: 'number', required: true }
        }
      }
    ],
    updatedAt: new Date().toISOString()
  }
  ```

- [ ] **Step 7.3 — Write src/server.ts**

  ```typescript
  // packages/mcp-weather/src/server.ts
  import express from 'express'
  import path from 'path'
  import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
  import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
  import { z } from 'zod'
  import { manifest } from './manifest'
  import { createPaymentMiddleware } from './middleware'
  import { getWeather } from './tools/get-weather'
  import { getForecast } from './tools/get-forecast'

  export function createServer() {
    const app = express()
    app.use(express.json())
    app.use(express.static(path.join(__dirname, '..', 'public')))

    app.use(createPaymentMiddleware({
      getToolPrice: (name) =>
        manifest.tools.find(t => t.name === name)?.price ?? manifest.defaultPrice,
      payee:        process.env.PAYEE_WALLET ?? '',
      mcpName:      process.env.MCP_NAME ?? 'weather',
      usdcContract: process.env.USDC_CONTRACT ?? ''
    }))

    const mcpServer = new McpServer({ name: manifest.ens, version: manifest.version })

    mcpServer.tool('get_weather', { city: z.string() }, async ({ city }) => {
      const result = await getWeather({ city })
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] }
    })

    mcpServer.tool('get_forecast', { city: z.string(), days: z.number().optional() }, async ({ city, days }) => {
      const result = await getForecast({ city, days })
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] }
    })

    app.post('/mcp', async (req, res) => {
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
      res.on('close', () => transport.close())
      await mcpServer.connect(transport)
      await transport.handleRequest(req, res, req.body)
    })

    app.get('/mcp', async (req, res) => {
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
      res.on('close', () => transport.close())
      await mcpServer.connect(transport)
      await transport.handleRequest(req, res)
    })

    return app
  }
  ```

- [ ] **Step 7.4 — Write src/index.ts**

  ```typescript
  // packages/mcp-weather/src/index.ts
  import 'dotenv/config'
  import fs from 'fs'
  import path from 'path'
  import { manifest } from './manifest'
  import { createServer } from './server'

  function validateEnv() {
    const payee = process.env.PAYEE_WALLET
    if (!payee || !payee.startsWith('0x')) throw new Error('PAYEE_WALLET must be set and start with 0x')
    for (const tool of manifest.tools) {
      if (parseFloat(tool.price) <= 0) throw new Error(`Tool ${tool.name} has invalid price`)
    }
  }

  function writeManifest() {
    const dir = path.join(__dirname, '..', 'public', '.well-known')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'tollgate.json'), JSON.stringify(manifest, null, 2))
    console.log(`✓ Manifest written: ${manifest.tools.length} tools`)
    for (const tool of manifest.tools) console.log(`  ${tool.name}: $${tool.price}`)
  }

  validateEnv()
  writeManifest()

  const port = parseInt(process.env.PORT ?? '3002', 10)
  createServer().listen(port, () => console.log(`${manifest.ens} running on :${port}`))
  ```

- [ ] **Step 7.5 — Run all tests and build**
  ```bash
  cd packages/mcp-weather && npm test && npm run build
  ```
  Expected: all tests pass, `dist/` produced

- [ ] **Step 7.6 — Commit**
  ```bash
  git add packages/mcp-weather/src/manifest.ts packages/mcp-weather/src/server.ts packages/mcp-weather/src/index.ts packages/mcp-weather/tests/server.test.ts
  git commit -m "feat(mcp-weather): manifest + server + index — complete"
  ```

---

## Task 8: Scaffold + types + middleware for mcp-chain

**Files:** All config and foundation files for `packages/mcp-chain/`

- [ ] **Step 8.1 — Create packages/mcp-chain/package.json**

  ```json
  {
    "name": "@tollgate/mcp-chain",
    "version": "1.0.0",
    "private": true,
    "main": "dist/index.js",
    "scripts": {
      "build": "tsc",
      "start": "node dist/index.js",
      "dev": "tsx src/index.ts",
      "test": "vitest run",
      "test:watch": "vitest"
    },
    "dependencies": {
      "@modelcontextprotocol/sdk": "^1.11.0",
      "express": "^4.21.0",
      "zod": "^3.23.0",
      "viem": "^2.21.0",
      "dotenv": "^16.4.0"
    },
    "devDependencies": {
      "vitest": "^2.1.0",
      "supertest": "^7.0.0",
      "@types/supertest": "^6.0.0",
      "typescript": "^5.6.0",
      "@types/express": "^5.0.0",
      "@types/node": "^22.0.0",
      "tsx": "^4.19.0"
    }
  }
  ```

- [ ] **Step 8.2 — Create tsconfig.json and vitest.config.ts** (use Shared Patterns templates)

- [ ] **Step 8.3 — Create .env.example**
  ```
  PORT=3003
  MCP_NAME=chain
  ENS_NAME=chain.tollgate.eth
  PAYEE_WALLET=0x...
  USDC_CONTRACT=0x5dEaC602762362FE5f135FA5904351916053cF70
  ALCHEMY_BASE_SEPOLIA_RPC=https://base-sepolia.g.alchemy.com/v2/YOUR_KEY
  ```

- [ ] **Step 8.4 — Create directories and install**
  ```bash
  cd packages/mcp-chain
  mkdir -p src/tools src/data tests public/.well-known
  npm install
  ```

- [ ] **Step 8.5 — Copy types.ts and middleware.ts**
  ```bash
  cp packages/mcp-crypto/src/types.ts packages/mcp-chain/src/types.ts
  cp packages/mcp-crypto/src/middleware.ts packages/mcp-chain/src/middleware.ts
  ```

- [ ] **Step 8.6 — Copy and adapt middleware test**

  Copy `packages/mcp-crypto/tests/middleware.test.ts` to `packages/mcp-chain/tests/middleware.test.ts`. Update:
  - `mcpName: 'crypto'` → `mcpName: 'chain'`
  - `getToolPrice`: `(name) => name === 'get_token_holdings' || name === 'get_recent_txs' ? '0.02' : '0.01'`
  - The $0.02 test: use `get_token_holdings`, expect `maxAmountRequired: '20000'`
  - memo: `'tollgate-chain-get_eth_balance'`
  - params name for list test: `get_eth_balance`

- [ ] **Step 8.7 — Run tests**
  ```bash
  cd packages/mcp-chain && npm test
  ```
  Expected: 7 middleware tests pass

- [ ] **Step 8.8 — Commit**
  ```bash
  git add packages/mcp-chain/
  git commit -m "feat(mcp-chain): scaffold + types + middleware"
  ```

---

## Task 9: mcp-chain data layer + tools (TDD)

**Files:** `src/data/alchemy.ts`, `src/tools/get-eth-balance.ts`, `src/tools/get-token-holdings.ts`, `src/tools/get-recent-txs.ts`, tests

- [ ] **Step 9.1 — Write tests/alchemy.test.ts**

  ```typescript
  // packages/mcp-chain/tests/alchemy.test.ts
  import { describe, it, expect, vi, afterEach } from 'vitest'
  import { alchemyRpc } from '../src/data/alchemy'

  afterEach(() => vi.restoreAllMocks())

  describe('alchemyRpc', () => {
    it('returns result on success', async () => {
      vi.stubGlobal('fetch', async () => ({
        json: async () => ({ jsonrpc: '2.0', id: 1, result: '0x1' })
      }))
      const result = await alchemyRpc('eth_blockNumber', [])
      expect(result).toBe('0x1')
    })

    it('throws on Alchemy error response', async () => {
      vi.stubGlobal('fetch', async () => ({
        json: async () => ({ error: { message: 'Invalid params' } })
      }))
      await expect(alchemyRpc('eth_call', [])).rejects.toThrow('Alchemy error: Invalid params')
    })
  })
  ```

- [ ] **Step 9.2 — Write tests/get-eth-balance.test.ts**

  ```typescript
  // packages/mcp-chain/tests/get-eth-balance.test.ts
  import { describe, it, expect, vi, afterEach } from 'vitest'

  afterEach(() => vi.restoreAllMocks())

  describe('getEthBalance', () => {
    it('balance_eth is a number, balance_wei is a string', async () => {
      vi.mock('viem', async (importOriginal) => {
        const actual = await importOriginal<typeof import('viem')>()
        return {
          ...actual,
          createPublicClient: () => ({
            getBalance: async () => BigInt('1500000000000000000')
          })
        }
      })
      const { getEthBalance } = await import('../src/tools/get-eth-balance')
      const result = await getEthBalance({ address: '0x1234567890123456789012345678901234567890' })
      expect(typeof result.balance_eth).toBe('number')
      expect(result.balance_eth).toBeCloseTo(1.5, 5)
      expect(typeof result.balance_wei).toBe('string')
      expect(result.chain).toBe('base-sepolia')
      expect(typeof result.timestamp).toBe('number')
    })
  })
  ```

- [ ] **Step 9.3 — Write tests/get-token-holdings.test.ts**

  ```typescript
  // packages/mcp-chain/tests/get-token-holdings.test.ts
  import { describe, it, expect, vi, afterEach } from 'vitest'
  import { getTokenHoldings } from '../src/tools/get-token-holdings'

  afterEach(() => vi.restoreAllMocks())

  describe('getTokenHoldings', () => {
    it('returns non-zero tokens array with chain and timestamp', async () => {
      vi.stubGlobal('fetch', async () => ({
        json: async () => ({
          jsonrpc: '2.0', id: 1,
          result: {
            tokenBalances: [
              { contractAddress: '0xabc', tokenBalance: '0x100' },
              { contractAddress: '0xdef', tokenBalance: '0x0' }
            ]
          }
        })
      }))
      process.env.ALCHEMY_BASE_SEPOLIA_RPC = 'https://fake.rpc'
      const result = await getTokenHoldings({ address: '0x1234567890123456789012345678901234567890' })
      expect(Array.isArray(result.tokens)).toBe(true)
      expect(result.tokens).toHaveLength(1)
      expect(result.chain).toBe('base-sepolia')
      expect(typeof result.timestamp).toBe('number')
    })
  })
  ```

- [ ] **Step 9.4 — Write tests/get-recent-txs.test.ts**

  ```typescript
  // packages/mcp-chain/tests/get-recent-txs.test.ts
  import { describe, it, expect, vi, afterEach } from 'vitest'
  import { getRecentTxs } from '../src/tools/get-recent-txs'

  afterEach(() => vi.restoreAllMocks())

  const mockTransfers = Array.from({ length: 10 }, (_, i) => ({
    hash: `0xhash${i}`,
    from: '0xsender',
    to:   '0xrecipient',
    value: 0.01,
    asset: 'ETH',
    blockNum: `0x${i.toString(16)}`
  }))

  describe('getRecentTxs', () => {
    it('respects limit parameter', async () => {
      vi.stubGlobal('fetch', async () => ({
        json: async () => ({ jsonrpc: '2.0', id: 1, result: { transfers: mockTransfers } })
      }))
      process.env.ALCHEMY_BASE_SEPOLIA_RPC = 'https://fake.rpc'
      const result = await getRecentTxs({ address: '0x1234', limit: 3 })
      expect(result.transactions).toHaveLength(3)
    })

    it('defaults to 5 if no limit given', async () => {
      vi.stubGlobal('fetch', async () => ({
        json: async () => ({ jsonrpc: '2.0', id: 1, result: { transfers: mockTransfers } })
      }))
      process.env.ALCHEMY_BASE_SEPOLIA_RPC = 'https://fake.rpc'
      const result = await getRecentTxs({ address: '0x1234' })
      expect(result.transactions).toHaveLength(5)
    })

    it('includes chain and timestamp', async () => {
      vi.stubGlobal('fetch', async () => ({
        json: async () => ({ jsonrpc: '2.0', id: 1, result: { transfers: mockTransfers } })
      }))
      process.env.ALCHEMY_BASE_SEPOLIA_RPC = 'https://fake.rpc'
      const result = await getRecentTxs({ address: '0x1234' })
      expect(result.chain).toBe('base-sepolia')
      expect(typeof result.timestamp).toBe('number')
    })
  })
  ```

- [ ] **Step 9.5 — Run tests, confirm failures**
  ```bash
  cd packages/mcp-chain && npm test
  ```
  Expected: FAIL — source files missing

- [ ] **Step 9.6 — Write src/data/alchemy.ts**

  ```typescript
  // packages/mcp-chain/src/data/alchemy.ts
  export async function alchemyRpc(method: string, params: unknown[]): Promise<unknown> {
    const rpc = process.env.ALCHEMY_BASE_SEPOLIA_RPC
    if (!rpc) throw new Error('ALCHEMY_BASE_SEPOLIA_RPC is not set')
    const res = await fetch(rpc, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
    })
    const json = await res.json() as { result?: unknown; error?: { message: string } }
    if (json.error) throw new Error(`Alchemy error: ${json.error.message}`)
    return json.result
  }
  ```

- [ ] **Step 9.7 — Write src/tools/get-eth-balance.ts**

  ```typescript
  // packages/mcp-chain/src/tools/get-eth-balance.ts
  import { createPublicClient, http, formatEther } from 'viem'
  import { baseSepolia } from 'viem/chains'

  const client = createPublicClient({
    chain:     baseSepolia,
    transport: http(process.env.ALCHEMY_BASE_SEPOLIA_RPC)
  })

  export async function getEthBalance(input: { address: string }) {
    const raw = await client.getBalance({ address: input.address as `0x${string}` })
    return {
      address:     input.address,
      balance_eth: parseFloat(formatEther(raw)),
      balance_wei: raw.toString(),
      chain:       'base-sepolia',
      timestamp:   Date.now()
    }
  }
  ```

- [ ] **Step 9.8 — Write src/tools/get-token-holdings.ts**

  ```typescript
  // packages/mcp-chain/src/tools/get-token-holdings.ts
  import { alchemyRpc } from '../data/alchemy'

  interface TokenBalance { contractAddress: string; tokenBalance: string }

  export async function getTokenHoldings(input: { address: string }) {
    const result = await alchemyRpc('alchemy_getTokenBalances', [input.address]) as { tokenBalances: TokenBalance[] }
    const nonZero = result.tokenBalances.filter(t => t.tokenBalance !== '0x0')
    return {
      address:   input.address,
      tokens:    nonZero,
      chain:     'base-sepolia',
      timestamp: Date.now()
    }
  }
  ```

- [ ] **Step 9.9 — Write src/tools/get-recent-txs.ts**

  ```typescript
  // packages/mcp-chain/src/tools/get-recent-txs.ts
  import { alchemyRpc } from '../data/alchemy'

  export async function getRecentTxs(input: { address: string; limit?: number }) {
    const limit = input.limit ?? 5
    const result = await alchemyRpc('alchemy_getAssetTransfers', [{
      fromAddress: input.address,
      category:    ['external', 'erc20'],
      maxCount:    `0x${limit.toString(16)}`
    }]) as { transfers: unknown[] }
    return {
      address:      input.address,
      transactions: result.transfers.slice(0, limit),
      chain:        'base-sepolia',
      timestamp:    Date.now()
    }
  }
  ```

- [ ] **Step 9.10 — Run tests, confirm pass**
  ```bash
  cd packages/mcp-chain && npm test
  ```
  Expected: all tests pass

- [ ] **Step 9.11 — Commit**
  ```bash
  git add packages/mcp-chain/src/ packages/mcp-chain/tests/
  git commit -m "feat(mcp-chain): data layer + tools (get_eth_balance, get_token_holdings, get_recent_txs)"
  ```

---

## Task 10: mcp-chain manifest + server + index

**Files:** `src/manifest.ts`, `src/server.ts`, `src/index.ts`, `tests/server.test.ts`

- [ ] **Step 10.1 — Write tests/server.test.ts**

  ```typescript
  // packages/mcp-chain/tests/server.test.ts
  import { describe, it, expect } from 'vitest'
  import request from 'supertest'
  import { createServer } from '../src/server'

  process.env.PAYEE_WALLET               = '0xTestPayee'
  process.env.MCP_NAME                   = 'chain'
  process.env.USDC_CONTRACT              = '0x5dEaC602762362FE5f135FA5904351916053cF70'
  process.env.ALCHEMY_BASE_SEPOLIA_RPC   = 'https://fake.rpc'

  describe('mcp-chain server', () => {
    it('tools/call without payment returns 402', async () => {
      const res = await request(createServer())
        .post('/mcp')
        .send({ method: 'tools/call', params: { name: 'get_eth_balance' } })
      expect(res.status).toBe(402)
    })

    it('tools/list passes without payment', async () => {
      const res = await request(createServer())
        .post('/mcp')
        .send({ method: 'tools/list' })
      expect(res.status).not.toBe(402)
    })
  })
  ```

- [ ] **Step 10.2 — Write src/manifest.ts**

  ```typescript
  // packages/mcp-chain/src/manifest.ts
  import 'dotenv/config'
  import type { TollgateManifest } from './types'

  export const manifest: TollgateManifest = {
    ens:          process.env.ENS_NAME     ?? 'chain.tollgate.eth',
    version:      '1.0',
    description:  'On-chain data: ETH balance, token holdings, recent transactions',
    category:     'blockchain',
    payee:        process.env.PAYEE_WALLET ?? '',
    chain:        'base-sepolia',
    usdcContract: '0x5dEaC602762362FE5f135FA5904351916053cF70',
    defaultPrice: '0.02',
    tools: [
      {
        name:        'get_eth_balance',
        description: 'Get the ETH balance of any address',
        price:       '0.01',
        inputSchema: {
          address: { type: 'string', required: true, description: 'EVM address 0x...' }
        },
        outputSchema: {
          address:     { type: 'string', required: true },
          balance_eth: { type: 'number', required: true, description: 'Formatted ETH' },
          balance_wei: { type: 'string', required: true, description: 'Raw wei as string' },
          chain:       { type: 'string', required: true },
          timestamp:   { type: 'number', required: true }
        }
      },
      {
        name:        'get_token_holdings',
        description: 'Get all ERC-20 token balances for an address',
        price:       '0.02',
        inputSchema: {
          address: { type: 'string', required: true }
        },
        outputSchema: {
          address:   { type: 'string', required: true },
          tokens:    { type: 'array',  required: true, description: '[{ contractAddress, tokenBalance }]' },
          chain:     { type: 'string', required: true },
          timestamp: { type: 'number', required: true }
        }
      },
      {
        name:        'get_recent_txs',
        description: 'Get recent transactions sent from an address',
        price:       '0.02',
        inputSchema: {
          address: { type: 'string', required: true },
          limit:   { type: 'number', required: false, description: 'Max 20, default 5' }
        },
        outputSchema: {
          address:      { type: 'string', required: true },
          transactions: { type: 'array',  required: true, description: '[{ hash, from, to, value, asset, blockNum }]' },
          chain:        { type: 'string', required: true },
          timestamp:    { type: 'number', required: true }
        }
      }
    ],
    updatedAt: new Date().toISOString()
  }
  ```

- [ ] **Step 10.3 — Write src/server.ts**

  ```typescript
  // packages/mcp-chain/src/server.ts
  import express from 'express'
  import path from 'path'
  import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
  import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
  import { z } from 'zod'
  import { manifest } from './manifest'
  import { createPaymentMiddleware } from './middleware'
  import { getEthBalance } from './tools/get-eth-balance'
  import { getTokenHoldings } from './tools/get-token-holdings'
  import { getRecentTxs } from './tools/get-recent-txs'

  export function createServer() {
    const app = express()
    app.use(express.json())
    app.use(express.static(path.join(__dirname, '..', 'public')))

    app.use(createPaymentMiddleware({
      getToolPrice: (name) =>
        manifest.tools.find(t => t.name === name)?.price ?? manifest.defaultPrice,
      payee:        process.env.PAYEE_WALLET ?? '',
      mcpName:      process.env.MCP_NAME ?? 'chain',
      usdcContract: process.env.USDC_CONTRACT ?? ''
    }))

    const mcpServer = new McpServer({ name: manifest.ens, version: manifest.version })

    mcpServer.tool('get_eth_balance', { address: z.string() }, async ({ address }) => {
      const result = await getEthBalance({ address })
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] }
    })

    mcpServer.tool('get_token_holdings', { address: z.string() }, async ({ address }) => {
      const result = await getTokenHoldings({ address })
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] }
    })

    mcpServer.tool('get_recent_txs', { address: z.string(), limit: z.number().optional() }, async ({ address, limit }) => {
      const result = await getRecentTxs({ address, limit })
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] }
    })

    app.post('/mcp', async (req, res) => {
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
      res.on('close', () => transport.close())
      await mcpServer.connect(transport)
      await transport.handleRequest(req, res, req.body)
    })

    app.get('/mcp', async (req, res) => {
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
      res.on('close', () => transport.close())
      await mcpServer.connect(transport)
      await transport.handleRequest(req, res)
    })

    return app
  }
  ```

- [ ] **Step 10.4 — Write src/index.ts**

  ```typescript
  // packages/mcp-chain/src/index.ts
  import 'dotenv/config'
  import fs from 'fs'
  import path from 'path'
  import { manifest } from './manifest'
  import { createServer } from './server'

  function validateEnv() {
    const payee = process.env.PAYEE_WALLET
    if (!payee || !payee.startsWith('0x')) throw new Error('PAYEE_WALLET must be set and start with 0x')
    if (!process.env.ALCHEMY_BASE_SEPOLIA_RPC) throw new Error('ALCHEMY_BASE_SEPOLIA_RPC is not set')
    for (const tool of manifest.tools) {
      if (parseFloat(tool.price) <= 0) throw new Error(`Tool ${tool.name} has invalid price`)
    }
  }

  function writeManifest() {
    const dir = path.join(__dirname, '..', 'public', '.well-known')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'tollgate.json'), JSON.stringify(manifest, null, 2))
    console.log(`✓ Manifest written: ${manifest.tools.length} tools`)
    for (const tool of manifest.tools) console.log(`  ${tool.name}: $${tool.price}`)
  }

  validateEnv()
  writeManifest()

  const port = parseInt(process.env.PORT ?? '3003', 10)
  createServer().listen(port, () => console.log(`${manifest.ens} running on :${port}`))
  ```

- [ ] **Step 10.5 — Run all tests and build**
  ```bash
  cd packages/mcp-chain && npm test && npm run build
  ```
  Expected: all tests pass, `dist/` produced

- [ ] **Step 10.6 — Commit**
  ```bash
  git add packages/mcp-chain/src/manifest.ts packages/mcp-chain/src/server.ts packages/mcp-chain/src/index.ts packages/mcp-chain/tests/server.test.ts
  git commit -m "feat(mcp-chain): manifest + server + index — complete"
  ```

---

## Self-Review Checklist

- [x] **types.ts embedded per-package** — no file: references, full deployment independence
- [x] **middleware.ts embedded per-package** — same
- [x] **All tools have price > 0 validation** in index.ts
- [x] **PAYEE_WALLET validation** in all three index.ts files
- [x] **manifest written to public/.well-known/tollgate.json** at startup
- [x] **tools/list is always free** — middleware passes `method !== 'tools/call'`
- [x] **Per-tool pricing** — `getToolPrice(name)` called on each request, not flat price
- [x] **CoinGecko 300ms delays** — in all three crypto tools
- [x] **60s trending cache** — module-level variable in get-trending.ts
- [x] **429 handling** — in get-market-data.ts
- [x] **Viem** for ETH balance — formatEther returns number
- [x] **ALCHEMY_BASE_SEPOLIA_RPC** validated in mcp-chain index.ts
- [x] **All test assertions use typed results** — no `any` in test files
