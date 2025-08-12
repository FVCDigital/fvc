import { ethers } from "hardhat";

async function main() {
  const userAddress = "0xcABa97a2bb6ca2797e302C864C37632b4185d595";
  const mockUSDCAddress = "0x11Cf72a75e284B61548B87fB5ad8B8693FCfB1fb";
  
  // Get the mock USDC contract
  const mockUSDC = await ethers.getContractAt("MockUSDC", mockUSDCAddress);
  
  console.log("=== MINTING MORE USDC ===");
  console.log("User address:", userAddress);
  console.log("Mock USDC address:", mockUSDCAddress);
  
  // Check current balance
  const currentBalance = await mockUSDC.balanceOf(userAddress);
  console.log("Current USDC balance:", ethers.formatUnits(currentBalance, 6));
  
  // Mint more USDC
  const mintAmount = ethers.parseUnits("50000", 6); // 50,000 USDC
  console.log("Minting:", ethers.formatUnits(mintAmount, 6), "USDC");
  
  try {
    const tx = await mockUSDC.mint(userAddress, mintAmount);
    console.log("Mint transaction hash:", tx.hash);
    await tx.wait();
    console.log("✅ Mint successful");
    
    // Check new balance
    const newBalance = await mockUSDC.balanceOf(userAddress);
    console.log("New USDC balance:", ethers.formatUnits(newBalance, 6));
    
    console.log("\n=== TESTING INSTRUCTIONS ===");
    console.log("1. Refresh your frontend (http://localhost:3000)");
    console.log("2. Connect your wallet to Amoy testnet");
    console.log("3. Try bonding some USDC (e.g., 1000 USDC)");
    console.log("4. You should get 1200 FVC tokens (20% discount)");
    console.log("5. Check your dashboard for FVC balance");
    
  } catch (error) {
    console.log("❌ Mint failed:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 