const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Simple Contract State Check...");

  // Get signers
  const signers = await ethers.getSigners();
  const admin = signers[0];

  // Contract addresses
  const BONDING_ADDRESS = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";
  const FVC_ADDRESS = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";

  console.log("📋 Contract Addresses:");
  console.log("Bonding:", BONDING_ADDRESS);
  console.log("FVC:", FVC_ADDRESS);
  console.log("Admin:", admin.address);

  // Load contract factories
  const Bonding = await ethers.getContractFactory("Bonding");
  const FVC = await ethers.getContractFactory("FVC");
  
  // Attach to deployed contracts
  const bonding = Bonding.attach(BONDING_ADDRESS);
  const fvc = FVC.attach(FVC_ADDRESS);

  // Check FVC token balances
  console.log("\n💰 FVC Token Balances:");
  const bondingFVCBalance = await fvc.balanceOf(BONDING_ADDRESS);
  const adminFVCBalance = await fvc.balanceOf(admin.address);
  const totalSupply = await fvc.totalSupply();
  
  console.log("Bonding Contract FVC Balance:", ethers.formatUnits(bondingFVCBalance, 18), "FVC");
  console.log("Admin FVC Balance:", ethers.formatUnits(adminFVCBalance, 18), "FVC");
  console.log("Total FVC Supply:", ethers.formatUnits(totalSupply, 18), "FVC");

  // Check individual contract state variables
  console.log("\n🔍 Contract State Variables:");
  
  try {
    const fvcAllocated = await bonding.fvcAllocated();
    console.log("fvcAllocated:", ethers.formatUnits(fvcAllocated, 18), "FVC");
  } catch (error) {
    console.log("❌ Error reading fvcAllocated:", error.message);
  }

  try {
    const fvcSold = await bonding.fvcSold();
    console.log("fvcSold:", ethers.formatUnits(fvcSold, 18), "FVC");
  } catch (error) {
    console.log("❌ Error reading fvcSold:", error.message);
  }

  try {
    const currentRoundId = await bonding.currentRoundId();
    console.log("currentRoundId:", currentRoundId.toString());
  } catch (error) {
    console.log("❌ Error reading currentRoundId:", error.message);
  }

  try {
    const totalBonded = await bonding.totalBonded();
    console.log("totalBonded:", ethers.formatUnits(totalBonded, 6), "USDC");
  } catch (error) {
    console.log("❌ Error reading totalBonded:", error.message);
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

  // Check if 10M FVC is allocated
  const EXPECTED_ALLOCATION = ethers.parseUnits("10000000", 18); // 10M FVC
  
  console.log("\n🎯 Allocation Status:");
  console.log("Expected Allocation: 10,000,000 FVC");
  
  if (bondingFVCBalance >= EXPECTED_ALLOCATION) {
    console.log("✅ Bonding contract has 10M+ FVC balance");
  } else {
    console.log("❌ Bonding contract has insufficient FVC balance");
    console.log("Current balance:", ethers.formatUnits(bondingFVCBalance, 18), "FVC");
  }

  console.log("\n📊 Summary:");
  console.log("- Bonding Contract FVC Balance:", ethers.formatUnits(bondingFVCBalance, 18), "FVC");
  console.log("- Admin FVC Balance:", ethers.formatUnits(adminFVCBalance, 18), "FVC");
  console.log("- Total FVC Supply:", ethers.formatUnits(totalSupply, 18), "FVC");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 