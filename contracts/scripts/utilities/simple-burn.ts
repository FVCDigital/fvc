import { ethers } from "hardhat";

async function main() {
  console.log("=== SIMPLE BURN ATTEMPT ===");
  
  // Contract addresses
  const fvcAddress = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";
  const userAddress = "0xcABa97a2bb6ca2797e302C864C37632b4185d595";
  
  // Get the FVC contract
  const fvc = await ethers.getContractAt("FVC", fvcAddress);
  
  // Check current FVC balance
  const currentBalance = await fvc.balanceOf(userAddress);
  console.log("Current FVC balance:", ethers.formatUnits(currentBalance, 18));
  
  // Calculate excess amount (everything except 12k)
  const legitimateVesting = ethers.parseUnits("12000", 18); // 12k FVC
  const excessAmount = currentBalance - legitimateVesting;
  
  console.log("Legitimate vesting amount:", ethers.formatUnits(legitimateVesting, 18));
  console.log("Excess FVC to burn:", ethers.formatUnits(excessAmount, 18));
  
  if (excessAmount > 0) {
    console.log("🔥 Attempting to burn excess FVC tokens...");
    
    const burnAddress = "0x000000000000000000000000000000000000dEaD";
    
    try {
      // Try to transfer to burn address
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
      console.log("The tokens are locked in vesting and cannot be transferred.");
      console.log("You'll need to wait until November 3, 2025, or deploy a new contract with unlock functionality.");
    }
  } else {
    console.log("✅ No excess tokens to burn. Balance is correct.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
