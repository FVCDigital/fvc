import { ethers } from "hardhat";

async function main() {
  // Contract addresses
  const fvcAddress = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";
  const bondingAddress = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";
  const userAddress = "0xcABa97a2bb6ca2797e302C864C37632b4185d595";
  
  // Burn address (dead wallet)
  const burnAddress = "0x000000000000000000000000000000000000dEaD";
  
  // Get the FVC contract
  const fvc = await ethers.getContractAt("FVC", fvcAddress);
  const bonding = await ethers.getContractAt("Bonding", bondingAddress);
  
  console.log("=== TRANSFERRING EXCESS FVC TOKENS TO BURN ADDRESS ===");
  console.log("User address:", userAddress);
  console.log("FVC contract:", fvcAddress);
  console.log("Burn address:", burnAddress);
  
  // Check current FVC balance
  const currentBalance = await fvc.balanceOf(userAddress);
  console.log("Current FVC balance:", ethers.formatUnits(currentBalance, 18));
  
  // Check vesting schedule
  const vestingSchedule = await bonding.getVestingSchedule(userAddress);
  const vestingAmount = vestingSchedule.amount;
  console.log("Vesting amount:", ethers.formatUnits(vestingAmount, 18));
  
  // Calculate excess amount (everything except vesting amount)
  const excessAmount = currentBalance - vestingAmount;
  console.log("Excess FVC to transfer:", ethers.formatUnits(excessAmount, 18));
  
  if (excessAmount <= 0) {
    console.log("✅ No excess FVC to transfer. Balance is correct.");
    return;
  }
  
  // Check if tokens are locked
  const isLocked = await bonding.isLocked(userAddress);
  console.log("Tokens locked:", isLocked);
  
  if (isLocked) {
    console.log("❌ Tokens are locked in vesting. Cannot transfer excess tokens.");
    console.log("You need to wait for vesting to complete or contact the contract owner.");
    return;
  }
  
  try {
    // Transfer the excess tokens to burn address
    console.log("🔥 Transferring excess FVC tokens to burn address...");
    const transferTx = await fvc.transfer(burnAddress, excessAmount);
    await transferTx.wait();
    
    console.log("✅ Successfully transferred", ethers.formatUnits(excessAmount, 18), "FVC tokens to burn address");
    
    // Check new balance
    const newBalance = await fvc.balanceOf(userAddress);
    console.log("New FVC balance:", ethers.formatUnits(newBalance, 18));
    
    // Verify burn address received the tokens
    const burnAddressBalance = await fvc.balanceOf(burnAddress);
    console.log("Burn address FVC balance:", ethers.formatUnits(burnAddressBalance, 18));
    
  } catch (error) {
    console.log("❌ Error transferring tokens:", error);
    console.log("This might be due to vesting restrictions or insufficient balance.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
