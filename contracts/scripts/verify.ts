import { ethers } from "hardhat";
import { run } from "hardhat";

/**
 * FVC Protocol Contract Verification
 * Industry standard: Single verification script for all contracts
 */

async function main() {
  console.log("🔍 FVC Protocol Contract Verification");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const networkName = process.env.HARDHAT_NETWORK || "amoy";
  
  // Load deployment addresses
  const deploymentFile = `deployments-${networkName}.json`;
  let deployments: any;
  
  try {
    deployments = require(`./${deploymentFile}`);
  } catch (error) {
    console.error("❌ Deployment file not found. Run deploy.ts first.");
    return;
  }

  const { contracts, config } = deployments;
  
  console.log("📋 Verifying contracts on", config.network);
  console.log("Chain ID:", deployments.chainId);
  console.log("Deployer:", deployments.deployer);
  console.log("");

  // Verify FVC Token
  console.log("🔍 Verifying FVC Token...");
  try {
    await run("verify:verify", {
      address: contracts.fvcToken,
      constructorArguments: [
        config.fvcName,
        config.fvcSymbol,
        deployments.deployer
      ]
    });
    console.log("✅ FVC Token verified");
  } catch (error) {
    console.log("❌ FVC Token verification failed:", error.message);
  }

  // Verify Mock USDC (testnet only)
  if (contracts.mockUSDC) {
    console.log("🔍 Verifying Mock USDC...");
    try {
      await run("verify:verify", {
        address: contracts.mockUSDC,
        constructorArguments: []
      });
      console.log("✅ Mock USDC verified");
    } catch (error) {
      console.log("❌ Mock USDC verification failed:", error.message);
    }
  }

  // Verify Vesting Contract
  console.log("🔍 Verifying Vesting Contract...");
  try {
    await run("verify:verify", {
      address: contracts.vestingContract,
      constructorArguments: [
        contracts.fvcToken,
        deployments.deployer
      ]
    });
    console.log("✅ Vesting Contract verified");
  } catch (error) {
    console.log("❌ Vesting Contract verification failed:", error.message);
  }

  // Verify Bonding Contract
  console.log("🔍 Verifying Bonding Contract...");
  try {
    const usdcAddress = contracts.mockUSDC || "0xTODO_REAL_USDC_ADDRESS";
    await run("verify:verify", {
      address: contracts.bondingContract,
      constructorArguments: [
        contracts.fvcToken,
        usdcAddress,
        deployments.deployer,
        config.bondingConfig.initialDiscount,
        config.bondingConfig.finalDiscount,
        ethers.parseUnits(config.bondingConfig.epochCap, 6),
        ethers.parseUnits(config.bondingConfig.walletCap, 6),
        config.bondingConfig.vestingPeriod
      ]
    });
    console.log("✅ Bonding Contract verified");
  } catch (error) {
    console.log("❌ Bonding Contract verification failed:", error.message);
  }

  // Contract Info Summary
  console.log("\n📊 Verified Contract Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`🪙 FVC Token: ${contracts.fvcToken}`);
  if (contracts.mockUSDC) {
    console.log(`💵 Mock USDC: ${contracts.mockUSDC}`);
  }
  console.log(`⏰ Vesting: ${contracts.vestingContract}`);
  console.log(`🏦 Bonding: ${contracts.bondingContract}`);
  
  console.log("\n🔗 Blockchain Explorer Links:");
  const baseUrl = networkName === "polygon" 
    ? "https://polygonscan.com/address/" 
    : "https://amoy.polygonscan.com/address/";
  
  console.log(`🪙 FVC Token: ${baseUrl}${contracts.fvcToken}`);
  if (contracts.mockUSDC) {
    console.log(`💵 Mock USDC: ${baseUrl}${contracts.mockUSDC}`);
  }
  console.log(`⏰ Vesting: ${baseUrl}${contracts.vestingContract}`);
  console.log(`🏦 Bonding: ${baseUrl}${contracts.bondingContract}`);

  console.log("\n✅ Verification complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  });
