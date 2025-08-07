import { ethers } from "hardhat";

async function main() {
  // Contract addresses
  const fvcAddress = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";
  const bondingAddress = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";
  const userAddress = "0xcABa97a2bb6ca2797e302C864C37632b4185d595";
  
  // Get the FVC contract
  const fvc = await ethers.getContractAt("FVC", fvcAddress);
  const bonding = await ethers.getContractAt("Bonding", bondingAddress);
  
  console.log("=== FORCE UNLOCKING VESTING SCHEDULE ===");
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
      console.log("✅ User is the contract owner. Attempting to force unlock...");
      
      // Try to set vesting period to 0 to unlock immediately
      console.log("🔥 Setting vesting period to 0...");
      try {
        const setVestingPeriodTx = await bonding.setVestingPeriod(0);
        await setVestingPeriodTx.wait();
        console.log("✅ Successfully set vesting period to 0");
      } catch (error) {
        console.log("❌ Error setting vesting period:", error);
      }
      
      // Try to start a new round which might unlock vesting
      console.log("🔥 Starting new round...");
      try {
        const startNewRoundTx = await bonding.startNewRound(20, 10, ethers.parseUnits("1000000", 6), ethers.parseUnits("100000", 6), 0);
        await startNewRoundTx.wait();
        console.log("✅ Successfully started new round with 0 vesting period");
      } catch (error) {
        console.log("❌ Error starting new round:", error);
      }
      
      // Check new vesting schedule
      const newVestingSchedule = await bonding.getVestingSchedule(userAddress);
      console.log("New vesting amount:", ethers.formatUnits(newVestingSchedule.amount, 18));
      console.log("New vesting end time:", new Date(Number(newVestingSchedule.endTime) * 1000));
      
      // Check if tokens are still locked
      const newIsLocked = await bonding.isLocked(userAddress);
      console.log("Tokens still locked:", newIsLocked);
      
      // Try to transfer tokens now
      if (!newIsLocked) {
        console.log("🔥 Attempting to transfer excess FVC to burn address...");
        const burnAddress = "0x000000000000000000000000000000000000dEaD";
        const excessAmount = currentBalance - vestingAmount;
        
        if (excessAmount > 0) {
          try {
            const transferTx = await fvc.transfer(burnAddress, excessAmount);
            await transferTx.wait();
            console.log("✅ Successfully transferred excess FVC to burn address");
            
            // Check new balance
            const newBalance = await fvc.balanceOf(userAddress);
            console.log("New FVC balance:", ethers.formatUnits(newBalance, 18));
          } catch (error) {
            console.log("❌ Error transferring tokens:", error);
          }
        } else {
          console.log("✅ No excess tokens to transfer");
        }
      }
      
    } else {
      console.log("❌ User is not the contract owner.");
      console.log("You need to be the contract owner to unlock vesting.");
    }
    
  } catch (error) {
    console.log("❌ Error checking owner:", error);
    console.log("The bonding contract might not have an owner function.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
