import { ethers } from "hardhat";

async function main() {
  console.log("=== EMERGENCY UNLOCK VESTING ===");
  
  // Contract addresses from your working deployment
  const BONDING_ADDRESS = "0x26725c6BDb619fbBd7b06ED221A6Fb544812656d"; // Your bonding contract
  const USER_ADDRESS = "0xcABa97a2bb6ca2797e302C864C37632b4185d595"; // User address
  
  // Get signer (should be the owner/deployer)
  const [signer] = await ethers.getSigners();
  console.log("Signer address:", signer.address);
  
  // Connect to bonding contract
  const bonding = await ethers.getContractAt("Bonding", BONDING_ADDRESS);
  
  // Check current vesting status
  console.log("\n📋 BEFORE UNLOCK:");
  try {
    const vestingSchedule = await bonding.getVestingSchedule(USER_ADDRESS);
    console.log("Vesting amount:", ethers.formatUnits(vestingSchedule.amount, 18), "FVC");
    console.log("Start time:", new Date(Number(vestingSchedule.startTime) * 1000));
    console.log("End time:", new Date(Number(vestingSchedule.endTime) * 1000));
    
    const isLocked = await bonding.isLocked(USER_ADDRESS);
    console.log("Is locked:", isLocked);
  } catch (error) {
    console.log("Could not fetch vesting schedule:", error.message);
  }
  
  // Emergency unlock
  console.log("\n🔓 EMERGENCY UNLOCKING...");
  try {
    const tx = await bonding.emergencyUnlockVesting(USER_ADDRESS);
    await tx.wait();
    console.log("✅ Emergency unlock successful!");
    console.log("Transaction hash:", tx.hash);
  } catch (error) {
    console.log("❌ Emergency unlock failed:", error.message);
  }
  
  // Check vesting status after unlock
  console.log("\n📋 AFTER UNLOCK:");
  try {
    const vestingSchedule = await bonding.getVestingSchedule(USER_ADDRESS);
    console.log("Vesting amount:", ethers.formatUnits(vestingSchedule.amount, 18), "FVC");
    
    const isLocked = await bonding.isLocked(USER_ADDRESS);
    console.log("Is locked:", isLocked);
    
    if (!isLocked) {
      console.log("🎉 SUCCESS! User can now transfer FVC tokens!");
    }
  } catch (error) {
    console.log("Could not fetch vesting schedule:", error.message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});