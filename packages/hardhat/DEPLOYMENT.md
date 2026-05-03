# Tollgate L2Registrar — Deployment Reference

## Prerequisites

Before deploying, complete DURIN_SETUP.md Steps 1–4 (durin.dev):
- You must own `tollgate.eth` on Sepolia
- The L2 Registry must be deployed on Base Sepolia
- The L1 Resolver must be set to `0x8A968aB9eb8C084FBC44c531058Fc9ef945c3D61`
- `DURIN_L2_REGISTRY` must be set in `.env`

## Contract Addresses

| Contract          | Network      | Address                                      |
|-------------------|--------------|----------------------------------------------|
| L1 Resolver       | Sepolia      | `0x8A968aB9eb8C084FBC44c531058Fc9ef945c3D61` |
| Registry Factory  | Base Sepolia | `0xDddddDdDDD8Aa1f237b4fa0669cb46892346d22d` |
| L2 Registry       | Base Sepolia | `$DURIN_L2_REGISTRY` (set after durin.dev)   |
| L2 Registrar      | Base Sepolia | `$DURIN_L2_REGISTRAR` (set after deploy)     |
| USDC              | Base Sepolia | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |

## Setup

```bash
cd packages/hardhat
cp .env.example .env
# Fill in: ALCHEMY_BASE_SEPOLIA_RPC, DURIN_L2_REGISTRY, BASESCAN_API_KEY
yarn install
```

## Commands

### Run tests (local hardhat network — no .env needed)
```bash
yarn test
```

### Deploy to Base Sepolia (hardhat-deploy — recommended)
```bash
yarn deploy --network baseSepolia --tags L2Registrar
```

### Deploy to Base Sepolia (standalone script — alternative)
```bash
npx hardhat run scripts/deployRegistrar.ts --network baseSepolia
```

### Verify on BaseScan
```bash
npx hardhat verify --network baseSepolia <DEPLOYED_ADDRESS> <DURIN_L2_REGISTRY>
```

## After Deployment

### 1. Save the address everywhere
```
# packages/hardhat/.env
# packages/nextjs/.env.local
# root .env (if any)
DURIN_L2_REGISTRAR=0x<deployed-address>
```

### 2. Grant minting rights (CRITICAL)
The L2 Registry must authorise this Registrar before it can mint subnames.

**Option A — BaseScan (easiest):**
1. Go to https://sepolia.basescan.org/address/$DURIN_L2_REGISTRY#writeContract
2. Connect your deployer wallet
3. Call `addRegistrar(address)` → pass your L2Registrar address

**Option B — durin.dev:**
Follow Step 6 on https://durin.dev

### 3. Smoke test
Call `register()` on the deployed Registrar via BaseScan with:
- `label`: `"test"`
- `subnameOwner`: your wallet
- `keys`: `["tollgate:type"]`
- `values`: `["mcp"]`

Then verify: https://app.ens.domains → search `test.tollgate.eth` (Sepolia)

## Contract Architecture

```
L2Registrar (this package)
  └── calls IL2Registry.createSubnode(baseNode, label, owner, [])
  └── calls IL2Registry.setText(node, key, value)  ← for each tollgate: record

L2Registry (deployed at durin.dev)
  └── ERC-721 NFT per subname
  └── stores text records on-chain
  └── CCIP-read gateway feeds ENS resolution
```

## Security

- `register()` is permissionless — any address can register a subname
- `pause()` / `unpause()` — owner can halt registrations in an emergency
- `setRegistry()` — owner can point to a new registry (e.g. after upgrade)
- `withdraw()` — drains accidental ETH; no USDC flows through this contract

## Gas Estimates (Base Sepolia)

| Operation        | Gas (approx) |
|------------------|--------------|
| deploy           | ~500k        |
| register (0 recs)| ~120k        |
| register (7 recs)| ~250k        |

Base Sepolia gas is near-zero in USD at current L2 gas prices.
