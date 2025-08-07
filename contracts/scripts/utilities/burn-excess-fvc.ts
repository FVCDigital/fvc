import { ethers } from "hardhat";

async function main() {
  // Contract addresses
  const fvcAddress = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";
  const bondingAddress = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";
  const userAddress = "0xcABa97a2bb6ca2797e302C864C37632b4185d595";
  
  // Get the FVC contract
  const fvc = await ethers.getContractAt("FVC", fvcAddress);
  const bonding = await ethers.getContractAt("Bonding", bondingAddress);
  
  console.log("=== BURNING EXCESS FVC TOKENS ===");
  console.log("User address:", userAddress);
  console.log("FVC contract:", fvcAddress);
  
  // Check current FVC balance
  const currentBalance = await fvc.balanceOf(userAddress);
  console.log("Current FVC balance:", ethers.formatUnits(currentBalance, 18));
  
  // Check vesting schedule
  const vestingSchedule = await bonding.getVestingSchedule(userAddress);
  const vestingAmount = vestingSchedule.amount;
  console.log("Vesting amount:", ethers.formatUnits(vestingAmount, 18));
  
  // Calculate excess amount (everything except vesting amount)
  const excessAmount = currentBalance - vestingAmount;
  console.log("Excess FVC to burn:", ethers.formatUnits(excessAmount, 18));
  
  if (excessAmount <= 0) {
    console.log("✅ No excess FVC to burn. Balance is correct.");
    return;
  }
  
  // Check if user has burn permission (only contract owner can burn)
  try {
    const owner = await fvc.owner();
    console.log("FVC contract owner:", owner);
    
    if (owner.toLowerCase() !== userAddress.toLowerCase()) {
      console.log("❌ Only the contract owner can burn tokens.");
      console.log("Please contact the contract owner to burn excess tokens.");
      return;
    }
    
    // Burn the excess tokens
    console.log("🔥 Burning excess FVC tokens...");
    const burnTx = await fvc.burn(userAddress, excessAmount);
    await burnTx.wait();
    
    console.log("✅ Successfully burned", ethers.formatUnits(excessAmount, 18), "FVC tokens");
    
    // Check new balance
    const newBalance = await fvc.balanceOf(userAddress);
    console.log("New FVC balance:", ethers.formatUnits(newBalance, 18));
    
  } catch (error) {
    console.log("❌ Error burning tokens:", error);
    console.log("You may need to be the contract owner to burn tokens.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
