const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Debugging FVC Allocation Failure...");

  // Get signers
  const signers = await ethers.getSigners();
  const admin = signers[0];

  // Load contract factories
  const Bonding = await ethers.getContractFactory("Bonding");
  const FVC = await ethers.getContractFactory("FVC");
  
  // Contract addresses
  const BONDING_ADDRESS = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";
  const FVC_ADDRESS = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";
  
  // Attach to deployed contracts
  const bonding = Bonding.attach(BONDING_ADDRESS);
  const fvc = FVC.attach(FVC_ADDRESS);

  console.log("📋 Contract Addresses:");
  console.log("Bonding:", BONDING_ADDRESS);
  console.log("FVC:", FVC_ADDRESS);
  console.log("Admin:", admin.address);

  // Check current balances
  console.log("\n💰 Current Balances:");
  const adminFVCBalance = await fvc.balanceOf(admin.address);
  const bondingFVCBalance = await fvc.balanceOf(BONDING_ADDRESS);
  
  console.log("Admin FVC Balance:", ethers.formatUnits(adminFVCBalance, 18), "FVC");
  console.log("Bonding Contract FVC Balance:", ethers.formatUnits(bondingFVCBalance, 18), "FVC");

  // Check bonding contract state
  console.log("\n🔍 Bonding Contract State:");
  
  try {
    const currentRoundId = await bonding.currentRoundId();
    console.log("Current Round ID:", currentRoundId.toString());
  } catch (error) {
    console.log("❌ Error reading currentRoundId:", error.message);
  }

  try {
    const owner = await bonding.owner();
    console.log("Bonding Contract Owner:", owner);
    console.log("Is admin owner:", owner === admin.address);
  } catch (error) {
    console.log("❌ Error reading owner:", error.message);
  }

  // Check if round is active
  console.log("\n🔍 Round Status:");
  try {
    const round = await bonding.rounds(5); // Current round is 5
    console.log("Round 5 data:", round);
    console.log("Round active:", round.isActive);
  } catch (error) {
    console.log("❌ Error reading round data:", error.message);
  }

  // Check FVC allowance
  console.log("\n🔐 FVC Allowance:");
  try {
    const allowance = await fvc.allowance(admin.address, BONDING_ADDRESS);
    console.log("FVC Allowance:", ethers.formatUnits(allowance, 18), "FVC");
  } catch (error) {
    console.log("❌ Error reading allowance:", error.message);
  }

  // Try to estimate gas for allocateFVC
  console.log("\n⛽ Gas Estimation:");
  const FVC_TO_ALLOCATE = ethers.parseUnits("10000000", 18);
  
  try {
    const gasEstimate = await bonding.allocateFVC.estimateGas(FVC_TO_ALLOCATE);
    console.log("Gas estimate for allocateFVC:", gasEstimate.toString());
  } catch (error) {
    console.log("❌ Gas estimation failed:", error.message);
    
    // Try to get more details about the error
    console.log("\n🔍 Error Details:");
    console.log("Error code:", error.code);
    console.log("Error message:", error.message);
    
    if (error.data) {
      console.log("Error data:", error.data);
    }
  }

  // Check if bonding contract has MINTER_ROLE
  console.log("\n🔐 Permissions Check:");
  try {
    const MINTER_ROLE = await fvc.MINTER_ROLE();
    const hasMinterRole = await fvc.hasRole(MINTER_ROLE, BONDING_ADDRESS);
    console.log("Bonding has MINTER_ROLE:", hasMinterRole ? "✅ YES" : "❌ NO");
  } catch (error) {
    console.log("❌ Error checking MINTER_ROLE:", error.message);
  }

  // Check if the bonding contract is paused
  console.log("\n⏸️ Pause Status:");
  try {
    const isPaused = await bonding.paused();
    console.log("Contract is paused:", isPaused ? "✅ YES" : "❌ NO");
  } catch (error) {
    console.log("❌ Error checking pause status:", error.message);
  }

  console.log("\n📊 Summary:");
  console.log("- Admin FVC Balance:", ethers.formatUnits(adminFVCBalance, 18), "FVC");
  console.log("- Bonding FVC Balance:", ethers.formatUnits(bondingFVCBalance, 18), "FVC");
  console.log("- Target Allocation: 10,000,000 FVC");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 