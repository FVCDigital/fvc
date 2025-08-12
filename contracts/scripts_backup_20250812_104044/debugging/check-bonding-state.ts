import { ethers } from "hardhat";

async function main() {
  const bondingAddress = "0xE80f7844A933fdBf2b7f1f79a25f36243e54E490";
  
  // Get the bonding contract
  const bonding = await ethers.getContractAt("Bonding", bondingAddress);
  
  console.log("=== BONDING CONTRACT STATE ===");
  
  // Get current round
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
  
  // Get current discount
  const currentDiscount = await bonding.getCurrentDiscount();
  console.log("Current Discount:", Number(currentDiscount), "%");
  
  // Calculate progress
  const progress = (Number(currentRound.totalBonded) / Number(currentRound.epochCap)) * 100;
  console.log("Round Progress:", progress.toFixed(2), "%");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 