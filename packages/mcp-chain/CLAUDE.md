# TOLLGATE — packages/mcp-chain CLAUDE.md

## What This Package Is

The OnChain MCP server. Wraps the Alchemy Token API to expose on-chain
data for any Ethereum address. Three paid tools behind x402 payment gating.
Runs on port 3003. Registered as `chain.tollgate.eth`.

## Your Scope

Work ONLY inside packages/mcp-chain/.
Import types from: ../../shared/manifest-types
Import middleware from: ../../shared/x402-middleware
Do NOT modify shared/ or any other package.

## Prerequisite

shared/manifest-types and shared/x402-middleware must be complete before you start.

## Files to Build

### src/manifest.ts

```typescript
export const manifest: TollgateManifest = {
  ens:          process.env.ENS_NAME     || "chain.tollgate.eth",
  version:      "1.0",
  description:  "On-chain data: ETH balance, token holdings, recent transactions",
  category:     "blockchain",
  payee:        process.env.PAYEE_WALLET || "",
  chain:        "base-sepolia",
  usdcContract: "0x5dEaC602762362FE5f135FA5904351916053cF70",
  defaultPrice: "0.02",
  tools: [
    {
      name:        "get_eth_balance",
      description: "Get the ETH balance of any address",
      price:       "0.01",
      inputSchema: {
        address: { type: "string", required: true, description: "EVM address 0x..." }
      },
      outputSchema: {
        address:     { type: "string", required: true },
        balance_eth: { type: "number", required: true, description: "Formatted ETH" },
        balance_wei: { type: "string", required: true, description: "Raw wei as string" },
        chain:       { type: "string", required: true },
        timestamp:   { type: "number", required: true }
      }
    },
    {
      name:        "get_token_holdings",
      description: "Get all ERC-20 token balances for an address",
      price:       "0.02",
      inputSchema: {
        address: { type: "string", required: true }
      },
      outputSchema: {
        address:   { type: "string", required: true },
        tokens:    { type: "array",  required: true,
                     description: "[{ contractAddress, tokenBalance }]" },
        chain:     { type: "string", required: true },
        timestamp: { type: "number", required: true }
      }
    },
    {
      name:        "get_recent_txs",
      description: "Get recent transactions sent from an address",
      price:       "0.02",
      inputSchema: {
        address: { type: "string", required: true },
        limit:   { type: "number", required: false, description: "Max 20, default 5" }
      },
      outputSchema: {
        address:      { type: "string", required: true },
        transactions: { type: "array",  required: true,
                        description: "[{ hash, from, to, value, asset, blockNum }]" },
        chain:        { type: "string", required: true },
        timestamp:    { type: "number", required: true }
      }
    }
  ],
  updatedAt: new Date().toISOString()
}
```

### src/data/alchemy.ts

```typescript
const RPC = process.env.ALCHEMY_BASE_SEPOLIA_RPC!

export async function alchemyRpc(method: string, params: unknown[]) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params })
  })
  const json = await res.json()
  if (json.error) throw new Error(`Alchemy error: ${json.error.message}`)
  return json.result
}
```

### src/tools/get-eth-balance.ts

Use Viem createPublicClient with the Alchemy RPC:
```typescript
import { createPublicClient, http, formatEther } from 'viem'
import { baseSepolia } from 'viem/chains'

const client = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.ALCHEMY_BASE_SEPOLIA_RPC)
})

export async function getEthBalance(input: { address: string }) {
  const raw = await client.getBalance({ address: input.address as `0x${string}` })
  return {
    address:     input.address,
    balance_eth: parseFloat(formatEther(raw)),  // must be number
    balance_wei: raw.toString(),                 // must be string
    chain:       "base-sepolia",
    timestamp:   Date.now()
  }
}
```

### src/tools/get-token-holdings.ts

```typescript
const result = await alchemyRpc("alchemy_getTokenBalances", [address])
const nonZero = result.tokenBalances.filter((t: any) => t.tokenBalance !== "0x0")
return {
  address,
  tokens:    nonZero,   // array of { contractAddress, tokenBalance }
  chain:     "base-sepolia",
  timestamp: Date.now()
}
```

### src/tools/get-recent-txs.ts

```typescript
const result = await alchemyRpc("alchemy_getAssetTransfers", [{
  fromAddress: address,
  category:   ["external", "erc20"],
  maxCount:   `0x${(limit || 5).toString(16)}`
}])
return {
  address,
  transactions: result.transfers.slice(0, limit || 5),
  chain:        "base-sepolia",
  timestamp:    Date.now()
}
```

## Tests Required

```typescript
it('manifest has ens, payee, 3 tools')
it('get_eth_balance balance_eth is a number (not string)')
it('get_eth_balance balance_wei is a string')
it('get_eth_balance includes chain and timestamp fields')
it('get_token_holdings returns tokens array')
it('get_recent_txs respects limit parameter')
it('get_recent_txs each tx has hash, from, to, value, asset')
it('all 3 tools include chain: "base-sepolia" in output')
it('GET /.well-known/tollgate.json returns valid manifest JSON')
it('tools/call without payment returns 402')
```

## Environment Variables (.env)

```
PORT=3003
MCP_NAME=chain
ENS_NAME=chain.tollgate.eth
PAYEE_WALLET=0x...
USDC_CONTRACT=0x5dEaC602762362FE5f135FA5904351916053cF70
ALCHEMY_BASE_SEPOLIA_RPC=https://base-sepolia.g.alchemy.com/v2/YOUR_KEY
```

Announce "mcp-chain complete" when tests pass and server starts.
