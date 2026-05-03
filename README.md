# Tollgate

**Tollgate is an ENS-native, pay-per-call marketplace for MCP servers.** It acts as the infrastructure layer connecting AI agents to the data and capabilities they need — without API keys, subscriptions, or human intervention.




## Screenshots


**Directory / Home**
[Screenshot: Directory]

**Service Registration**
[Screenshot: Register]

**Agent Demo & Live Activity**
[Screenshot: Agent Demo]

---

## The Problem

Current AI agents require pre-loaded API keys. This creates three problems:
1. **No Discovery**: Developers must manually find, sign up for, and provide credentials to the agent.
2. **No Trust**: If an API's return format changes, the agent breaks silently because it cannot verify response schemas.
3. **No Autonomous Payment**: Humans must pre-fund API accounts and manage subscriptions.

## The Tollgate Solution

Tollgate solves this with three primitives:
1. **ENS for Discovery**: Agents resolve an ENS subname (e.g., `weather.tollgate.eth`) to find the server URL.
2. **Tollgate Manifest for Trust**: A machine-readable JSON contract (`/.well-known/tollgate.json`) declares tool schemas and prices.
3. **KeeperHub for Payment**: Agents autonomously pay per-tool call using the x402 protocol and KeeperHub's agentic wallet.

---

## Core Architecture

Tollgate is built on three layers. Every interaction flows through all three:

### 1. ENS Registry Layer (Discovery)
Instead of a centralized database, Tollgate uses **ENS on Base Sepolia**. Every registered MCP is an ENS subname under `tollgate.eth`.
The registry uses the `tollgate:` text record namespace:
- `tollgate:url` - The base URL of the MCP server.
- `tollgate:manifest` - A verifiable pointer to the server's manifest (the trust anchor).
- `tollgate:payee` - The wallet address receiving USDC payments.

### 2. Tollgate Manifest (Trust)
Every registered MCP server hosts a `tollgate.json` file. Before calling any tool, an agent fetches this manifest to:
- Discover available tools and parameter requirements (`inputSchema`).
- Confirm prices per tool (preventing surprise overcharges).
- Validate the response structure (`outputSchema`). 

### 3. Payment Layer — KeeperHub x402 (Execution)
Built around KeeperHub's agentic wallet and the x402 protocol:
- The agent calls a tool. The MCP returns an HTTP 402 Payment Required challenge.
- The KeeperHub agentic wallet intercepts the challenge, signs a USDC transfer on Base Sepolia, and retries the request with a payment header.
- The MCP verifies the payment and returns the requested data.

---

## The Demo Agent

The Tollgate repository includes an autonomous demo agent (powered by Claude 3.5 Sonnet) that demonstrates the flow end-to-end:
1. Lists available services from ENS.
2. Fetches the Tollgate manifest for the selected services.
3. Verifies the tool price.
4. Calls the tool and autonomously pays via KeeperHub.
5. Validates the returned data against the manifest schema.
6. Synthesizes the final answer.

### Included Demo MCPs:
- **CryptoData** (`crypto.tollgate.eth`): Real-time token prices and market data.
- **Weather** (`weather.tollgate.eth`): Global weather forecasting.
- **OnChain** (`chain.tollgate.eth`): Wallet balances and recent transactions on Base Sepolia.

---

## Tech Stack

- **Frontend**: Next.js 14 App Router, Tailwind CSS, Viem, ENSjs v4
- **Smart Contracts / Chain**: Base Sepolia, USDC
- **Agent Infrastructure**: KeeperHub (Agentic Wallet, x402 protocol), Anthropic SDK (`claude-sonnet-4`)
- **Backend / MCP**: Node.js, Express, `@modelcontextprotocol/sdk`