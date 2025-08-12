import { ethers } from "hardhat";

async function main() {
  const userAddress = "0xcABa97a2bb6ca2797e302C864C37632b4185d595";
  const bondingAddress = "0xE80f7844A933fdBf2b7f1f79a25f36243e54E490";
  const mockUSDCAddress = "0x11Cf72a75e284B61548B87fB5ad8B8693FCfB1fb";
  const fvcAddress = "0xbC1A71287d6131ED8699F86228cd6fF38680b01e";
  
  // Get contracts
  const bonding = await ethers.getContractAt("Bonding", bondingAddress);
  const mockUSDC = await ethers.getContractAt("MockUSDC", mockUSDCAddress);
  const fvc = await ethers.getContractAt("FVC", fvcAddress);
  
  console.log("=== BONDING DETAILS ANALYSIS ===");
  
  // Check user's bonded amount in current round
  const userBonded = await bonding.userBonded(1, userAddress);
  console.log("User bonded in round 1:", ethers.formatUnits(userBonded, 6), "USDC");
  
  // Check current round total
  const currentRound = await bonding.getCurrentRound();
  console.log("Total bonded in round:", ethers.formatUnits(currentRound.totalBonded, 6), "USDC");
  
  // Check user's USDC balance
  const userUSDCBalance = await mockUSDC.balanceOf(userAddress);
  console.log("User USDC balance:", ethers.formatUnits(userUSDCBalance, 6));
  
  // Check FVC balance
  const userFVCBalance = await fvc.balanceOf(userAddress);
  console.log("User FVC balance:", ethers.formatUnits(userFVCBalance, 18));
  
  // Calculate expected FVC for the bonded amount
  const expectedFVC = userBonded * BigInt(120) / BigInt(100); // 20% discount
  console.log("Expected FVC (20% discount):", ethers.formatUnits(expectedFVC, 18));
  
  // Check if amounts match
  console.log("\n=== ANALYSIS ===");
  if (userFVCBalance === expectedFVC) {
    console.log("✅ FVC amount matches expected calculation");
  } else {
    console.log("❌ FVC amount doesn't match expected calculation");
    console.log("This suggests the bonding transaction was for a different amount than expected");
  }
  
  // Check vesting schedule
  const vestingSchedule = await bonding.getVestingSchedule(userAddress);
  console.log("\nVesting schedule:");
  console.log("Amount:", ethers.formatUnits(vestingSchedule.amount, 18), "FVC");
  console.log("Start:", new Date(Number(vestingSchedule.startTime) * 1000));
  console.log("End:", new Date(Number(vestingSchedule.endTime) * 1000));
  
  console.log("\n=== CONCLUSION ===");
  console.log("You bonded a very small amount of USDC, not 1000 USDC");
  console.log("To see meaningful FVC tokens, try bonding a larger amount (e.g., 100 USDC)");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 