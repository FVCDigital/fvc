import { ethers } from "hardhat";
import * as fs from "fs";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as path from "path";

async function main() {
  const hre: HardhatRuntimeEnvironment = require("hardhat");
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying Mock Tokens for Testing");
  console.log("Deployer:", deployer.address);

  // Deploy Mock USDC
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log("Mock USDC deployed to:", mockUSDCAddress);

  // Deploy Mock FVC
  const MockFVC = await ethers.getContractFactory("MockFVC");
  const mockFVC = await MockFVC.deploy();
  await mockFVC.waitForDeployment();
  const mockFVCAddress = await mockFVC.getAddress();
  console.log("Mock FVC deployed to:", mockFVCAddress);

  // Mint some USDC to deployer for testing
  await (mockUSDC as any).mint(deployer.address, ethers.parseUnits("1000000", 6)); // 1M USDC
  console.log("Minted 1M USDC to deployer");

  // Get contract artifacts
  const mockUSDCArtifact = await hre.artifacts.readArtifact("MockUSDC");
  const mockFVCArtifact = await hre.artifacts.readArtifact("MockFVC");

  // Write mock contract addresses to dapp
  const mockOutputPath = path.join(__dirname, "..", "..", "dapp", "src", "utils", "contracts", "mockContracts.ts");
  fs.writeFileSync(mockOutputPath, 
`// Mock contract addresses for testing
export const MOCK_CONTRACTS = {
  MOCK_USDC: "${mockUSDCAddress}",
  MOCK_FVC: "${mockFVCAddress}",
  BONDING: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // Will be deployed separately
};

// Mock USDC ABI
export const MOCK_USDC_ABI = ${JSON.stringify(mockUSDCArtifact.abi, null, 2)};

// Mock FVC ABI
export const MOCK_FVC_ABI = ${JSON.stringify(mockFVCArtifact.abi, null, 2)};
`.trim());
  
  console.log(`Mock contract addresses written to: ${mockOutputPath}`);

  // Log deployment summary
  console.log("\n=== MOCK DEPLOYMENT SUMMARY ===");
  console.log("Mock USDC:", mockUSDCAddress);
  console.log("Mock FVC:", mockFVCAddress);
  console.log("Deployer:", deployer.address);
  console.log("USDC Balance:", ethers.formatUnits(await (mockUSDC as any).balanceOf(deployer.address), 6));
  console.log("=============================\n");

  console.log("✅ Mock tokens deployed! Ready for testing.");
  console.log("📋 Next: Deploy Bonding contract and update addresses");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}); 