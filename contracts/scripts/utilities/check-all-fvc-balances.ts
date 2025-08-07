import { ethers } from "hardhat";

async function main() {
  // Contract addresses
  const fvcAddress = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";
  const bondingAddress = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";
  
  // Get the FVC contract
  const fvc = await ethers.getContractAt("FVC", fvcAddress);
  const bonding = await ethers.getContractAt("Bonding", bondingAddress);
  
  // List of wallets to check (add more as needed)
  const wallets = [
    "0xcABa97a2bb6ca2797e302C864C37632b4185d595", // Your wallet
    "0x1234567890123456789012345678901234567890", // Add more wallets
  ];
  
  console.log("=== FVC BALANCE CHECK ON AMOY ===");
  console.log("FVC Contract:", fvcAddress);
  console.log("Bonding Contract:", bondingAddress);
  console.log("");
  
  let totalFVC = 0n;
  
  for (const wallet of wallets) {
    try {
      const fvcBalance = await fvc.balanceOf(wallet);
      const vestingSchedule = await bonding.getVestingSchedule(wallet);
      const isLocked = await bonding.isLocked(wallet);
      
      console.log(`Wallet: ${wallet}`);
      console.log(`  FVC Balance: ${ethers.formatUnits(fvcBalance, 18)}`);
      console.log(`  Vesting Amount: ${ethers.formatUnits(vestingSchedule.amount, 18)}`);
      console.log(`  Tokens Locked: ${isLocked}`);
      console.log(`  Vesting Start: ${new Date(Number(vestingSchedule.startTime) * 1000)}`);
      console.log(`  Vesting End: ${new Date(Number(vestingSchedule.endTime) * 1000)}`);
      console.log("");
      
      totalFVC += fvcBalance;
    } catch (error) {
      console.log(`Wallet: ${wallet} - Error: ${error}`);
    }
  }
  
  // Check total supply
  const totalSupply = await fvc.totalSupply();
  console.log("=== SUMMARY ===");
  console.log(`Total FVC Supply: ${ethers.formatUnits(totalSupply, 18)}`);
  console.log(`Total FVC in Checked Wallets: ${ethers.formatUnits(totalFVC, 18)}`);
  console.log(`Difference: ${ethers.formatUnits(totalSupply - totalFVC, 18)}`);
  
  // Check bonding contract FVC balance
  const bondingFVCBalance = await fvc.balanceOf(bondingAddress);
  console.log(`Bonding Contract FVC Balance: ${ethers.formatUnits(bondingFVCBalance, 18)}`);
  
  // Check current round info
  try {
    const currentRound = await bonding.getCurrentRound();
    console.log(`Current Round FVC Sold: ${ethers.formatUnits(currentRound.fvcSold, 18)}`);
    console.log(`Current Round FVC Allocated: ${ethers.formatUnits(currentRound.fvcAllocated, 18)}`);
  } catch (error) {
    console.log("Could not get current round info:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
