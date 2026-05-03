# TOLLGATE — packages/hardhat CLAUDE.md

## What This Package Is

Deploys the Durin L2Registrar contract to Base Sepolia.
This is the contract the Next.js app calls to mint new `*.tollgate.eth` subnames.

This package has ONE job: deploy and verify the L2Registrar.
Nothing else. Do not add frontend code here.

## Your Scope

Work ONLY inside packages/hardhat/.
Do NOT modify any other package.

## Prerequisite (YOU must confirm before this agent starts)

The L2 Registry must already be deployed via durin.dev.
The DURIN_L2_REGISTRY env var must be set in .env before you start.
See DURIN_SETUP.md Step 3.

## Reference Contracts

- L2Registrar template: https://github.com/namestonehq/durin/blob/main/src/examples/L2Registrar.sol
- IL2Registry interface: https://github.com/namestonehq/durin/blob/main/src/interfaces/IL2Registry.sol
- Durin GitHub: https://github.com/namestonehq/durin

## What to Build

### Step 1 — Copy the Registrar Template

```bash
# Download the Durin L2Registrar template into contracts/
curl -o contracts/L2Registrar.sol \
  https://raw.githubusercontent.com/namestonehq/durin/main/src/examples/L2Registrar.sol

curl -o contracts/interfaces/IL2Registry.sol \
  https://raw.githubusercontent.com/namestonehq/durin/main/src/interfaces/IL2Registry.sol
```

### Step 2 — Customise L2Registrar.sol for Tollgate

The Tollgate Registrar needs to:
1. Accept a `label` (e.g. "crypto") and `owner` address
2. Accept `textRecords` as key-value pairs (for tollgate: namespace records)
3. Call `registry.createSubnode(label, owner)` to mint the NFT
4. Call `registry.setText(node, key, value)` for each text record
5. Emit a `SubnameRegistered(label, owner)` event

Modify the template constructor to accept:
```solidity
constructor(address _registry) {
    registry = IL2Registry(_registry);
    owner = msg.sender;
}
```

Add a register function:
```solidity
function register(
    string calldata label,
    address subnameOwner,
    string[] calldata keys,
    string[] calldata values
) external {
    require(keys.length == values.length, "keys/values length mismatch");
    bytes32 node = registry.createSubnode(label, subnameOwner);
    for (uint i = 0; i < keys.length; i++) {
        registry.setText(node, keys[i], values[i]);
    }
    emit SubnameRegistered(label, subnameOwner, node);
}

event SubnameRegistered(string label, address owner, bytes32 node);
```

### Step 3 — Write Deploy Script

```javascript
// scripts/deployRegistrar.js
const hre = require("hardhat")

async function main() {
  const registryAddress = process.env.DURIN_L2_REGISTRY
  if (!registryAddress) throw new Error("DURIN_L2_REGISTRY not set in .env")

  const Registrar = await hre.ethers.getContractFactory("L2Registrar")
  const registrar = await Registrar.deploy(registryAddress)
  await registrar.waitForDeployment()

  const address = await registrar.getAddress()
  console.log("L2Registrar deployed to:", address)
  console.log("Add to .env: DURIN_L2_REGISTRAR=" + address)
}

main().catch(console.error)
```

### Step 4 — Hardhat Config

```javascript
// hardhat.config.js
require("@nomicfoundation/hardhat-toolbox")
require("dotenv").config()

module.exports = {
  solidity: "0.8.20",
  networks: {
    baseSepolia: {
      url:     process.env.ALCHEMY_BASE_SEPOLIA_RPC,
      accounts: [process.env.PRIVATE_KEY]
    }
  },
  etherscan: {
    apiKey: {
      baseSepolia: process.env.BASESCAN_API_KEY || ""
    },
    customChains: [{
      network: "baseSepolia",
      chainId: 84532,
      urls: {
        apiURL:     "https://api-sepolia.basescan.org/api",
        browserURL: "https://sepolia.basescan.org"
      }
    }]
  }
}
```

## Deploy Commands

```bash
cd packages/hardhat

# Install dependencies
npm install

# Deploy to Base Sepolia
npx hardhat run scripts/deployRegistrar.js --network baseSepolia

# Verify on BaseScan (optional but good for hackathon)
npx hardhat verify --network baseSepolia DEPLOYED_ADDRESS REGISTRY_ADDRESS
```

## After Deployment

1. Copy the deployed address into ALL .env files as `DURIN_L2_REGISTRAR`
2. Call `addRegistrar()` on the L2 Registry (see DURIN_SETUP.md Step 6)
3. Tell the orchestrator: "hardhat complete — registrar deployed at 0x..."

## .env Variables Needed

```
PRIVATE_KEY=0xYOUR_DEPLOYER_KEY
ALCHEMY_BASE_SEPOLIA_RPC=https://base-sepolia.g.alchemy.com/v2/YOUR_KEY
DURIN_L2_REGISTRY=0x...   ← from durin.dev Step 1
BASESCAN_API_KEY=          ← optional, for verification
```
