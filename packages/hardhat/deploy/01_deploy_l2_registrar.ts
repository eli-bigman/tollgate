import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployL2Registrar: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const registryAddress = process.env.DURIN_L2_REGISTRY;
  if (!registryAddress) {
    throw new Error(
      "DURIN_L2_REGISTRY is not set in .env — deploy the L2Registry at durin.dev first (DURIN_SETUP.md Step 3)",
    );
  }

  console.log(`Deploying L2Registrar against registry: ${registryAddress}`);

  const result = await deploy("L2Registrar", {
    from: deployer,
    args: [registryAddress],
    log: true,
    autoMine: true,
  });

  if (result.newlyDeployed) {
    console.log("\n✅ L2Registrar deployed to:", result.address);
    console.log("👉 Next steps:");
    console.log("   1. Add to .env (all packages):  DURIN_L2_REGISTRAR=" + result.address);
    console.log("   2. Call registry.addRegistrar(" + result.address + ")");
    console.log("      → BaseScan: https://sepolia.basescan.org/address/" + registryAddress + "#writeContract");
    console.log("   3. Verify on BaseScan:");
    console.log("      npx hardhat verify --network baseSepolia " + result.address + " " + registryAddress);
  } else {
    console.log("L2Registrar already deployed at:", result.address);
  }
};

export default deployL2Registrar;

deployL2Registrar.tags = ["L2Registrar"];
