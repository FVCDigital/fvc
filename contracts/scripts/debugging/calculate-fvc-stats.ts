import { ethers } from "hardhat";

async function main() {
  const bondingAddress = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";
  const bonding = await ethers.getContractAt("Bonding", bondingAddress);
  
  console.log("=== FVC STATISTICS CALCULATION ===");
  
  // Get current round data
  const currentRound = await bonding.getCurrentRound();
  const totalBonded = currentRound.totalBonded;
  const epochCap = currentRound.epochCap;
  const currentDiscount = await bonding.getCurrentDiscount();
  
  console.log("Total Bonded (USDC):", ethers.formatUnits(totalBonded, 6));
  console.log("Epoch Cap (USDC):", ethers.formatUnits(epochCap, 6));
  console.log("Current Discount:", Number(currentDiscount), "%");
  
  // Calculate FVC tokens bought (with current discount)
  const fvcBought = totalBonded * BigInt(100 + Number(currentDiscount)) / BigInt(100) * BigInt(1e12);
  console.log("FVC Bought:", ethers.formatUnits(fvcBought, 18));
  
  // Calculate total FVC that can be bought in this round
  // Use average discount (15%) for estimation
  const averageDiscount = 15;
  const totalFVCAvailable = epochCap * BigInt(100 + averageDiscount) / BigInt(100) * BigInt(1e12);
  console.log("Total FVC Available (estimated):", ethers.formatUnits(totalFVCAvailable, 18));
  
  // Calculate remaining FVC
  const fvcRemaining = totalFVCAvailable - fvcBought;
  console.log("FVC Remaining:", ethers.formatUnits(fvcRemaining, 18));
  
  // Calculate percentages
  const boughtPercentage = (Number(fvcBought) / Number(totalFVCAvailable)) * 100;
  const remainingPercentage = (Number(fvcRemaining) / Number(totalFVCAvailable)) * 100;
  
  console.log("\n=== PERCENTAGES ===");
  console.log("FVC Bought:", boughtPercentage.toFixed(2), "%");
  console.log("FVC Remaining:", remainingPercentage.toFixed(2), "%");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 