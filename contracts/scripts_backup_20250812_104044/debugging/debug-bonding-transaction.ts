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
  
  console.log("=== BONDING TRANSACTION DEBUG ===");
  
  // Check current round
  const currentRound = await bonding.getCurrentRound();
  console.log("Total bonded:", ethers.formatUnits(currentRound.totalBonded, 6), "USDC");
  console.log("Epoch cap:", ethers.formatUnits(currentRound.epochCap, 6), "USDC");
  console.log("Progress:", (Number(currentRound.totalBonded) / Number(currentRound.epochCap) * 100).toFixed(2), "%");
  
  // Check user's bonded amount
  const userBonded = await bonding.userBonded(1, userAddress);
  console.log("User bonded:", ethers.formatUnits(userBonded, 6), "USDC");
  
  // Check FVC balance
  const userFVCBalance = await fvc.balanceOf(userAddress);
  console.log("User FVC balance:", ethers.formatUnits(userFVCBalance, 18));
  
  // Calculate what it should be
  const expectedFVC = userBonded * BigInt(120) / BigInt(100);
  console.log("Expected FVC:", ethers.formatUnits(expectedFVC, 18));
  
  // Check if there's a decimal issue
  console.log("\n=== DECIMAL DEBUG ===");
  console.log("User bonded (raw):", userBonded.toString());
  console.log("User bonded (USDC):", ethers.formatUnits(userBonded, 6));
  console.log("Expected FVC (raw):", expectedFVC.toString());
  console.log("Expected FVC (FVC):", ethers.formatUnits(expectedFVC, 18));
  
  // Test the calculation step by step
  console.log("\n=== CALCULATION TEST ===");
  const testUSDC = ethers.parseUnits("10000", 6); // 10,000 USDC
  const discount = 20;
  const testFVC = testUSDC * BigInt(100 + discount) / BigInt(100);
  console.log("Test: 10,000 USDC →", ethers.formatUnits(testFVC, 18), "FVC");
  
  // Check if the issue is in the contract calculation
  console.log("\n=== CONTRACT CALCULATION CHECK ===");
  const currentDiscount = await bonding.getCurrentDiscount();
  console.log("Current discount from contract:", Number(currentDiscount), "%");
  
  // Check vesting schedule
  const vestingSchedule = await bonding.getVestingSchedule(userAddress);
  console.log("Vesting amount:", ethers.formatUnits(vestingSchedule.amount, 18), "FVC");
  
  console.log("\n=== CONCLUSION ===");
  if (userFVCBalance === expectedFVC) {
    console.log("✅ Calculation is correct");
    console.log("The issue is that the bonded amount is much smaller than expected");
  } else {
    console.log("❌ Calculation mismatch - there's a bug in the contract");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 