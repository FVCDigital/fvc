const { ethers } = require("hardhat");
const { 
  getSigners, 
  loadDeployedContracts, 
  checkRoundState,
  logSafeLinks
} = require("../config");

async function main() {
  console.log("🔍 Checking Bonding Contract Balance...");

  // Get signers and load contracts
  const { admin } = await getSigners();
  const { fvc, bonding } = await loadDeployedContracts();

  console.log("📋 Contract Addresses:");
  console.log("FVC Token:", await fvc.getAddress());
  console.log("Bonding Contract:", await bonding.getAddress());

  // Check balances
  console.log("\n💰 Balance Check:");
  const adminFVCBalance = await fvc.balanceOf(admin.address);
  const bondingFVCBalance = await fvc.balanceOf(await bonding.getAddress());
  
  console.log("Admin FVC Balance:", ethers.formatUnits(adminFVCBalance, 18), "FVC");
  console.log("Bonding Contract FVC Balance:", ethers.formatUnits(bondingFVCBalance, 18), "FVC");

  // Check bonding contract state
  console.log("\n📊 Bonding Contract State:");
  await checkRoundState(bonding);

  // Check global state variables
  console.log("\n🌐 Global State Variables:");
  const globalFvcAllocated = await bonding.fvcAllocated();
  const globalFvcSold = await bonding.fvcSold();
  
  console.log("Global FVC Allocated:", ethers.formatUnits(globalFvcAllocated, 18), "FVC");
  console.log("Global FVC Sold:", ethers.formatUnits(globalFvcSold, 18), "FVC");

  // Check if there's a discrepancy
  console.log("\n🔍 Analysis:");
  if (bondingFVCBalance > 0) {
    console.log("✅ FVC tokens are in the bonding contract");
  } else {
    console.log("❌ No FVC tokens in the bonding contract");
  }

  if (globalFvcAllocated > 0) {
    console.log("✅ Global FVC allocated is set");
  } else {
    console.log("❌ Global FVC allocated is not set");
  }

  const round = await bonding.getCurrentRound();
  if (round.fvcAllocated > 0) {
    console.log("✅ Round FVC allocated is set");
  } else {
    console.log("❌ Round FVC allocated is not set");
  }

  logSafeLinks();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 