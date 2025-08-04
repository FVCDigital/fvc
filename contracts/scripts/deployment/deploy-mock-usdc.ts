import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("=== DEPLOYING MOCK USDC ===");
  console.log("Deployer address:", deployer.address);
  
  // Deploy MockUSDC
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log("Mock USDC deployed to:", mockUSDCAddress);
  
  // Mint some USDC to deployer for testing
  const mintAmount = ethers.parseUnits("10000", 6); // 10,000 USDC
  await (mockUSDC as any).mint(deployer.address, mintAmount);
  
  console.log("✅ Minted 10,000 USDC to deployer");
  
  // Check balance
  const balance = await (mockUSDC as any).balanceOf(deployer.address);
  console.log("USDC balance:", ethers.formatUnits(balance, 6));
  
  console.log("\n=== NEXT STEPS ===");
  console.log("1. Update the frontend to use this USDC address");
  console.log("2. Update the bonding contract to use this USDC");
  console.log("3. Test the bonding mechanism");
  
  // Write the address to a file for easy reference
  const fs = require('fs');
  const path = require('path');
  const outputPath = path.join(__dirname, "..", "..", "dapp", "contracts", "mock-usdc.ts");
  
  fs.writeFileSync(outputPath, 
`export const MOCK_USDC_ADDRESS = "${mockUSDCAddress}";
export const MOCK_USDC_ABI = ${JSON.stringify(MockUSDC.interface.format(), null, 2)};
`.trim());
  
  console.log(`Mock USDC address written to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 