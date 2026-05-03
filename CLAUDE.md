# CLAUDE.md
For a any Scaffold-ETH 2 framework reference @AGENTS.md

# TOLLGATE — Root CLAUDE.md (v2 — Durin Edition)

## What This Project Is

Tollgate is an ENS-native, pay-per-call marketplace for MCP servers.
Developers publish MCP servers under ENS subnames (e.g. `crypto.tollgate.eth`).
Each ENS name points to a Tollgate Manifest — a JSON contract at
`/.well-known/tollgate.json` declaring every tool, its price, its input schema,
and its output schema. Agents resolve the name, read the manifest, pay per tool
call via USDC (x402), and validate the response before using it.

Read PRD.md for full product context.
Read DURIN_SETUP.md for the manual setup steps (completed before building).

## ENS Architecture — Durin L2 Names

Tollgate uses **Durin** (https://durin.dev) for ENS subname issuance on L2.
Subnames live on Base Sepolia as ERC-721 NFTs inside an L2Registry contract —
NOT written directly via ENSjs on L1.

```
Resolution flow:
  Agent resolves crypto.tollgate.eth
    → ENS L1 (Sepolia) resolver: 0x8A968aB9eb8C084FBC44c531058Fc9ef945c3D61
    → CCIP-read gateway
    → L2 Registry on Base Sepolia (your deployed contract)
    → returns address + text records

Registration flow (via Tollgate UI):
  User submits form
    → POST /api/ens/register
    → Viem calls Registrar.register(label, owner, textRecords)
    → L2 Registrar calls L2Registry.createSubnode()
    → subname minted as NFT with text records on-chain
```

## Monorepo Structure

```
tollgate/
├── packages/
│   ├── nextjs/        — Next.js 14 frontend + API routes
│   ├── mcp-crypto/    — CryptoData MCP server
│   ├── mcp-weather/   — Weather MCP server
│   ├── mcp-chain/     — OnChain MCP server
│   ├── agent/         — Autonomous demo agent
│   └── hardhat/       — L2Registrar deployment (Durin) ← ACTIVE
└── shared/
    ├── manifest-types/ — Shared TypeScript interfaces
    └── x402-middleware/ — Shared Express payment middleware
```

packages/hardhat/ is ACTIVE. It deploys the Durin L2Registrar contract.

## Contract Reference

| Contract | Network | Address |
|---|---|---|
| L2 Registry | Base Sepolia | process.env.DURIN_L2_REGISTRY |
| L2 Registrar | Base Sepolia | process.env.DURIN_L2_REGISTRAR |
| L1 Resolver | Sepolia (L1) | 0x8A968aB9eb8C084FBC44c531058Fc9ef945c3D61 |
| Registry Factory | Base Sepolia | 0xDddddDdDDD8Aa1f237b4fa0669cb46892346d22d |
| USDC | Base Sepolia | 0x5dEaC602762362FE5f135FA5904351916053cF70 |

## Chain Reference

| Item | Value |
|---|---|
| L2 network | Base Sepolia — Chain ID 84532 |
| L2 RPC | process.env.ALCHEMY_BASE_SEPOLIA_RPC |
| L1 network | Sepolia — ENS parent name lives here |
| ENS parent name | process.env.NEXT_PUBLIC_PARENT_ENS |

## ENS Text Record Namespace

All subname records use the `tollgate:` prefix, stored in the L2 Registry
contract on-chain. Never use a local JSON file for registry state.

```
tollgate:url         → MCP server base URL
tollgate:manifest    → /.well-known/tollgate.json URL (trust anchor)
tollgate:type        → "mcp" or "api"
tollgate:payee       → 0x... payment wallet
tollgate:description → human-readable description
tollgate:category    → finance / weather / blockchain / data / other
tollgate:version     → "1.0"
```

## Absolute Rules

- Never use a local JSON file as the ENS registry. All state is on-chain.
- Read subnames from the L2 Registry contract. Write through the L2 Registrar.
- The manifest is the source of truth for prices. Never hardcode prices.
- tools/list is always free. Only tools/call requires x402 payment.
- All payments use Base Sepolia USDC: 0x5dEaC602762362FE5f135FA5904351916053cF70

## 3-Layer Binding

  Layer 1 = ENS subname (on-chain via Durin) → holds manifest URL + payee
  Layer 2 = Manifest → declares tools, schemas, prices
  Layer 3 = MCP server → implements tools, validates output

## Price Binding Rule
Agent reads price from manifest. If 402 challenge exceeds manifest price
by more than 5%, agent aborts: { error: "price_mismatch" }

## Output Validation Rule
After every paid tool call, agent validates all required outputSchema fields
are present and correctly typed. Invalid data is reported, never used.

## When in Doubt
Read SPRINT_PLAN.md, DURIN_SETUP.md, PRD.md
