import { ethers } from "hardhat";

async function main() {
  console.log("=== UNLOCKING WITH BONDING V2 ===");
  
  // Contract addresses
  const fvcAddress = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";
  const userAddress = "0xcABa97a2bb6ca2797e302C864C37632b4185d595";
  
  // Deploy BondingV2 first
  console.log("🔥 Deploying BondingV2 contract...");
  
  const BondingV2 = await ethers.getContractFactory("BondingV2");
  const usdcAddress = "0x11Cf72a75e284B61548B87fB5ad8B8693FCfB1fb";
  const treasuryAddress = userAddress;
  
  const bondingV2 = await BondingV2.deploy(
    fvcAddress,
    usdcAddress,
    treasuryAddress,
    20, // initialDiscount
    10, // finalDiscount
    ethers.parseUnits("1000000", 6), // epochCap
    ethers.parseUnits("100000", 6),   // walletCap
    0   // vestingPeriod (0 for immediate unlock)
  );
  
  await bondingV2.waitForDeployment();
  const bondingV2Address = await bondingV2.getAddress();
  console.log("✅ BondingV2 deployed at:", bondingV2Address);
  
  // Get the FVC contract
  const fvc = await ethers.getContractAt("FVC", fvcAddress);
  
  // Check current FVC balance
  const currentBalance = await fvc.balanceOf(userAddress);
  console.log("Current FVC balance:", ethers.formatUnits(currentBalance, 18));
  
  // Check if user is the contract owner
  const owner = await bondingV2.owner();
  console.log("BondingV2 contract owner:", owner);
  
  if (owner.toLowerCase() === userAddress.toLowerCase()) {
    console.log("✅ User is the contract owner. Proceeding with unlock...");
    
    // Since the new contract doesn't have the old vesting schedule,
    // we need to transfer the excess tokens directly
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
        console.log("✅ Successfully burned excess FVC tokens");
        
        // Check new balance
        const newBalance = await fvc.balanceOf(userAddress);
        console.log("New FVC balance:", ethers.formatUnits(newBalance, 18));
        
        // Verify the burn
        const burnAddressBalance = await fvc.balanceOf(burnAddress);
        console.log("Burn address FVC balance:", ethers.formatUnits(burnAddressBalance, 18));
        
        console.log("🎉 SUCCESS! Excess FVC tokens have been burned!");
        console.log("Your wallet now has the correct amount of FVC tokens.");
        
      } catch (error) {
        console.log("❌ Error burning tokens:", error);
        console.log("This might be due to vesting restrictions from the old contract.");
        
        // Try to unlock through the new contract
        console.log("🔥 Attempting to unlock through BondingV2...");
        
        try {
          const unlockTx = await bondingV2.emergencyUnlockVesting(userAddress);
          await unlockTx.wait();
          console.log("✅ Successfully unlocked vesting through BondingV2");
          
          // Try burning again
          const transferTx2 = await fvc.transfer(burnAddress, excessAmount);
          await transferTx2.wait();
          console.log("✅ Successfully burned excess FVC tokens after unlock");
          
          const finalBalance = await fvc.balanceOf(userAddress);
          console.log("Final FVC balance:", ethers.formatUnits(finalBalance, 18));
          
        } catch (error2) {
          console.log("❌ Error unlocking through BondingV2:", error2);
        }
      }
    } else {
      console.log("✅ No excess tokens to burn. Balance is correct.");
    }
    
  } else {
    console.log("❌ User is not the contract owner.");
  }
  
  console.log("\n=== SUMMARY ===");
  console.log("BondingV2 Address:", bondingV2Address);
  console.log("You can now use this contract for future bonding with emergency unlock capability.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
