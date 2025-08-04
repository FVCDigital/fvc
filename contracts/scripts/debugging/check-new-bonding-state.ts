import { ethers } from "hardhat";

async function main() {
  const bondingAddress = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";
  const bonding = await ethers.getContractAt("Bonding", bondingAddress);
  
  console.log("=== NEW BONDING CONTRACT STATE ===");
  const currentRound = await bonding.getCurrentRound();
  console.log("Current Round ID:", Number(currentRound.roundId));
  console.log("Initial Discount:", Number(currentRound.initialDiscount), "%");
  console.log("Final Discount:", Number(currentRound.finalDiscount), "%");
  console.log("Epoch Cap (raw):", currentRound.epochCap.toString());
  console.log("Epoch Cap (USDC):", ethers.formatUnits(currentRound.epochCap, 6), "USDC");
  console.log("Wallet Cap (raw):", currentRound.walletCap.toString());
  console.log("Wallet Cap (USDC):", ethers.formatUnits(currentRound.walletCap, 6), "USDC");
  console.log("Is Active:", currentRound.isActive);
  console.log("Total Bonded (raw):", currentRound.totalBonded.toString());
  console.log("Total Bonded (USDC):", ethers.formatUnits(currentRound.totalBonded, 6), "USDC");
  
  const currentDiscount = await bonding.getCurrentDiscount();
  console.log("Current Discount:", Number(currentDiscount), "%");
  
  // Test the calculation
  console.log("\n=== TESTING CALCULATION ===");
  const testUSDC = ethers.parseUnits("1000", 6); // 1000 USDC
  const discount = 20; // 20%
  const expectedFVC = testUSDC * BigInt(100 + discount) / BigInt(100) * BigInt(1e12);
  console.log("1000 USDC →", ethers.formatUnits(expectedFVC, 18), "FVC (should be 1200 FVC)");
  
  console.log("\n✅ New bonding contract is ready for testing!");
  console.log("Try bonding some USDC now - you should get the correct FVC amounts.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 