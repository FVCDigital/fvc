import { ethers } from "hardhat";

async function main() {
  console.log("🔧 Fixing Total Supply to Exactly 1B FVC...");

  // Get the signer
  const [owner] = await ethers.getSigners();
  console.log("Owner address:", owner.address);

  // Contract addresses
  const FVC_ADDRESS = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";
  const BONDING_ADDRESS = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";

  // Get contract instances
  const fvc = await ethers.getContractAt("FVC", FVC_ADDRESS);
  const bonding = await ethers.getContractAt("Bonding", BONDING_ADDRESS);

  console.log("\n📊 Current State:");
  
  const currentTotalSupply = await fvc.totalSupply();
  const currentBondingBalance = await fvc.balanceOf(BONDING_ADDRESS);
  const ownerBalance = await fvc.balanceOf(owner.address);

  console.log("Current Total Supply:", ethers.formatEther(currentTotalSupply));
  console.log("Current Bonding Balance:", ethers.formatEther(currentBondingBalance));
  console.log("Current Owner Balance:", ethers.formatEther(ownerBalance));

  // Calculate target
  const TARGET_TOTAL_SUPPLY = ethers.parseEther("1000000000"); // 1B
  const excessSupply = currentTotalSupply - TARGET_TOTAL_SUPPLY;

  console.log("\n🎯 Target:");
  console.log("Target Total Supply: 1,000,000,000 FVC (1B)");
  console.log("Excess Supply to Burn:", ethers.formatEther(excessSupply));

  if (excessSupply <= 0n) {
    console.log("\n✅ Total supply is already 1B or less");
    return;
  }

  console.log("\n🚀 Burning Excess Supply...");

  try {
    // Transfer excess tokens to burn address
    const burnAddress = "0x000000000000000000000000000000000000dEaD";
    console.log("Transferring", ethers.formatEther(excessSupply), "FVC to burn address...");
    const transferTx = await fvc.transfer(burnAddress, excessSupply);
    console.log("Transfer transaction hash:", transferTx.hash);
    await transferTx.wait();
    console.log("✅ Excess FVC transferred to burn address!");

    // Verify final state
    console.log("\n📊 Final State:");
    const newTotalSupply = await fvc.totalSupply();
    const newBondingBalance = await fvc.balanceOf(BONDING_ADDRESS);
    const newOwnerBalance = await fvc.balanceOf(owner.address);

    console.log("Total Supply:", ethers.formatEther(newTotalSupply));
    console.log("Bonding Balance:", ethers.formatEther(newBondingBalance));
    console.log("Owner Balance:", ethers.formatEther(newOwnerBalance));

    console.log("\n📈 Final Allocation Breakdown:");
    const bondingPercentage = (newBondingBalance * 100n) / newTotalSupply;
    const ownerPercentage = (newOwnerBalance * 100n) / newTotalSupply;
    
    console.log("Bonding Allocation:", bondingPercentage.toString(), "%");
    console.log("Owner (Unallocated):", ownerPercentage.toString(), "%");

    if (newTotalSupply === TARGET_TOTAL_SUPPLY) {
      console.log("\n🎉 SUCCESS: Total supply fixed to exactly 1B FVC!");
      console.log("✅ Total supply:", ethers.formatEther(newTotalSupply), "FVC");
      console.log("✅ Bonding has", ethers.formatEther(newBondingBalance), "FVC (30%)");
      console.log("✅ Owner has", ethers.formatEther(newOwnerBalance), "FVC (70%)");
    } else {
      console.log("\n⚠️ Total supply adjustment incomplete");
      console.log("📝 Total supply:", ethers.formatEther(newTotalSupply), "FVC (target: 1B)");
    }

  } catch (error) {
    console.log("❌ Error during burn:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
