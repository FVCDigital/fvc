import { ethers } from "hardhat";

async function main() {
  // Contract addresses
  const fvcAddress = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";
  const bondingAddress = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";
  const userAddress = "0xcABa97a2bb6ca2797e302C864C37632b4185d595";
  
  // Get the FVC contract
  const fvc = await ethers.getContractAt("FVC", fvcAddress);
  const bonding = await ethers.getContractAt("Bonding", bondingAddress);
  
  console.log("=== FINAL UNLOCK ATTEMPT ===");
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
      console.log("✅ User is the contract owner. Final unlock attempt...");
      
      // Let's try to understand why the functions are reverting
      console.log("🔥 Checking current round state...");
      
      try {
        const currentRound = await bonding.getCurrentRound();
        console.log("Current round data:", currentRound);
        
        // Check if the round is active
        if (currentRound && Array.isArray(currentRound)) {
          const isActive = currentRound[8]; // isActive is at index 8
          console.log("Round is active:", isActive);
          
          if (isActive) {
            console.log("🔥 Round is active, trying to complete it...");
            
            // Try to complete the round with proper parameters
            try {
              const completeTx = await bonding.completeCurrentRound();
              await completeTx.wait();
              console.log("✅ Successfully completed current round");
            } catch (error) {
              console.log("❌ Error completing round:", error);
              console.log("This might be because the round conditions aren't met");
            }
          } else {
            console.log("🔥 Round is not active, trying to start a new round...");
            
            // Try to start a new round with minimal vesting
            try {
              const newRoundTx = await bonding.startNewRound(20, 10, ethers.parseUnits("1000000", 6), ethers.parseUnits("100000", 6), 1);
              await newRoundTx.wait();
              console.log("✅ Successfully started new round with 1 second vesting");
            } catch (error) {
              console.log("❌ Error starting new round:", error);
            }
          }
        }
        
      } catch (error) {
        console.log("❌ Error getting current round:", error);
      }
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if tokens are still locked
      const newIsLocked = await bonding.isLocked(userAddress);
      console.log("Tokens still locked:", newIsLocked);
      
      if (!newIsLocked) {
        console.log("🎉 SUCCESS! Tokens are unlocked!");
        
        const excessAmount = currentBalance - vestingAmount;
        console.log("Excess FVC to burn:", ethers.formatUnits(excessAmount, 18));
        
        if (excessAmount > 0) {
          const burnAddress = "0x000000000000000000000000000000000000dEaD";
          
          try {
            const transferTx = await fvc.transfer(burnAddress, excessAmount);
            await transferTx.wait();
            console.log("✅ Successfully burned excess FVC tokens");
            
            const newBalance = await fvc.balanceOf(userAddress);
            console.log("Final FVC balance:", ethers.formatUnits(newBalance, 18));
            
          } catch (error) {
            console.log("❌ Error burning tokens:", error);
          }
        }
      } else {
        console.log("❌ Tokens are still locked. Manual intervention required.");
        console.log("Since this is testnet, you may need to:");
        console.log("1. Deploy a new version of the bonding contract with an emergency unlock function");
        console.log("2. Or modify the existing contract to add an unlock function");
        console.log("3. Or wait until November 3, 2025 for the vesting to end naturally");
      }
      
    } else {
      console.log("❌ User is not the contract owner.");
    }
    
  } catch (error) {
    console.log("❌ Error:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
