import { ethers, upgrades } from "hardhat";
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("=== REDEPLOYING BONDING WITH MOCK USDC ===");
  console.log("Deployer address:", deployer.address);
  
  // Mock USDC address (deployed in previous script)
  const mockUSDCAddress = "0x11Cf72a75e284B61548B87fB5ad8B8693FCfB1fb";
  
  // Deploy FVC token
  const FVC = await ethers.getContractFactory("FVC");
  const fvc = await upgrades.deployProxy(FVC, ["First Venture Capital", "FVC", deployer.address], {
    initializer: "initialize"
  });
  await fvc.waitForDeployment();
  
  const fvcAddress = await fvc.getAddress();
  console.log("FVC Token deployed to:", fvcAddress);
  
  // Deploy Bonding contract with mock USDC
  const Bonding = await ethers.getContractFactory("Bonding");
  const bonding = await upgrades.deployProxy(Bonding, [
    fvcAddress,
    mockUSDCAddress, // Use mock USDC
    deployer.address, // Treasury
    20, // Initial discount
    10, // Final discount
    ethers.parseUnits("10000000", 6), // 10M USDC epoch cap
    ethers.parseUnits("1000000", 6), // 1M USDC wallet cap
    90 * 24 * 60 * 60 // 90 days vesting
  ], {
    initializer: "initialize"
  });
  await bonding.waitForDeployment();
  
  const bondingAddress = await bonding.getAddress();
  console.log("Bonding Contract deployed to:", bondingAddress);
  
  // Grant MINTER_ROLE to bonding contract
  await fvc.grantRole(await fvc.MINTER_ROLE(), bondingAddress);
  console.log("✅ Granted MINTER_ROLE to bonding contract");
  
  // Set bonding contract in FVC token for vesting checks
  await (fvc as any).setBondingContract(bondingAddress);
  console.log("✅ Set bonding contract in FVC token");
  
  // Write updated addresses to files
  const bondingOutputPath = path.join(__dirname, "..", "..", "dapp", "contracts", "bonding.ts");
  const bondingArtifact = await ethers.getContractFactory("Bonding");
  
  fs.writeFileSync(bondingOutputPath, 
`export const BONDING_ABI = ${JSON.stringify(bondingArtifact.interface.format(), null, 2)};
export const BONDING_ADDRESS = "${bondingAddress}";
export const FVC_ADDRESS = "${fvcAddress}";
export const USDC_ADDRESS = "${mockUSDCAddress}";

// Round configurations for $1 FVC target valuation
export const ROUND_CONFIGS = [
    {
        name: "Round 0 - Soft Launch",
        initialDiscount: 20,
        finalDiscount: 10,
        epochCap: "10000000",
        walletCap: "1000000",
        vestingPeriod: 90 * 24 * 60 * 60,
        targetPrice: "$0.80 - $0.90"
    },
    {
        name: "Round 1 - Genesis",
        initialDiscount: 10,
        finalDiscount: 5,
        epochCap: "80000000",
        walletCap: "8000000",
        vestingPeriod: 90 * 24 * 60 * 60,
        targetPrice: "$0.90 - $0.95"
    },
    {
        name: "Round 2 - Early Adopters", 
        initialDiscount: 5,
        finalDiscount: 2,
        epochCap: "60000000",
        walletCap: "6000000",
        vestingPeriod: 90 * 24 * 60 * 60,
        targetPrice: "$0.95 - $0.98"
    },
    {
        name: "Round 3 - Community",
        initialDiscount: 2,
        finalDiscount: 1,
        epochCap: "40000000",
        walletCap: "4000000",
        vestingPeriod: 90 * 24 * 60 * 60,
        targetPrice: "$0.98 - $0.99"
    },
    {
        name: "Round 4 - Public",
        initialDiscount: 1,
        finalDiscount: 0,
        epochCap: "15000000",
        walletCap: "2000000",
        vestingPeriod: 90 * 24 * 60 * 60,
        targetPrice: "$0.99 - $1.00"
    }
];
`.trim());
  
  console.log(`Bonding ABI and addresses written to: ${bondingOutputPath}`);
  
  // Log deployment summary
  console.log("\n=== DEPLOYMENT SUMMARY ===");
  console.log("FVC Token:", fvcAddress);
  console.log("Bonding Contract:", bondingAddress);
  console.log("Mock USDC:", mockUSDCAddress);
  console.log("Treasury:", deployer.address);
  console.log("Initial Discount: 20%");
  console.log("Final Discount: 10%");
  console.log("Epoch Cap: 10M USDC");
  console.log("Wallet Cap: 1M USDC");
  console.log("========================\n");
  
  console.log("✅ Deployment complete! Ready for bonding testing.");
  console.log("📋 The frontend should now work with the mock USDC.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 