import { ethers } from "hardhat";

async function main() {
  // Contract addresses
  const bondingAddress = "0xE80f7844A933fdBf2b7f1f79a25f36243e54E490";
  const mockUSDCAddress = "0x11Cf72a75e284B61548B87fB5ad8B8693FCfB1fb";
  const fvcAddress = "0xbC1A71287d6131ED8699F86228cd6fF38680b01e";
  
  // Get contracts
  const bonding = await ethers.getContractAt("Bonding", bondingAddress);
  const mockUSDC = await ethers.getContractAt("MockUSDC", mockUSDCAddress);
  const fvc = await ethers.getContractAt("FVC", fvcAddress);
  
  console.log("=== BONDING TRANSACTION ANALYSIS ===");
  
  // Check current bonding state
  const currentRound = await bonding.getCurrentRound();
  console.log("Current discount:", Number(await bonding.getCurrentDiscount()), "%");
  console.log("Total bonded:", ethers.formatUnits(currentRound.totalBonded, 6), "USDC");
  
  // Check user's USDC balance
  const userAddress = "0xcABa97a2bb6ca2797e302C864C37632b4185d595";
  const userUSDCBalance = await mockUSDC.balanceOf(userAddress);
  console.log("User USDC balance:", ethers.formatUnits(userUSDCBalance, 6));
  
  // Check treasury USDC balance
  const treasury = await bonding.treasury();
  const treasuryUSDCBalance = await mockUSDC.balanceOf(treasury);
  console.log("Treasury USDC balance:", ethers.formatUnits(treasuryUSDCBalance, 6));
  
  // Check FVC balances
  const userFVCBalance = await fvc.balanceOf(userAddress);
  console.log("User FVC balance:", ethers.formatUnits(userFVCBalance, 18));
  
  const totalFVCSupply = await fvc.totalSupply();
  console.log("Total FVC supply:", ethers.formatUnits(totalFVCSupply, 18));
  
  console.log("\n=== ANALYSIS ===");
  if (userFVCBalance > 0) {
    console.log("✅ Bonding worked! FVC tokens were minted.");
    console.log("📊 Amount bonded was very small (likely a test transaction)");
    console.log("💡 Try bonding a larger amount (e.g., 100 USDC) to see more FVC");
  } else {
    console.log("❌ No FVC tokens found. Bonding may have failed.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 