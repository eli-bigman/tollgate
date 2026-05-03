# TOLLGATE
## Product Requirements & Technical Overview

> **Version:** 1.0  
> **Status:** Active Development  
> **Hackathon:** ETHGlobal Open Agents 2026  
> **Prize Target:** KeeperHub + ENS — up to $9,500  

---

## Table of Contents

1. [What Is Tollgate](#1-what-is-tollgate)
2. [The Problem It Solves](#2-the-problem-it-solves)
3. [How It Works — The User Story](#3-how-it-works--the-user-story)
4. [Core Architecture](#4-core-architecture)
5. [The Tollgate Manifest](#5-the-tollgate-manifest)
6. [The Three MCP Services](#6-the-three-mcp-services)
7. [ENS Registry Layer](#7-ens-registry-layer)
8. [Payment Layer — KeeperHub x402](#8-payment-layer--keeperhub-x402)
9. [The Demo Agent](#9-the-demo-agent)
10. [The Frontend Application](#10-the-frontend-application)
11. [Data Flow — End to End](#11-data-flow--end-to-end)
12. [Technology Stack](#12-technology-stack)
13. [Project Structure](#13-project-structure)
14. [What Tollgate Does NOT Do](#14-what-tollgate-does-not-do)
15. [Competitive Differentiation](#15-competitive-differentiation)
16. [Prize Track Alignment](#16-prize-track-alignment)
17. [Glossary](#17-glossary)

---

## 1. What Is Tollgate

Tollgate is an **ENS-native, pay-per-call marketplace for MCP servers**. It is the infrastructure layer that connects AI agents to the data and capabilities they need — without API keys, without subscriptions, and without any human intervention.

Developers publish their MCP (Model Context Protocol) servers under ENS subnames like `crypto.tollgate.eth`. Embedded in that ENS name is a pointer to a **Tollgate Manifest** — a machine-readable JSON contract that declares exactly what the server offers: every tool by name, its input parameters, its output schema, and its price per call in USDC.

An AI agent given a task resolves the ENS name, fetches the manifest, confirms the prices, connects to the MCP, pays per tool call via the x402 protocol, and validates that the response matches the declared schema before using the data.

**The 30-second version:** ENS names replace API key registries. Manifests replace documentation. x402 USDC payments replace subscription billing. The agent does everything autonomously.

---

## 2. The Problem It Solves

### The Current State

Every AI agent that needs to call external services today requires pre-loaded API keys. Before a developer ships an agent, they must manually sign up for each API, obtain credentials, store them securely, handle expiry, and rotate keys when they leak. The agent itself cannot discover new capabilities at runtime, cannot verify what an API returns, and cannot pay for usage independently.

This creates three compounding problems:

**Discovery is manual.** There is no standard way for an agent to find a service that provides a specific capability. The developer must know about it in advance.

**Trust is absent.** When an API returns data, the agent has no way to verify that the response is correctly structured. A format change upstream silently corrupts the agent's reasoning.

**Payment is human-mediated.** Agents cannot pay for the services they use. A human must pre-fund everything and hope the agent stays within budget.

### What Tollgate Provides

Tollgate solves all three problems in a single primitive:

| Problem | Tollgate Solution |
|---|---|
| No discovery mechanism | ENS subnames — resolve a name, get everything |
| No trust layer | Tollgate Manifest — declared schemas, validated responses |
| No payment mechanism | KeeperHub x402 — autonomous USDC per tool call |

---

## 3. How It Works — The User Story

### From the Developer's Perspective

A developer has a weather data API they want to monetise. They:

1. Build an MCP server that wraps their API and exposes two tools: `get_weather` and `get_forecast`
2. Define a Tollgate Manifest — a JSON file at `/.well-known/tollgate.json` on their server — declaring both tools with input schemas, output schemas, and prices (0.01 USDC each)
3. Visit Tollgate's Register page, fill out a form with the server URL and their wallet address
4. Tollgate registers `weather.tollgate.eth` as an ENS subname, with text records pointing to their server and manifest

That's it. Their MCP is now live, discoverable, and monetised.

### From the Agent's Perspective

An agent is given the task: *"Give me a trader's morning briefing with top trending crypto and weather in New York."*

The agent:

1. Calls `list_tollgate_services()` — gets a list of all registered MCPs
2. Identifies that `crypto.tollgate.eth` and `weather.tollgate.eth` are relevant
3. Calls `fetch_manifest(url)` for each — reads the exact tool signatures and prices before committing to anything
4. Confirms: `get_trending` costs 0.01 USDC, `get_weather` costs 0.01 USDC — within budget
5. Calls `get_trending()` on the crypto MCP — the MCP returns a 402 challenge requesting 0.01 USDC
6. KeeperHub agentic wallet intercepts the 402, signs a USDC transfer, retries the request
7. MCP verifies payment, executes the tool, returns data
8. Agent runs `validateResponse()` — checks all required fields are present and correctly typed
9. Repeats for `get_weather("New York")`
10. Synthesises the briefing: *"Top trending tokens are X, Y, Z. Weather in NYC is 18°C, partly cloudy. Total spent: $0.02."*

### From the Observer's Perspective

Anyone watching the Tollgate frontend sees:

- A directory listing all registered MCPs with their tool names and per-call prices
- A live activity feed showing every tool call that has been made, the USDC amount paid, and the transaction hash
- An agent demo where they can enter any task, watch the agent reason through it in real time, and see each payment fire with a validation result

---

## 4. Core Architecture

Tollgate is built on three layers. Every interaction flows through all three.

```
┌──────────────────────────────────────────────────────────────────┐
│  LAYER 1 — ENS (Discovery)                                       │
│                                                                  │
│  crypto.tollgate.eth                                             │
│    tollgate:url      = https://mcp-crypto.railway.app            │
│    tollgate:manifest = https://mcp-crypto.railway.app/           │
│                        .well-known/tollgate.json                 │
│    tollgate:payee    = 0xABC...                                   │
│    tollgate:category = finance                                   │
│    tollgate:type     = mcp                                       │
├──────────────────────────────────────────────────────────────────┤
│  LAYER 2 — Tollgate Manifest (Trust)                             │
│                                                                  │
│  GET /.well-known/tollgate.json                                  │
│  {                                                               │
│    "ens": "crypto.tollgate.eth",                                 │
│    "payee": "0xABC...",                                          │
│    "tools": [                                                    │
│      {                                                           │
│        "name": "get_price",                                      │
│        "price": "0.01",                                          │
│        "inputSchema":  { "token": { type, required } },          │
│        "outputSchema": { "token": {...}, "price_usd": {...} }    │
│      }                                                           │
│    ]                                                             │
│  }                                                               │
├──────────────────────────────────────────────────────────────────┤
│  LAYER 3 — MCP Server (Execution)                                │
│                                                                  │
│  POST /mcp → tools/list   → always free                          │
│  POST /mcp → tools/call   → 402 if unpaid → pay → validate       │
│                             → return data                        │
└──────────────────────────────────────────────────────────────────┘
```

### Why Three Layers Matter

Each layer solves a distinct problem and can be verified independently.

**Layer 1 (ENS)** answers: *does this service exist and where is it?* An agent resolves `crypto.tollgate.eth` and gets a URL. This is permanent, decentralised, and uncensorable. No central database can go down.

**Layer 2 (Manifest)** answers: *what exactly does this service offer and what will it cost?* The manifest is the contract. An agent reads it before paying anything. If the manifest says `price_usd` is a required number, the agent knows to expect a number — and will reject a string.

**Layer 3 (MCP)** answers: *did the service actually deliver what was promised?* The MCP executes the tool and returns data. The agent validates the response against the manifest's `outputSchema` before using it. If a field is missing or the wrong type, the agent catches it and reports it rather than silently proceeding with bad data.

---

## 5. The Tollgate Manifest

The Tollgate Manifest is the central innovation of this project. It is a JSON file that every registered MCP server hosts at `/.well-known/tollgate.json`.

### Full Schema

```typescript
interface ToolSchema {
  type: "string" | "number" | "boolean" | "array" | "object";
  description?: string;
  required: boolean;
  enum?: string[];
  example?: unknown;
}

interface ManifestTool {
  name: string;
  description: string;
  price: string;              // USDC amount as string, e.g. "0.01"
  inputSchema:  Record<string, ToolSchema>;
  outputSchema: Record<string, ToolSchema>;
}

interface TollgateManifest {
  ens:          string;       // "crypto.tollgate.eth"
  version:      "1.0";
  description:  string;
  category:     string;
  payee:        string;       // 0x... wallet receiving USDC payments
  chain:        "base-sepolia" | "base";
  usdcContract: string;       // USDC token address on the chain
  defaultPrice: string;       // fallback price if tool has no price
  tools:        ManifestTool[];
  updatedAt:    string;       // ISO timestamp
}
```

### What Agents Do With It

Before calling any tool, the agent fetches the manifest and uses it to:

1. **Know what tools exist** — not just names, but descriptions and parameter requirements
2. **Confirm prices** — the agent reads `tool.price` from the manifest, then cross-checks that the 402 challenge price matches (within 5% tolerance). If the MCP is trying to charge more than declared, the agent aborts.
3. **Know what to expect back** — the `outputSchema` tells the agent exactly which fields the response must contain and what type each field must be
4. **Validate the response** — after receiving data, the agent checks every field marked `required: true` against the actual response

### The Price Binding Rule

If `manifest.tool.price` is `0.01` USDC and the 402 challenge requests `0.05` USDC, the agent refuses to pay and returns an error:

```
{ error: "price_mismatch", declared: "0.01", charged: "0.05" }
```

No surprise charges. The manifest is the authoritative price.

### The Output Validation Rule

After a paid tool call returns data, the agent runs `validateResponse()`:

```
Input:  toolName="get_price", data={ token:"eth", price_usd:"three thousand" }
Output: { valid: false, missingFields: [], wrongTypeFields: ["price_usd (expected number, got string)"] }
```

The agent sees `valid: false` and reports it. It never silently uses invalid data.

---

## 6. The Three MCP Services

Tollgate ships with three pre-built MCP servers that serve as both working products and proof-of-concept demonstrations.

### MCP 1 — CryptoData (`crypto.tollgate.eth`)

**Data source:** CoinGecko public API (no API key required)  
**Port:** 3001  
**Category:** Finance

| Tool | Input | Output (required fields) | Price |
|---|---|---|---|
| `get_price` | `token: string` (e.g. "ethereum") | token, price_usd, currency, source, timestamp | 0.01 USDC |
| `get_trending` | none | tokens (array), fetched_at | 0.01 USDC |
| `get_market_data` | `token: string` | token, price_usd, market_cap, volume_24h, change_24h, change_7d, source, timestamp | 0.02 USDC |

**Why no API key needed:** CoinGecko's public endpoints (`/simple/price`, `/search/trending`, `/coins/{id}`) are accessible without authentication at moderate request rates. A 300ms delay between calls prevents rate limiting.

---

### MCP 2 — Weather (`weather.tollgate.eth`)

**Data source:** Open-Meteo (completely free, no key, no rate limits for reasonable use)  
**Port:** 3002  
**Category:** Weather

| Tool | Input | Output (required fields) | Price |
|---|---|---|---|
| `get_weather` | `city: string` | city, latitude, longitude, temp_c, humidity_pct, wind_kmh, condition, source, timestamp | 0.01 USDC |
| `get_forecast` | `city: string`, `days?: number (1-7)` | city, forecast (array), source, timestamp | 0.01 USDC |

**Internal mechanics:** The server performs two sequential calls — first to Open-Meteo's geocoding API to convert a city name into coordinates, then to the forecast API. WMO weather codes are mapped to human-readable condition strings (e.g. code 61 → "Rain").

---

### MCP 3 — OnChain (`chain.tollgate.eth`)

**Data source:** Alchemy Token API (requires existing Alchemy API key)  
**Port:** 3003  
**Category:** Blockchain

| Tool | Input | Output (required fields) | Price |
|---|---|---|---|
| `get_eth_balance` | `address: string` | address, balance_eth, balance_wei, chain, timestamp | 0.01 USDC |
| `get_token_holdings` | `address: string` | address, tokens (array), chain, timestamp | 0.02 USDC |
| `get_recent_txs` | `address: string`, `limit?: number (max 20)` | address, transactions (array), chain, timestamp | 0.02 USDC |

**Notable:** This MCP demonstrates the interesting recursion of an agent paying blockchain USDC to query blockchain data. The payment itself is a transaction on Base Sepolia — the same network being queried.

---

### What All Three MCPs Share

Every MCP follows the same structural pattern:

- `src/manifest.ts` — defines the manifest as a TypeScript object; single source of truth for tool names, prices, and schemas
- Manifest is written to `public/.well-known/tollgate.json` at server startup
- x402 middleware is applied before the MCP handler — `tools/list` is always free, `tools/call` always requires payment
- Per-tool pricing — the x402 middleware reads the tool price from the manifest, not a flat environment variable
- Every tool validates its own output before returning — all required fields must be present

---

## 7. ENS Registry Layer

### What ENS Provides

The Ethereum Name Service (ENS) is used as Tollgate's **decentralised service registry**. Instead of a central database (which can go down, be censored, or be owned by a single entity), every registered MCP is an ENS subname under `tollgate.eth`.

### Text Record Schema

Each registered service stores its metadata as ENS text records using the `tollgate:` namespace prefix:

| Record Key | Example Value | Purpose |
|---|---|---|
| `tollgate:url` | `https://mcp-crypto.railway.app` | MCP server base URL |
| `tollgate:manifest` | `https://mcp-crypto.railway.app/.well-known/tollgate.json` | Manifest URL — the trust anchor |
| `tollgate:type` | `mcp` | Service type: `mcp` or `api` |
| `tollgate:payee` | `0xABC...` | Wallet receiving USDC payments |
| `tollgate:description` | `Real-time crypto market data` | Human-readable description |
| `tollgate:category` | `finance` | Category for directory filtering |
| `tollgate:version` | `1.0` | Schema version |

### Why `tollgate:manifest` Is the Most Important Record

The manifest URL is the trust anchor of the entire system. An agent that resolves `crypto.tollgate.eth` and gets back a manifest URL has a verifiable pointer to the contract governing what the service offers. Without this, the ENS name would only tell you where the server is — not what it does, what it costs, or what it returns.

### Chain

All ENS operations run on **Base Sepolia** (Chain ID: 84532) for the hackathon. The same architecture works on Base mainnet or Ethereum mainnet without code changes — only the RPC URL and chain ID change.

---

## 8. Payment Layer — KeeperHub x402

### What x402 Is

x402 is an HTTP payment protocol built on the HTTP 402 status code ("Payment Required"). The flow:

1. Agent calls a tool on the MCP
2. MCP returns `402 Payment Required` with a payment challenge:
   ```json
   {
     "x402Version": "1",
     "accepts": [{
       "scheme": "exact",
       "network": "base-sepolia",
       "maxAmountRequired": "10000",
       "asset": "0x5dEaC602762362FE5f135FA5904351916053cF70",
       "payTo": "0xABC...",
       "memo": "tollgate-crypto-get_price"
     }]
   }
   ```
3. KeeperHub agentic wallet intercepts the 402, signs a USDC transfer for the specified amount, and retries the request with an `x-payment` header
4. MCP verifies the payment header, executes the tool, returns data

### What KeeperHub Adds

KeeperHub wraps x402 with production-grade execution guarantees:

**Agentic wallet** — a Turnkey-backed wallet with no private key on disk. The wallet lives in an enclave. Setup is a single npm command.

**Safety controls** — configurable auto-approve thresholds (e.g. auto-approve payments under $2, block anything over $10).

**MCP server integration** — KeeperHub itself exposes an MCP server, meaning Claude Code can use KeeperHub tools natively inside the agent's reasoning loop.

**Audit trail** — every payment is logged with timestamp, amount, tool name, payer address, and transaction hash. The Tollgate frontend reads this log for its live activity feed.

### USDC on Base Sepolia

All payments use USDC on Base Sepolia:  
Contract: `0x5dEaC602762362FE5f135FA5904351916053cF70`

The demo agent is funded with $5 of testnet USDC from Circle's faucet. Every tool call spends a fraction of this budget. The agent tracks its remaining balance and stops if it runs out.

### Per-Tool Pricing

Unlike flat-rate services, Tollgate charges different amounts for different tools. `get_market_data` costs 0.02 USDC (more compute, richer data) while `get_price` costs 0.01 USDC (simple lookup). The per-tool price is declared in the manifest and enforced by the x402 middleware — the middleware reads `manifest.tools.find(t => t.name === toolName).price` before generating the 402 challenge.

---

## 9. The Demo Agent

The demo agent is an autonomous AI agent (Claude claude-sonnet-4-20250514) that demonstrates the full Tollgate flow end-to-end. It is built with the Anthropic SDK using native tool use.

### Tools Available to the Agent

| Tool | What It Does |
|---|---|
| `list_tollgate_services()` | Fetches all registered services from the ENS registry |
| `fetch_manifest(manifestUrl)` | Fetches and parses a Tollgate Manifest from a URL |
| `call_mcp_tool(params)` | Connects to an MCP, handles 402, pays, validates response |
| `check_budget()` | Returns total budget, amount spent, remaining balance |

### The Agent's Mandatory Workflow

The agent's system prompt enforces this sequence:

1. List available services
2. Fetch the manifest for any service it plans to use — **before paying anything**
3. Confirm tool price from manifest
4. Call the tool (payment handled automatically)
5. Receive validation result — report if any required field is missing or wrong type
6. Never use data that fails validation
7. Synthesise the final answer, always reporting total spend and validation status

### Three Pre-Tested Demo Tasks

These tasks are pre-tested and serve as the demo scenarios for the ETHGlobal submission:

**Task 1 — Simple (single MCP):**
> "What is the current price of Ethereum?"
> Uses: `crypto.tollgate.eth` → `get_price` | Spend: $0.01 | Validation: 5/5 fields ✓

**Task 2 — Multi-MCP (primary demo):**
> "Give me a trader's morning briefing: top trending crypto and weather in New York."
> Uses: `crypto.tollgate.eth` → `get_trending` + `weather.tollgate.eth` → `get_weather`
> Spend: $0.02 | Validation: both ✓

**Task 3 — Blockchain:**
> "Analyse this wallet: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
> Uses: `chain.tollgate.eth` → `get_eth_balance` + `get_recent_txs` | Spend: $0.03 | Validation: both ✓

### Agent Event Stream

The agent emits a typed event stream consumed by the frontend via SSE:

| Event Type | Data |
|---|---|
| `thinking` | `{ text: string }` — agent reasoning |
| `tool_call` | `{ name: string, input: object }` — tool invocation |
| `payment` | `{ mcp, tool, amount, txHash }` — USDC paid |
| `validation` | `{ tool, valid, summary, missingFields }` — response check |
| `result` | `{ answer, totalSpent, calls }` — final answer |
| `error` | `{ message }` — failure with reason |

---

## 10. The Frontend Application

The frontend is a Next.js 14 App Router application with three pages and a set of API routes that sit between the frontend and the blockchain/MCP layer.

### Page 1: Directory (`/`)

The home page. Shows all registered MCPs and APIs as cards, with a hero section explaining the product and an animated SVG flow diagram illustrating the Agent → ENS → Manifest → Pay → MCP → Validate → Data cycle.

**ServiceCard contents:**
- ENS name (monospace)
- Type badge (MCP / API)
- Description
- Per-tool prices pulled live from the manifest (not from ENS text records)
- Expandable ManifestViewer showing input and output schemas for each tool
- Live status indicator

**Live activity ticker (fixed footer):** Scrolling display of recent tool calls across all services — `⚡ crypto.tollgate.eth → get_price → validated ✓ → 0.01 USDC · 2s ago`

### Page 2: Register (`/register`)

A form for developers to list their MCP server or REST API under a Tollgate ENS subname.

**Key behaviour — manifest auto-validation:** When the user enters an endpoint URL, the frontend debounces 500ms then fetches `{url}/.well-known/tollgate.json` via the `/api/manifest/fetch` proxy route. If the manifest is found and valid, it shows a green checkmark and the tool count. If not, it shows an error with a hint.

**Live manifest preview panel:** A code block on the right side of the form updates in real time as the user types — showing exactly what the ENS text records will contain.

**On submit:** Calls `/api/ens/register`, which calls ENSjs to register the subname and set all `tollgate:` prefixed text records including `tollgate:manifest`.

### Page 3: Agent Demo (`/agent`)

A split-panel interface for running the demo agent.

**Left panel — Agent Reasoning:** A chat-style display showing the agent's thinking stream, tool calls (expandable to show inputs/outputs), payment events (with tx hash links), validation results (green ✓ or red ✗), and the final answer with a summary chip.

**Right panel — Activity + Budget:** A budget meter showing spend vs. $5 total, and a live activity feed showing all payments made during the session.

**Preset tasks:** Three clickable pill buttons that pre-fill the task input with the three pre-tested demo scenarios.

### API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/ens/register` | POST | Register ENS subname with text records |
| `/api/ens/resolve` | GET | Resolve a name → TollgateENSRecord |
| `/api/ens/list` | GET | List all registered services |
| `/api/manifest/fetch` | GET | Proxy-fetch a manifest URL (avoids CORS) |
| `/api/agent/run` | POST | Start agent task, returns SSE stream |
| `/api/activity` | GET | Fetch payment activity log (polled every 2s) |

---

## 11. Data Flow — End to End

This is the complete path from a user entering a task to the agent returning an answer, with every system involved.

```
User types task in frontend
        │
        ▼
POST /api/agent/run  (Next.js API route)
        │
        ▼
runAgent(task)  (packages/agent/src/agent.ts)
        │
        ├─ Tool: list_tollgate_services()
        │   └─ GET /api/ens/list
        │       └─ reads .ens-cache.json
        │           └─ returns [{ name, manifestUrl, ... }]
        │
        ├─ Tool: fetch_manifest(manifestUrl)
        │   └─ GET /api/manifest/fetch?url={manifestUrl}
        │       └─ fetches /.well-known/tollgate.json from MCP server
        │           └─ returns TollgateManifest { tools, prices, schemas }
        │
        ├─ Agent reads tool price from manifest (0.01 USDC)
        │
        ├─ Tool: call_mcp_tool({ url, toolName, input, expectedPrice, payee })
        │   │
        │   ├─ MCP SDK Client → POST /mcp (Streamable HTTP)
        │   │   └─ MCP server: x402 middleware fires
        │   │       └─ returns HTTP 402 { challenge: { amount, payTo, memo } }
        │   │
        │   ├─ Agent checks: 402 price ≤ manifest price × 1.05 ✓
        │   │
        │   ├─ KeeperHub agentic wallet:
        │   │   └─ signs USDC transfer on Base Sepolia
        │   │   └─ retries request with x-payment header
        │   │
        │   ├─ MCP server: x402 middleware verifies header
        │   │   └─ logs payment { mcp, tool, amount, caller, ts }
        │   │   └─ calls next() → MCP handler executes tool
        │   │
        │   ├─ MCP tool fetches data from external source
        │   │   └─ returns data matching outputSchema
        │   │
        │   ├─ Agent: validateResponse(toolName, data, manifest.tools)
        │   │   └─ checks all required fields present + correct types
        │   │   └─ returns { valid: true, summary: "5/5 required fields present" }
        │   │
        │   └─ Agent emits: payment event + validation event
        │
        ├─ Agent repeats for second MCP if needed
        │
        ├─ Agent synthesises final answer
        │   └─ emits result event { answer, totalSpent, calls }
        │
        ▼
SSE stream → frontend
        │
        ├─ AgentDemo component renders each event type
        ├─ BudgetMeter updates on payment events
        └─ ActivityFeed polls /api/activity every 2s
```

---

## 12. Technology Stack

### Core Infrastructure

| Layer | Technology | Purpose |
|---|---|---|
| Blockchain | Base Sepolia (Chain ID: 84532) | Testnet for all on-chain operations |
| Token | USDC `0x5dEaC602762362FE5f135FA5904351916053cF70` | Payment currency |
| Name service | ENS on Base Sepolia | Decentralised service registry |
| Payment protocol | x402 (Coinbase) | HTTP-native micropayments |
| Payment execution | KeeperHub agentic wallet | Autonomous USDC signing + retry |

### MCP Layer

| Package | Technology |
|---|---|
| MCP SDK | `@modelcontextprotocol/sdk` v1.10+ |
| MCP Express binding | `@modelcontextprotocol/express` |
| Transport | Streamable HTTP (current MCP standard) |
| Server runtime | Node.js + Express |
| Type validation | Zod |

### Agent Layer

| Package | Technology |
|---|---|
| LLM | Anthropic Claude claude-sonnet-4-20250514 |
| SDK | `@anthropic-ai/sdk` |
| Tool use | Native Anthropic tool use API |

### Frontend & Blockchain

| Package | Technology |
|---|---|
| Framework | Next.js 14 App Router |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Blockchain client | Viem |
| ENS library | ENSjs v4 |
| UI generation | Stitch (component scaffolding) |

### Data Sources

| MCP | Source | Key Required |
|---|---|---|
| CryptoData | CoinGecko public API | No |
| Weather | Open-Meteo | No |
| OnChain | Alchemy Token API | Yes (reused from project setup) |

### Deployment

| Service | Deployed To |
|---|---|
| Frontend | Vercel |
| mcp-crypto | Railway |
| mcp-weather | Railway |
| mcp-chain | Railway |

---

## 13. Project Structure

```
tollgate/
├── packages/
│   ├── nextjs/               — Frontend + API routes
│   ├── mcp-crypto/           — CryptoData MCP server
│   ├── mcp-weather/          — Weather MCP server
│   ├── mcp-chain/            — OnChain MCP server
│   └── agent/                — Autonomous demo agent
│
├── shared/
│   ├── manifest-types/       — Shared TypeScript interfaces (foundation)
│   └── x402-middleware/      — Shared payment gate (used by all MCPs)
│
├── SPRINT_PLAN.md            — Build plan with all code prompts
├── PARALLEL_GUIDE.md         — How to build with subagents simultaneously
├── DESIGN.md                 — UI specification for Stitch
├── PROJECT_SETUP.md          — Pre-flight checklist and env vars
├── PRD.md                    — This document
└── FEEDBACK.md               — KeeperHub integration feedback (prize req.)
```

Every MCP package follows the same internal structure:

```
packages/mcp-{name}/
├── public/
│   └── .well-known/
│       └── tollgate.json     — Served manifest (generated at startup)
└── src/
    ├── index.ts              — Entry point + startup verification
    ├── server.ts             — Express + MCP server setup
    ├── manifest.ts           — Manifest definition (single source of truth)
    ├── tools/                — One file per tool
    ├── middleware/
    │   └── x402.ts           — Per-tool payment gating
    └── data/                 — External API wrappers
```

---

## 14. What Tollgate Does NOT Do

Understanding scope is as important as understanding features.

**Tollgate does not verify payments on-chain.** During the hackathon, the x402 middleware accepts any syntactically valid payment header without querying the blockchain. Full on-chain verification is production scope.

**Tollgate does not slash bad actors.** If an MCP returns data that fails validation repeatedly, the current system reports it but takes no punitive action. A reputation/slashing system is post-hackathon.

**Tollgate does not run on mainnet.** All activity is on Base Sepolia testnet with faucet-funded USDC. Mainnet deployment requires the same code with updated chain IDs and RPC URLs.

**Tollgate does not write smart contracts.** ENS subname registration, USDC transfers, and x402 payments all use existing deployed contracts. No new contracts are deployed.

**Tollgate does not support cross-chain payments.** All payments are USDC on Base Sepolia only.

---

## 15. Competitive Differentiation

### vs. MCPay.fun (ETHGlobal Prague 2025 finalist)

MCPay.fun is the closest prior work. It pioneered x402 payments on MCP servers and built a central registry at `mcpay.tech/servers`. 

| Dimension | MCPay.fun | Tollgate |
|---|---|---|
| Registry | Central database (single point of failure) | ENS — decentralised, permanent |
| Discovery mechanism | Web search on their site | Resolve an ENS name from anywhere |
| Output guarantees | None — no schema binding | Manifest declares outputSchema, agent validates |
| Payment execution | MCPay facilitator | KeeperHub — audited, guaranteed, no MCPay dependency |
| Developer SDK | Custom `mcpay` npm package | Standard MCP SDK + ENS |
| Failure mode | MCPay goes down = entire registry offline | ENS names live on-chain forever |

The key insight: Tollgate's manifest layer closes the gap MCPay left open. Knowing where an MCP is (URL) is not the same as knowing what it returns (schema). Tollgate provides both.

---

## 16. Prize Track Alignment

### KeeperHub

**Target tracks:** Best Innovative Use of KeeperHub + Best Integration (x402/MPP)

Tollgate is built specifically around KeeperHub's x402 implementation and agentic wallet. The entire payment flow relies on:
- KeeperHub MCP server (Claude Code integration)
- KeeperHub agentic wallet (autonomous USDC signing)
- x402 protocol (HTTP 402 → USDC payment → retry cycle)

**Required deliverable:** `FEEDBACK.md` in the repository root — documents integration experience, DX friction, bugs, and feature requests.

### ENS

**Target tracks:** Best ENS Integration for AI Agents + Most Creative Use of ENS

ENS is Tollgate's core registry primitive. The use is novel: ENS text records store not just a name-to-address mapping but a full service manifest pointer — making each ENS subname a self-describing, payable API endpoint. This is the `tollgate:` text record namespace.

---

## 17. Glossary

| Term | Definition |
|---|---|
| **ENS** | Ethereum Name Service. Decentralised naming system for Ethereum addresses and arbitrary data |
| **MCP** | Model Context Protocol. An open standard for connecting AI models to external tools and data sources |
| **Streamable HTTP** | The current MCP transport standard (replaced SSE). Agent connects via POST /mcp |
| **x402** | HTTP 402-based payment protocol. Server returns 402, client pays, client retries |
| **Tollgate Manifest** | JSON file at `/.well-known/tollgate.json`. Declares tools, schemas, prices |
| **Agentic Wallet** | KeeperHub's non-custodial wallet for autonomous USDC payments. No private key on disk |
| **USDC** | USD Coin. Stablecoin used for all Tollgate payments (Base Sepolia: `0x036CbD...`) |
| **Base Sepolia** | Ethereum L2 testnet (Chain ID: 84532). All Tollgate activity runs here |
| **ENS Text Records** | Arbitrary key-value metadata stored on an ENS name. Tollgate uses the `tollgate:` namespace |
| **outputSchema** | Part of the manifest. Declares every field a tool must return and its required type |
| **validateResponse** | Agent function that checks response fields against outputSchema before using the data |
| **Price binding** | The rule that the agent reads price from the manifest and rejects 402 challenges that exceed it by more than 5% |
| **subagent** | A Claude Code instance running in a dedicated terminal with a specific, bounded task |
| **paidTool** | The pattern of registering an MCP tool behind the x402 payment gate |
| **KeeperHub** | Infrastructure provider offering x402-based autonomous payment execution for AI agents |

---

*Tollgate — ENS for discovery. Manifest for trust. KeeperHub for execution.*  
*ETHGlobal Open Agents 2026*
