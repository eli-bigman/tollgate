/**
 * Standalone deploy script for the L2Registrar.
 * Equivalent to the hardhat-deploy script but runnable directly:
 *
 *   npx hardhat run scripts/deployRegistrar.ts --network baseSepolia
 */
import * as dotenv from "dotenv";
dotenv.config();

import { ethers } from "hardhat";

async function main() {
  const registryAddress = process.env.DURIN_L2_REGISTRY;
  if (!registryAddress || registryAddress === "0x") {
    throw new Error(
      "DURIN_L2_REGISTRY is not set in .env\n" +
        "Deploy the L2Registry at https://durin.dev first (see DURIN_SETUP.md Step 3)",
    );
  }

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:        ", deployer.address);
  console.log("L2 Registry:     ", registryAddress);
  console.log("Network:         ", (await ethers.provider.getNetwork()).name);

  const Factory = await ethers.getContractFactory("L2Registrar");
  const registrar = await Factory.deploy(registryAddress);
  await registrar.waitForDeployment();

  const address = await registrar.getAddress();
  console.log("\n✅ L2Registrar deployed to:", address);
  console.log("\nNext steps:");
  console.log("  1. Add to ALL .env files:   DURIN_L2_REGISTRAR=" + address);
  console.log("  2. Grant minting rights:");
  console.log("     → BaseScan Write Contract on your L2 Registry:");
  console.log("       addRegistrar(" + address + ")");
  console.log("  3. Verify on BaseScan:");
  console.log("     npx hardhat verify --network baseSepolia " + address + " " + registryAddress);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
