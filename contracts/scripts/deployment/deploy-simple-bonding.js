const { 
  getSigners, 
  deployFVC, 
  deployMockUSDC, 
  deployBonding, 
  setupContracts,
  allocateFVC,
  logContractAddresses,
  logBondingConfig,
  logSafeLinks,
  BONDING_CONFIG
} = require("../config");

async function main() {
  console.log("🚀 Deploying Simple Bonding Contract...");

  // Get signers
  const { admin } = await getSigners();
  console.log("📋 Deployer:", admin.address);

  // Deploy contracts
  const fvc = await deployFVC(admin);
  const usdc = await deployMockUSDC();
  const bonding = await deployBonding(fvc, usdc);

  // Setup contracts
  await setupContracts(fvc, bonding, admin.address);

  // Mint initial USDC to admin for testing
  console.log("\n🔧 Minting initial USDC to admin...");
  await usdc.mint(admin.address, BONDING_CONFIG.INITIAL_USDC);
  console.log("✅ 10M USDC minted to admin");

  console.log("\n🎉 DEPLOYMENT COMPLETE!");
  logContractAddresses(fvc, usdc, bonding);
  logBondingConfig();

  // Test the FVC allocation
  console.log("\n🔧 Testing FVC allocation...");
  await allocateFVC(fvc, bonding);
  
  logSafeLinks();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 