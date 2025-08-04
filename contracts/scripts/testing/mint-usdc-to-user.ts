import { ethers } from "hardhat";

async function main() {
  // Mock USDC address
  const mockUSDCAddress = "0x11Cf72a75e284B61548B87fB5ad8B8693FCfB1fb";
  
  // Get the mock USDC contract
  const mockUSDC = await ethers.getContractAt("MockUSDC", mockUSDCAddress);
  
  // Get the signer (deployer)
  const [deployer] = await ethers.getSigners();
  
  console.log("=== MINTING USDC TO USER ===");
  console.log("Deployer address:", deployer.address);
  console.log("Mock USDC address:", mockUSDCAddress);
  
  // Mint USDC to deployer for testing
  const mintAmount = ethers.parseUnits("1000", 6); // 1000 USDC
  await mockUSDC.mint(deployer.address, mintAmount);
  
  console.log("✅ Minted 1000 USDC to deployer");
  
  // Check balance
  const balance = await mockUSDC.balanceOf(deployer.address);
  console.log("USDC balance:", ethers.formatUnits(balance, 6));
  
  console.log("\n=== TESTING INSTRUCTIONS ===");
  console.log("1. Connect your wallet to the frontend");
  console.log("2. Make sure you're on Amoy testnet");
  console.log("3. Try bonding some USDC for FVC tokens");
  console.log("4. You should see 1 USDC = 1.20 FVC (20% discount)");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 