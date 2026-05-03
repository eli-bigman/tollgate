# TOLLGATE — packages/nextjs CLAUDE.md (v2 — Durin Edition)

## What This Package Is

The Next.js 14 frontend and API layer for Tollgate. Three pages plus API routes.
The frontend was prototyped in Stitch (HTML). Convert Stitch sections to .tsx
components preserving the design, using Tailwind for styling.

## Your Scope

Work ONLY inside packages/nextjs/.
Do NOT modify shared/, other packages/, or hardhat/.

## Stack

- Next.js 14 App Router, TypeScript, Tailwind CSS
- Viem for all blockchain calls (L2 Registry reads + Registrar writes)
- ENSjs v4 for L1 ENS resolution only (reading resolved addresses/records)
- Chain: Base Sepolia (84532) for all contract calls

## ENS Architecture — Durin (IMPORTANT)

Subnames are stored on-chain in the Durin L2Registry contract on Base Sepolia.
There is NO local JSON cache. All reads come from the contract. All writes go
through the L2Registrar contract.

### Reading subnames (list all services):

```typescript
// Read all SubnameRegistered events from the L2 Registry
const logs = await publicClient.getLogs({
  address: process.env.DURIN_L2_REGISTRY as `0x${string}`,
  event: parseAbiItem('event SubnameRegistered(string label, address owner, bytes32 node)'),
  fromBlock: BigInt(process.env.REGISTRY_DEPLOY_BLOCK || '0'),
})
// For each log, read text records:
// registry.text(node, 'tollgate:url')
// registry.text(node, 'tollgate:manifest')
// etc.
```

### Writing subnames (register new service):

```typescript
// Call Registrar.register(label, owner, keys[], values[])
const hash = await walletClient.writeContract({
  address: process.env.DURIN_L2_REGISTRAR as `0x${string}`,
  abi: REGISTRAR_ABI,
  functionName: 'register',
  args: [label, ownerAddress, Object.keys(records), Object.values(records)]
})
```

### Minimal ABIs to define in utils/ens.ts:

```typescript
const REGISTRY_ABI = [
  'function text(bytes32 node, string key) view returns (string)',
] as const

const REGISTRAR_ABI = [
  'function register(string label, address owner, string[] keys, string[] values) nonpayable',
] as const
```

## ENS Text Record Keys

All records use `tollgate:` prefix:
  "tollgate:url", "tollgate:manifest", "tollgate:type",
  "tollgate:payee", "tollgate:description", "tollgate:category", "tollgate:version"

`tollgate:manifest` MUST always be set. It is the trust anchor.
Format: "{endpoint_url}/.well-known/tollgate.json"

## Pages

### / (Directory)
- Reads all SubnameRegistered events from L2 Registry → builds service list
- For each service: fetch GET /api/manifest/fetch?url={manifestUrl}
- Per-tool prices come from the manifest, NOT from text records
- ServiceCard: ENS name, type badge, description, per-tool price rows, ManifestViewer

### /register
- Type toggle: MCP vs API
- URL input (500ms debounce): fetch manifest → show validation result
- Auto-populate manifest URL: {endpoint}/.well-known/tollgate.json
- On submit: POST /api/ens/register → calls Registrar contract
- Right panel: live JSON preview of what will be stored

### /agent
- Task input with 3 preset task pills
- Left: SSE from POST /api/agent/run → render agent events
- Right: budget meter + activity feed (polls /api/activity every 2s)

## API Routes

| Route | Method | What it does |
|---|---|---|
| /api/ens/register | POST | Calls L2Registrar.register() via Viem |
| /api/ens/resolve | GET ?name= | Reads text records from L2 Registry |
| /api/ens/list | GET | Reads SubnameRegistered events from L2 Registry |
| /api/manifest/fetch | GET ?url= | Proxy-fetch manifest (avoids CORS) |
| /api/agent/run | POST { task } | Start agent, return SSE stream |
| /api/activity | GET | Return payment activity log |

## Converting Stitch HTML to Components

1. Create .tsx file in components/
2. Replace inline styles with Tailwind classes
3. Make all data passed as props — no hardcoded content
4. Add "use client" only when using state or browser APIs
5. Export as default and named export

## Design Tokens (from Stitch output — keep consistent)

```
Background: #FFFFFF    Surface: #F9FAFB    Border: #E5E7EB
Text:        #111827    Muted: #6B7280
Indigo:      #6366F1    Emerald: #10B981    Amber: #F59E0B
Font: Inter (sans), JetBrains Mono (mono for addresses/prices)
```

## Key Environment Variables

```
ALCHEMY_BASE_SEPOLIA_RPC=
DEPLOYER_PRIVATE_KEY=
DEPLOYER_WALLET_ADDRESS=
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_PARENT_ENS=tollgate.eth
DURIN_L2_REGISTRY=0x...
DURIN_L2_REGISTRAR=0x...
REGISTRY_DEPLOY_BLOCK=0
ANTHROPIC_API_KEY=
MCP_CRYPTO_URL=http://localhost:3001
MCP_WEATHER_URL=http://localhost:3002
MCP_CHAIN_URL=http://localhost:3003
```

## Never Do

- Never use a JSON cache file for ENS state. Always read from the contract.
- Never fetch manifests directly from browser JS (CORS). Use /api/manifest/fetch.
- Never read per-tool prices from ENS records. Always from the fetched manifest.
- Never use <form> HTML tags — use onClick handlers.
- Never import from packages/hardhat/.
