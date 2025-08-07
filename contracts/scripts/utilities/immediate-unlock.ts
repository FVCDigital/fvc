import { ethers } from "hardhat";

async function main() {
  console.log("🔓 Attempting immediate vesting unlock...");

  // Get the signer
  const [owner] = await ethers.getSigners();
  console.log("Owner address:", owner.address);

  // Contract addresses
  const BONDING_ADDRESS = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";
  const FVC_ADDRESS = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";
  const USER_ADDRESS = "0xcABa97a2bb6ca2797e302C864C37632b4185d595";

  // Get contract instances
  const bonding = await ethers.getContractAt("Bonding", BONDING_ADDRESS);
  const fvc = await ethers.getContractAt("FVC", FVC_ADDRESS);

  console.log("\n📊 Current Status:");
  
  // Check if owner is the bonding contract owner
  const bondingOwner = await bonding.owner();
  console.log("Bonding contract owner:", bondingOwner);
  console.log("Current signer is owner:", bondingOwner === owner.address);

  // Check user's FVC balance
  const userBalance = await fvc.balanceOf(USER_ADDRESS);
  console.log("User FVC balance:", ethers.formatEther(userBalance));

  // Check vesting schedule
  try {
    const vestingSchedule = await bonding.getVestingSchedule(USER_ADDRESS);
    console.log("Vesting schedule:", {
      amount: ethers.formatEther(vestingSchedule.amount),
      startTime: new Date(Number(vestingSchedule.startTime) * 1000).toISOString(),
      endTime: new Date(Number(vestingSchedule.endTime) * 1000).toISOString()
    });
  } catch (error) {
    console.log("Could not get vesting schedule:", error.message);
  }

  // Check if user has admin role on FVC
  const DEFAULT_ADMIN_ROLE = await fvc.DEFAULT_ADMIN_ROLE();
  const hasAdminRole = await fvc.hasRole(DEFAULT_ADMIN_ROLE, owner.address);
  console.log("Signer has FVC admin role:", hasAdminRole);

  console.log("\n🚀 Attempting Emergency Unlock...");

  try {
    // Step 1: Try to unlock vesting for the user
    console.log("1. Calling emergencyUnlockVesting...");
    const unlockTx = await bonding.emergencyUnlockVesting(USER_ADDRESS);
    console.log("Unlock transaction hash:", unlockTx.hash);
    
    const unlockReceipt = await unlockTx.wait();
    console.log("✅ Unlock transaction confirmed!");

    // Step 2: Try to transfer tokens to burn address
    console.log("\n2. Attempting to transfer tokens to burn address...");
    const burnAddress = "0x000000000000000000000000000000000000dEaD";
    
    const transferTx = await fvc.transfer(burnAddress, userBalance);
    console.log("Transfer transaction hash:", transferTx.hash);
    
    const transferReceipt = await transferTx.wait();
    console.log("✅ Transfer transaction confirmed!");

    // Step 3: Verify the result
    console.log("\n📊 Verification:");
    const newBalance = await fvc.balanceOf(USER_ADDRESS);
    console.log("New user FVC balance:", ethers.formatEther(newBalance));
    
    if (newBalance === 0n) {
      console.log("🎉 SUCCESS: User now has 0 FVC!");
    } else {
      console.log("⚠️ User still has FVC tokens");
    }

  } catch (error) {
    console.log("❌ Error during unlock process:", error.message);
    
    // Fallback: Try alternative methods
    console.log("\n🔄 Trying alternative methods...");
    
    try {
      // Try to complete current round
      console.log("Trying to complete current round...");
      const completeTx = await bonding.completeCurrentRound();
      await completeTx.wait();
      console.log("✅ Current round completed");
    } catch (completeError) {
      console.log("❌ Could not complete round:", completeError.message);
    }
    
    try {
      // Try to start new round with 0 vesting
      console.log("Trying to start new round with 0 vesting...");
      const startTx = await bonding.startNewRound(0, 0, 0, 0);
      await startTx.wait();
      console.log("✅ New round started with 0 vesting");
    } catch (startError) {
      console.log("❌ Could not start new round:", startError.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
