import { ethers } from "hardhat";

async function main() {
  console.log("=== UNLOCKING WITH NEW BONDING CONTRACT ===");
  
  // Contract addresses
  const fvcAddress = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";
  const usdcAddress = "0x11Cf72a75e284B61548B87fB5ad8B8693FCfB1fb";
  const userAddress = "0xcABa97a2bb6ca2797e302C864C37632b4185d595";
  
  // Deploy new Bonding contract with emergency unlock
  console.log("🔥 Deploying new Bonding contract with emergency unlock...");
  
  const Bonding = await ethers.getContractFactory("Bonding");
  const bonding = await Bonding.deploy(
    fvcAddress,
    usdcAddress,
    userAddress, // treasury
    20, // initialDiscount
    10, // finalDiscount
    ethers.parseUnits("1000000", 6), // epochCap
    ethers.parseUnits("100000", 6),   // walletCap
    0   // vestingPeriod (0 for immediate unlock)
  );
  
  await bonding.waitForDeployment();
  const bondingAddress = await bonding.getAddress();
  console.log("✅ New Bonding deployed at:", bondingAddress);
  
  // Get the FVC contract
  const fvc = await ethers.getContractAt("FVC", fvcAddress);
  
  // Check current FVC balance
  const currentBalance = await fvc.balanceOf(userAddress);
  console.log("Current FVC balance:", ethers.formatUnits(currentBalance, 18));
  
  // Check if user is the contract owner
  const owner = await bonding.owner();
  console.log("New Bonding contract owner:", owner);
  
  if (owner.toLowerCase() === userAddress.toLowerCase()) {
    console.log("✅ User is the contract owner. Proceeding with unlock...");
    
    // Since this is a new contract, we need to set it as the bonding contract in FVC
    console.log("🔥 Setting new bonding contract in FVC...");
    
    try {
      await fvc.setBondingContract(bondingAddress);
      console.log("✅ New bonding contract set in FVC");
    } catch (error) {
      console.log("❌ Error setting bonding contract:", error);
      console.log("This might be because you're not the FVC admin. Let's try a different approach...");
    }
    
    // Calculate excess amount (everything except what should be from legitimate bonding)
    console.log("🔥 Calculating excess FVC tokens...");
    
    // The excess is everything except what should be from legitimate bonding (12k)
    const legitimateVesting = ethers.parseUnits("12000", 18); // 12k FVC
    const excessAmount = currentBalance - legitimateVesting;
    
    console.log("Legitimate vesting amount:", ethers.formatUnits(legitimateVesting, 18));
    console.log("Excess FVC to burn:", ethers.formatUnits(excessAmount, 18));
    
    if (excessAmount > 0) {
      console.log("🔥 Burning excess FVC tokens...");
      
      const burnAddress = "0x000000000000000000000000000000000000dEaD";
      
      try {
        const transferTx = await fvc.transfer(burnAddress, excessAmount);
        await transferTx.wait();
        console.log("✅ SUCCESS! Excess FVC tokens burned!");
        
        // Check new balance
        const newBalance = await fvc.balanceOf(userAddress);
        console.log("New FVC balance:", ethers.formatUnits(newBalance, 18));
        
        // Verify the burn
        const burnAddressBalance = await fvc.balanceOf(burnAddress);
        console.log("Burn address FVC balance:", ethers.formatUnits(burnAddressBalance, 18));
        
        console.log("🎉 SUCCESS! Your wallet now has the correct amount of FVC tokens.");
        
      } catch (error) {
        console.log("❌ Error burning tokens:", error);
        console.log("The tokens are still locked by the old contract's vesting schedule.");
        console.log("We need to unlock the vesting in the old contract first.");
        
        // Try to unlock through the new contract
        console.log("🔥 Attempting to unlock through new Bonding contract...");
        
        try {
          const unlockTx = await bonding.emergencyUnlockVesting(userAddress);
          await unlockTx.wait();
          console.log("✅ Successfully unlocked vesting through new Bonding contract");
          
          // Try burning again
          const transferTx2 = await fvc.transfer(burnAddress, excessAmount);
          await transferTx2.wait();
          console.log("✅ Successfully burned excess FVC tokens after unlock");
          
          const finalBalance = await fvc.balanceOf(userAddress);
          console.log("Final FVC balance:", ethers.formatUnits(finalBalance, 18));
          
        } catch (error2) {
          console.log("❌ Error unlocking through new Bonding contract:", error2);
          console.log("The old contract's vesting schedule is still active.");
          console.log("You'll need to wait until November 3, 2025, or deploy a completely new FVC contract.");
        }
      }
    } else {
      console.log("✅ No excess tokens to burn. Balance is correct.");
    }
    
  } else {
    console.log("❌ User is not the contract owner.");
  }
  
  console.log("\n=== SUMMARY ===");
  console.log("New Bonding Address:", bondingAddress);
  console.log("You can now use this contract for future bonding with emergency unlock capability.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
