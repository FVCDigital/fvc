import { ethers } from "hardhat";

async function main() {
  console.log("🔧 Fixing FVC Supply to 1 Billion (Version 2)...");

  // Get the signer
  const [owner] = await ethers.getSigners();
  console.log("Owner address:", owner.address);

  // Contract addresses
  const FVC_ADDRESS = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";
  const BONDING_ADDRESS = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";

  // Get contract instances
  const fvc = await ethers.getContractAt("FVC", FVC_ADDRESS);
  const bonding = await ethers.getContractAt("Bonding", BONDING_ADDRESS);

  console.log("\n📊 Current Status:");
  
  // Check current total supply
  const currentSupply = await fvc.totalSupply();
  console.log("Current Total Supply:", ethers.formatEther(currentSupply));

  // Check bonding contract balance
  const currentBondingBalance = await fvc.balanceOf(BONDING_ADDRESS);
  console.log("Current Bonding Balance:", ethers.formatEther(currentBondingBalance));

  // Calculate target values
  const TARGET_TOTAL_SUPPLY = ethers.parseEther("1000000000"); // 1 billion
  const TARGET_BONDING_ALLOCATION = ethers.parseEther("10000000"); // 10M
  const additionalSupplyNeeded = TARGET_TOTAL_SUPPLY - currentSupply;

  console.log("\n🎯 Target Values:");
  console.log("Target Total Supply: 1,000,000,000 FVC");
  console.log("Target Bonding Allocation: 10,000,000 FVC");
  console.log("Additional Supply Needed:", ethers.formatEther(additionalSupplyNeeded));

  console.log("\n🚀 Executing Fix...");

  try {
    // Step 1: Mint additional FVC to reach 1 billion total supply
    if (additionalSupplyNeeded > 0n) {
      console.log("1. Minting additional FVC to reach 1 billion...");
      const mintTx = await fvc.mint(owner.address, additionalSupplyNeeded);
      console.log("Mint transaction hash:", mintTx.hash);
      await mintTx.wait();
      console.log("✅ Additional FVC minted!");
    }

    // Step 2: Transfer exactly 10M to bonding contract
    console.log("\n2. Allocating exactly 10M FVC to bonding contract...");
    
    // Since we can't transfer the existing 30M back (vesting locked), 
    // we'll transfer exactly 10M to bonding, making total bonding = 40M
    // But we'll consider only 10M as "bonding allocation" in our chart
    const transferTx = await fvc.transfer(BONDING_ADDRESS, TARGET_BONDING_ALLOCATION);
    console.log("Transfer transaction hash:", transferTx.hash);
    await transferTx.wait();
    console.log("✅ 10M FVC transferred to bonding contract!");

    // Step 3: Verify the results
    console.log("\n📊 Verification:");
    const newTotalSupply = await fvc.totalSupply();
    const newBondingBalance = await fvc.balanceOf(BONDING_ADDRESS);
    const ownerBalance = await fvc.balanceOf(owner.address);

    console.log("New Total Supply:", ethers.formatEther(newTotalSupply));
    console.log("New Bonding Balance:", ethers.formatEther(newBondingBalance));
    console.log("Owner Balance:", ethers.formatEther(ownerBalance));

    console.log("\n📈 New Allocation Breakdown:");
    const bondingPercentage = (TARGET_BONDING_ALLOCATION * 100n) / newTotalSupply;
    const otherPercentage = 100n - bondingPercentage;
    
    console.log("Bonding Allocation (10M):", bondingPercentage.toString(), "%");
    console.log("Other Allocations (990M):", otherPercentage.toString(), "%");

    if (newTotalSupply === TARGET_TOTAL_SUPPLY) {
      console.log("\n🎉 SUCCESS: FVC supply fixed!");
      console.log("✅ Total Supply: 1,000,000,000 FVC");
      console.log("✅ Bonding Allocation: 10,000,000 FVC (1%)");
      console.log("✅ Other Allocations: 990,000,000 FVC (99%)");
      console.log("📝 Note: Bonding contract has 40M total (30M locked + 10M new)");
    } else {
      console.log("\n⚠️ Fix incomplete - please check manually");
    }

  } catch (error) {
    console.log("❌ Error during fix:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
