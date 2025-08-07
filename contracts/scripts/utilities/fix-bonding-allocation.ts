import { ethers } from "hardhat";

async function main() {
  console.log("🔧 Fixing Bonding Allocation to 10M FVC...");

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
  
  // Check current bonding balance
  const currentBondingBalance = await fvc.balanceOf(BONDING_ADDRESS);
  console.log("Current Bonding Balance:", ethers.formatEther(currentBondingBalance));

  // Check owner balance
  const currentOwnerBalance = await fvc.balanceOf(owner.address);
  console.log("Current Owner Balance:", ethers.formatEther(currentOwnerBalance));

  // Calculate target values
  const TARGET_BONDING_ALLOCATION = ethers.parseEther("10000000"); // 10M
  const excessInBonding = currentBondingBalance - TARGET_BONDING_ALLOCATION;

  console.log("\n🎯 Target Values:");
  console.log("Target Bonding Allocation: 10,000,000 FVC");
  console.log("Current Bonding Balance:", ethers.formatEther(currentBondingBalance));
  console.log("Excess in Bonding:", ethers.formatEther(excessInBonding));

  if (excessInBonding <= 0n) {
    console.log("\n✅ Bonding allocation is already correct (10M or less)");
    return;
  }

  console.log("\n🚀 Executing Fix...");

  try {
    // Step 1: Transfer excess from bonding back to owner
    console.log("1. Transferring excess FVC from bonding back to owner...");
    
    // Since the bonding contract's tokens are locked in vesting, we need to use a different approach
    // We'll check if the owner has admin permissions to transfer from bonding
    const DEFAULT_ADMIN_ROLE = await fvc.DEFAULT_ADMIN_ROLE();
    const hasAdminRole = await fvc.hasRole(DEFAULT_ADMIN_ROLE, owner.address);
    console.log("Owner has FVC admin role:", hasAdminRole);

    if (hasAdminRole) {
      // Try to transfer from bonding as admin
      console.log("Attempting admin transfer from bonding...");
      const transferTx = await fvc.transferFrom(BONDING_ADDRESS, owner.address, excessInBonding);
      console.log("Transfer transaction hash:", transferTx.hash);
      await transferTx.wait();
      console.log("✅ Excess FVC transferred from bonding!");
    } else {
      console.log("❌ Owner doesn't have admin role to transfer from bonding");
      console.log("💡 The bonding contract has 30M FVC but should have 10M FVC");
      console.log("📝 This excess will remain locked until vesting periods end");
    }

    // Step 2: Verify the results
    console.log("\n📊 Verification:");
    const newBondingBalance = await fvc.balanceOf(BONDING_ADDRESS);
    const newOwnerBalance = await fvc.balanceOf(owner.address);

    console.log("New Bonding Balance:", ethers.formatEther(newBondingBalance));
    console.log("New Owner Balance:", ethers.formatEther(newOwnerBalance));

    console.log("\n📈 New Allocation Breakdown:");
    const totalSupply = await fvc.totalSupply();
    const bondingPercentage = (newBondingBalance * 100n) / totalSupply;
    const ownerPercentage = (newOwnerBalance * 100n) / totalSupply;
    
    console.log("Bonding Allocation:", bondingPercentage.toString(), "%");
    console.log("Owner:", ownerPercentage.toString(), "%");

    if (newBondingBalance === TARGET_BONDING_ALLOCATION) {
      console.log("\n🎉 SUCCESS: Bonding allocation fixed to 10M FVC!");
    } else {
      console.log("\n⚠️ Bonding allocation is still", ethers.formatEther(newBondingBalance), "FVC");
      console.log("📝 The excess tokens are locked in vesting and cannot be transferred");
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
