import { ethers } from "hardhat";

async function main() {
  // Contract addresses
  const bondingAddress = "0xE80f7844A933fdBf2b7f1f79a25f36243e54E490";
  const mockUSDCAddress = "0x11Cf72a75e284B61548B87fB5ad8B8693FCfB1fb";
  
  // Get the bonding contract
  const bonding = await ethers.getContractAt("Bonding", bondingAddress);
  
  // Get the mock USDC contract
  const mockUSDC = await ethers.getContractAt("MockUSDC", mockUSDCAddress);
  
  console.log("=== TREASURY CHECK ===");
  
  // Get treasury address
  const treasury = await bonding.treasury();
  console.log("Treasury address:", treasury);
  
  // Check treasury USDC balance
  const treasuryBalance = await mockUSDC.balanceOf(treasury);
  console.log("Treasury USDC balance:", ethers.formatUnits(treasuryBalance, 6));
  
  // Check if treasury is the deployer
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  console.log("Is treasury deployer?", treasury === deployer.address);
  
  console.log("\n=== TREASURY FUNCTION ===");
  console.log("When users bond USDC:");
  console.log("1. USDC gets transferred from user to treasury");
  console.log("2. FVC tokens get minted to user");
  console.log("3. Treasury accumulates USDC for protocol use");
  console.log("4. Treasury can use USDC for buybacks, SME funding, etc.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 