const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking FVC Allocation Status...");

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

  // Check current round state
  console.log("\n🔍 Current Round State:");
  const currentRound = await bonding.getCurrentRound();
  console.log("Round ID:", currentRound.roundId.toString());
  console.log("Round active:", currentRound.isActive);
  console.log("FVC Allocated:", ethers.formatUnits(currentRound.fvcAllocated, 18), "FVC");
  console.log("FVC Sold:", ethers.formatUnits(currentRound.fvcSold, 18), "FVC");
  console.log("FVC Remaining:", ethers.formatUnits(await bonding.getRemainingFVC(), 18), "FVC");

  // Check FVC token balances
  console.log("\n💰 FVC Token Balances:");
  const bondingFVCBalance = await fvc.balanceOf(BONDING_ADDRESS);
  const adminFVCBalance = await fvc.balanceOf(admin.address);
  const totalSupply = await fvc.totalSupply();
  
  console.log("Bonding Contract FVC Balance:", ethers.formatUnits(bondingFVCBalance, 18), "FVC");
  console.log("Admin FVC Balance:", ethers.formatUnits(adminFVCBalance, 18), "FVC");
  console.log("Total FVC Supply:", ethers.formatUnits(totalSupply, 18), "FVC");

  // Check if 10M FVC is allocated
  const EXPECTED_ALLOCATION = ethers.parseUnits("10000000", 18); // 10M FVC
  const isAllocated = currentRound.fvcAllocated >= EXPECTED_ALLOCATION;
  
  console.log("\n🎯 Allocation Status:");
  console.log("Expected Allocation: 10,000,000 FVC");
  console.log("Actual Allocation:", ethers.formatUnits(currentRound.fvcAllocated, 18), "FVC");
  console.log("Is 10M FVC Allocated:", isAllocated ? "✅ YES" : "❌ NO");

  if (!isAllocated) {
    console.log("\n⚠️ FVC NOT ALLOCATED!");
    console.log("The bonding contract needs 10M FVC to be allocated.");
    console.log("This should be done by calling allocateFVC() with 10M FVC.");
  } else {
    console.log("\n✅ FVC IS ALLOCATED!");
    console.log("The bonding contract has sufficient FVC for bonding operations.");
  }

  // Check if bonding contract has MINTER_ROLE
  console.log("\n🔐 Permissions Check:");
  const MINTER_ROLE = await fvc.MINTER_ROLE();
  const hasMinterRole = await fvc.hasRole(MINTER_ROLE, BONDING_ADDRESS);
  console.log("Bonding has MINTER_ROLE:", hasMinterRole ? "✅ YES" : "❌ NO");

  if (!hasMinterRole) {
    console.log("⚠️ Bonding contract needs MINTER_ROLE to mint FVC tokens!");
  }

  console.log("\n📊 Summary:");
  console.log("- FVC Allocated in Round:", ethers.formatUnits(currentRound.fvcAllocated, 18), "FVC");
  console.log("- FVC Sold:", ethers.formatUnits(currentRound.fvcSold, 18), "FVC");
  console.log("- FVC Remaining:", ethers.formatUnits(await bonding.getRemainingFVC(), 18), "FVC");
  console.log("- Bonding Contract Balance:", ethers.formatUnits(bondingFVCBalance, 18), "FVC");
  console.log("- Has MINTER_ROLE:", hasMinterRole ? "Yes" : "No");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 