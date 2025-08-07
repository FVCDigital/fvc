import { ethers } from "hardhat";

async function main() {
  // Contract addresses
  const fvcAddress = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";
  const bondingAddress = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";
  const userAddress = "0xcABa97a2bb6ca2797e302C864C37632b4185d595";
  
  // Get the FVC contract
  const fvc = await ethers.getContractAt("FVC", fvcAddress);
  const bonding = await ethers.getContractAt("Bonding", bondingAddress);
  
  console.log("=== UNLOCKING USER VESTING SCHEDULE ===");
  console.log("User address:", userAddress);
  console.log("FVC contract:", fvcAddress);
  console.log("Bonding contract:", bondingAddress);
  
  // Check current FVC balance
  const currentBalance = await fvc.balanceOf(userAddress);
  console.log("Current FVC balance:", ethers.formatUnits(currentBalance, 18));
  
  // Check vesting schedule
  const vestingSchedule = await bonding.getVestingSchedule(userAddress);
  const vestingAmount = vestingSchedule.amount;
  console.log("Vesting amount:", ethers.formatUnits(vestingAmount, 18));
  console.log("Vesting start time:", new Date(Number(vestingSchedule.startTime) * 1000));
  console.log("Vesting end time:", new Date(Number(vestingSchedule.endTime) * 1000));
  
  // Check if tokens are locked
  const isLocked = await bonding.isLocked(userAddress);
  console.log("Tokens locked:", isLocked);
  
  // Check if user is the contract owner
  try {
    const owner = await bonding.owner();
    console.log("Bonding contract owner:", owner);
    
    if (owner.toLowerCase() === userAddress.toLowerCase()) {
      console.log("✅ User is the contract owner. Can unlock vesting.");
      
      // Since we can't directly modify vesting schedules, let's try to complete the current round
      // which should unlock all vesting schedules
      console.log("🔥 Attempting to complete current round to unlock vesting...");
      
      try {
        const completeRoundTx = await bonding.completeCurrentRound();
        await completeRoundTx.wait();
        console.log("✅ Successfully completed current round");
      } catch (error) {
        console.log("❌ Error completing round:", error);
        console.log("The round might not be ready to complete or the function might not exist.");
      }
      
      // Check new vesting schedule
      const newVestingSchedule = await bonding.getVestingSchedule(userAddress);
      console.log("New vesting amount:", ethers.formatUnits(newVestingSchedule.amount, 18));
      console.log("New vesting end time:", new Date(Number(newVestingSchedule.endTime) * 1000));
      
      // Check if tokens are still locked
      const newIsLocked = await bonding.isLocked(userAddress);
      console.log("Tokens still locked:", newIsLocked);
      
    } else {
      console.log("❌ User is not the contract owner.");
      console.log("You need to be the contract owner to unlock vesting.");
    }
    
  } catch (error) {
    console.log("❌ Error checking owner:", error);
    console.log("The bonding contract might not have an owner function.");
  }
  
  // Alternative approach: Try to transfer tokens to burn address
  console.log("\n=== ALTERNATIVE: TRANSFER TO BURN ADDRESS ===");
  const burnAddress = "0x000000000000000000000000000000000000dEaD";
  
  try {
    console.log("🔥 Attempting to transfer excess FVC to burn address...");
    const transferTx = await fvc.transfer(burnAddress, currentBalance);
    await transferTx.wait();
    
    console.log("✅ Successfully transferred all FVC to burn address");
    
    // Check new balance
    const newBalance = await fvc.balanceOf(userAddress);
    console.log("New FVC balance:", ethers.formatUnits(newBalance, 18));
    
  } catch (error) {
    console.log("❌ Error transferring tokens:", error);
    console.log("This might be due to vesting restrictions.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
