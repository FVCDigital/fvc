import { ethers } from "hardhat";

async function main() {
  // Contract addresses
  const fvcAddress = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";
  const bondingAddress = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";
  const userAddress = "0xcABa97a2bb6ca2797e302C864C37632b4185d595";
  
  // Get the FVC contract
  const fvc = await ethers.getContractAt("FVC", fvcAddress);
  const bonding = await ethers.getContractAt("Bonding", bondingAddress);
  
  console.log("=== EMERGENCY UNLOCK FOR TESTNET ===");
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
  
  // Check if user is the contract owner
  try {
    const owner = await bonding.owner();
    console.log("Bonding contract owner:", owner);
    
    if (owner.toLowerCase() === userAddress.toLowerCase()) {
      console.log("✅ User is the contract owner. Attempting emergency unlock...");
      
      // Try to call a function that might unlock vesting by completing the round
      console.log("🔥 Attempting to force complete the round...");
      try {
        // Try to call completeCurrentRound with a different approach
        const completeTx = await bonding.completeCurrentRound();
        await completeTx.wait();
        console.log("✅ Successfully completed current round");
      } catch (error) {
        console.log("❌ Error completing round:", error);
      }
      
      // Try to start a new round with immediate vesting
      console.log("🔥 Starting new round with immediate vesting...");
      try {
        const newRoundTx = await bonding.startNewRound(20, 10, ethers.parseUnits("1000000", 6), ethers.parseUnits("100000", 6), 1);
        await newRoundTx.wait();
        console.log("✅ Successfully started new round with 1 second vesting");
      } catch (error) {
        console.log("❌ Error starting new round:", error);
      }
      
      // Wait a moment for the vesting to end
      console.log("⏳ Waiting for vesting to end...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if tokens are still locked
      const newIsLocked = await bonding.isLocked(userAddress);
      console.log("Tokens still locked:", newIsLocked);
      
      if (!newIsLocked) {
        console.log("🎉 Tokens are unlocked! Attempting to burn excess...");
        
        // Calculate excess amount (everything except the 12k vesting)
        const excessAmount = currentBalance - vestingAmount;
        console.log("Excess FVC to burn:", ethers.formatUnits(excessAmount, 18));
        
        if (excessAmount > 0) {
          const burnAddress = "0x000000000000000000000000000000000000dEaD";
          
          try {
            const transferTx = await fvc.transfer(burnAddress, excessAmount);
            await transferTx.wait();
            console.log("✅ Successfully burned excess FVC tokens");
            
            // Check new balance
            const newBalance = await fvc.balanceOf(userAddress);
            console.log("New FVC balance:", ethers.formatUnits(newBalance, 18));
            
            // Check new vesting schedule
            const newVestingSchedule = await bonding.getVestingSchedule(userAddress);
            console.log("New vesting amount:", ethers.formatUnits(newVestingSchedule.amount, 18));
            
          } catch (error) {
            console.log("❌ Error burning tokens:", error);
          }
        }
      } else {
        console.log("❌ Tokens are still locked. Trying alternative approach...");
        
        // Try to modify the vesting schedule directly by calling internal functions
        console.log("🔥 Attempting to modify vesting schedule directly...");
        
        // Since we can't call internal functions, let's try to deploy a helper contract
        console.log("🔥 Deploying emergency unlock helper...");
        
        const EmergencyUnlocker = await ethers.getContractFactory("EmergencyUnlocker");
        const unlocker = await EmergencyUnlocker.deploy(bondingAddress);
        await unlocker.waitForDeployment();
        
        console.log("✅ Deployed emergency unlocker at:", await unlocker.getAddress());
        
        // Try to unlock through the helper
        try {
          const unlockTx = await unlocker.unlockVesting(userAddress);
          await unlockTx.wait();
          console.log("✅ Successfully unlocked vesting through helper");
        } catch (error) {
          console.log("❌ Error unlocking through helper:", error);
        }
      }
      
    } else {
      console.log("❌ User is not the contract owner.");
      console.log("You need to be the contract owner to unlock vesting.");
    }
    
  } catch (error) {
    console.log("❌ Error:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
