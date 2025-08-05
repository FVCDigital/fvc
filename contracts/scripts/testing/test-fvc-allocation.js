const { ethers } = require("hardhat");
const { 
  getSigners, 
  loadDeployedContracts, 
  checkRoundState, 
  allocateFVC,
  logSafeLinks,
  BONDING_CONFIG
} = require("../config");

async function main() {
  console.log("🧪 Testing FVC Allocation...");

  // Get signers and load contracts
  const { admin } = await getSigners();
  const { fvc, bonding } = await loadDeployedContracts();

  console.log("📋 Current State:");
  console.log("Admin address:", admin.address);

  // Check FVC balance
  const fvcBalance = await fvc.balanceOf(admin.address);
  console.log("FVC Balance:", ethers.formatUnits(fvcBalance, 18), "FVC");

  // Check current round state
  await checkRoundState(bonding);

  // Check FVC allowance
  const allowance = await fvc.allowance(admin.address, await bonding.getAddress());
  console.log("FVC Allowance:", ethers.formatUnits(allowance, 18), "FVC");

  // Try to allocate FVC
  console.log("\n💰 Attempting FVC allocation...");
  try {
    await allocateFVC(fvc, bonding, BONDING_CONFIG.FVC_TO_ALLOCATE);
  } catch (error) {
    console.log("❌ Error:", error.message);
    
    // Try to get more details
    try {
      const tx = await bonding.allocateFVC.populateTransaction(BONDING_CONFIG.FVC_TO_ALLOCATE);
      console.log("Transaction data:", tx.data);
    } catch (populateError) {
      console.log("Populate transaction failed:", populateError.message);
    }
  }

  logSafeLinks();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 