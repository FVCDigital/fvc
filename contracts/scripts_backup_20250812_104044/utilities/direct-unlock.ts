import { ethers } from "hardhat";

async function main() {
  // Contract addresses
  const fvcAddress = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";
  const bondingAddress = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";
  const userAddress = "0xcABa97a2bb6ca2797e302C864C37632b4185d595";
  
  // Get the FVC contract
  const fvc = await ethers.getContractAt("FVC", fvcAddress);
  const bonding = await ethers.getContractAt("Bonding", bondingAddress);
  
  console.log("=== DIRECT UNLOCK ATTEMPT ===");
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
      console.log("✅ User is the contract owner. Attempting direct unlock...");
      
      // Try to call the internal function directly using low-level call
      console.log("🔥 Attempting to call internal unlock function...");
      
      // Create the function signature for _unlockAllVestingSchedules
      const functionSignature = "unlockAllVestingSchedules()";
      const functionSelector = ethers.id(functionSignature).slice(0, 10);
      
      console.log("Function selector:", functionSelector);
      
      try {
        // Try to call the internal function directly
        const tx = await bonding.unlockAllVestingSchedules();
        await tx.wait();
        console.log("✅ Successfully called unlock function");
      } catch (error) {
        console.log("❌ Error calling unlock function:", error);
        
        // Try alternative approach - call with different parameters
        console.log("🔥 Trying alternative approach...");
        
        try {
          // Try to call a function that might trigger the unlock
          const tx = await bonding.completeCurrentRound();
          await tx.wait();
          console.log("✅ Successfully completed round");
        } catch (error2) {
          console.log("❌ Error completing round:", error2);
        }
      }
      
      // Check if tokens are still locked
      const newIsLocked = await bonding.isLocked(userAddress);
      console.log("Tokens still locked:", newIsLocked);
      
      if (!newIsLocked) {
        console.log("🎉 Tokens are unlocked! Burning excess...");
        
        const excessAmount = currentBalance - vestingAmount;
        console.log("Excess FVC to burn:", ethers.formatUnits(excessAmount, 18));
        
        if (excessAmount > 0) {
          const burnAddress = "0x000000000000000000000000000000000000dEaD";
          
          try {
            const transferTx = await fvc.transfer(burnAddress, excessAmount);
            await transferTx.wait();
            console.log("✅ Successfully burned excess FVC tokens");
            
            const newBalance = await fvc.balanceOf(userAddress);
            console.log("New FVC balance:", ethers.formatUnits(newBalance, 18));
            
          } catch (error) {
            console.log("❌ Error burning tokens:", error);
          }
        }
      } else {
        console.log("❌ Tokens are still locked. Trying one more approach...");
        
        // Try to modify the vesting schedule by calling a function that might reset it
        console.log("🔥 Attempting to reset vesting by starting a new round...");
        
        try {
          // Try to start a new round which might reset vesting
          const newRoundTx = await bonding.startNewRound(20, 10, ethers.parseUnits("1000000", 6), ethers.parseUnits("100000", 6), 0);
          await newRoundTx.wait();
          console.log("✅ Successfully started new round with 0 vesting");
          
          // Wait a moment
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check again
          const finalIsLocked = await bonding.isLocked(userAddress);
          console.log("Final check - tokens locked:", finalIsLocked);
          
          if (!finalIsLocked) {
            console.log("🎉 SUCCESS! Tokens are now unlocked!");
            
            const excessAmount = currentBalance - vestingAmount;
            if (excessAmount > 0) {
              const burnAddress = "0x000000000000000000000000000000000000dEaD";
              const transferTx = await fvc.transfer(burnAddress, excessAmount);
              await transferTx.wait();
              console.log("✅ Successfully burned excess FVC tokens");
              
              const newBalance = await fvc.balanceOf(userAddress);
              console.log("Final FVC balance:", ethers.formatUnits(newBalance, 18));
            }
          }
          
        } catch (error) {
          console.log("❌ Error starting new round:", error);
        }
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
