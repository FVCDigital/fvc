import { ethers } from "hardhat";

async function main() {
  console.log("🔓 Attempting direct vesting unlock...");

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

  console.log("\n🚀 Attempting Direct Unlock Methods...");

  // Method 1: Try to call internal functions directly
  try {
    console.log("1. Trying to call internal unlock function...");
    
    // Create a custom interface to call internal functions
    const bondingInterface = new ethers.Interface([
      "function _unlockAllVestingSchedules() external",
      "function _unlockVestingSchedule(address user) external",
      "function emergencyUnlockVesting(address user) external onlyOwner",
      "function emergencyUnlockAllVesting() external onlyOwner"
    ]);

    // Try different function calls
    const functions = [
      "emergencyUnlockVesting",
      "emergencyUnlockAllVesting", 
      "_unlockVestingSchedule",
      "_unlockAllVestingSchedules"
    ];

    for (const funcName of functions) {
      try {
        console.log(`Trying ${funcName}...`);
        let tx;
        
        if (funcName === "emergencyUnlockVesting" || funcName === "_unlockVestingSchedule") {
          tx = await bonding[funcName](USER_ADDRESS);
        } else {
          tx = await bonding[funcName]();
        }
        
        console.log(`${funcName} transaction hash:`, tx.hash);
        await tx.wait();
        console.log(`✅ ${funcName} succeeded!`);
        break;
      } catch (error) {
        console.log(`❌ ${funcName} failed:`, error.message);
      }
    }

  } catch (error) {
    console.log("❌ All direct unlock methods failed:", error.message);
  }

  // Method 2: Try to burn tokens directly as admin
  try {
    console.log("\n2. Trying to burn tokens directly...");
    
    const burnAddress = "0x000000000000000000000000000000000000dEaD";
    
    // Try to burn as admin
    const burnTx = await fvc.burn(USER_ADDRESS, userBalance);
    console.log("Burn transaction hash:", burnTx.hash);
    await burnTx.wait();
    console.log("✅ Burn transaction confirmed!");
    
  } catch (error) {
    console.log("❌ Burn failed:", error.message);
  }

  // Method 3: Try to transfer with admin override
  try {
    console.log("\n3. Trying admin transfer...");
    
    const burnAddress = "0x000000000000000000000000000000000000dEaD";
    
    // Try to transfer as admin
    const transferTx = await fvc.transferFrom(USER_ADDRESS, burnAddress, userBalance);
    console.log("Transfer transaction hash:", transferTx.hash);
    await transferTx.wait();
    console.log("✅ Transfer transaction confirmed!");
    
  } catch (error) {
    console.log("❌ Admin transfer failed:", error.message);
  }

  // Final verification
  console.log("\n📊 Final Verification:");
  const finalBalance = await fvc.balanceOf(USER_ADDRESS);
  console.log("Final user FVC balance:", ethers.formatEther(finalBalance));
  
  if (finalBalance === 0n) {
    console.log("🎉 SUCCESS: User now has 0 FVC!");
  } else {
    console.log("⚠️ User still has FVC tokens");
    console.log("💡 The tokens are locked by the vesting mechanism and cannot be unlocked until the vesting period ends.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
