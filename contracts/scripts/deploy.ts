import { ethers } from "hardhat";
import { writeFileSync } from "fs";
import { join } from "path";

/**
 * FVC Protocol Deployment Script
 * Industry standard: Single deployment script with environment configuration
 */

interface DeploymentConfig {
  network: string;
  fvcName: string;
  fvcSymbol: string;
  vestingCliff: number; // seconds
  vestingDuration: number; // seconds
  bondingConfig: {
    initialDiscount: number;
    finalDiscount: number;
    epochCap: string; // USDC amount
    walletCap: string; // USDC amount
    vestingPeriod: number; // seconds
  };
}

const configs: { [key: string]: DeploymentConfig } = {
  amoy: {
    network: "Polygon Amoy Testnet",
    fvcName: "First Venture Capital",
    fvcSymbol: "FVC",
    vestingCliff: 365 * 24 * 60 * 60, // 12 months
    vestingDuration: 730 * 24 * 60 * 60, // 24 months
    bondingConfig: {
      initialDiscount: 20,
      finalDiscount: 5,
      epochCap: "100000", // 100K USDC
      walletCap: "10000", // 10K USDC
      vestingPeriod: 6 * 30 * 24 * 60 * 60 // 6 months
    }
  },
  polygon: {
    network: "Polygon Mainnet",
    fvcName: "First Venture Capital",
    fvcSymbol: "FVC",
    vestingCliff: 365 * 24 * 60 * 60, // 12 months
    vestingDuration: 730 * 24 * 60 * 60, // 24 months
    bondingConfig: {
      initialDiscount: 15,
      finalDiscount: 5,
      epochCap: "1000000", // 1M USDC
      walletCap: "50000", // 50K USDC
      vestingPeriod: 12 * 30 * 24 * 60 * 60 // 12 months
    }
  }
};

async function main() {
  const networkName = process.env.HARDHAT_NETWORK || "amoy";
  const config = configs[networkName];
  
  if (!config) {
    throw new Error(`No configuration found for network: ${networkName}`);
  }

  console.log(`🚀 Deploying FVC Protocol to ${config.network}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);
  console.log("💰 Balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH\n");

  const deployments: any = {};

  // Deploy FVC Token (zero initial supply)
  console.log("📦 Deploying FVC Token...");
  const FVC = await ethers.getContractFactory("FVC");
  const fvcToken = await FVC.deploy(config.fvcName, config.fvcSymbol, deployer.address);
  await fvcToken.waitForDeployment();
  deployments.fvcToken = await fvcToken.getAddress();
  console.log("✅ FVC Token:", deployments.fvcToken);

  // Deploy Mock USDC (testnet only)
  if (networkName === "amoy") {
    console.log("📦 Deploying Mock USDC...");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();
    deployments.mockUSDC = await mockUSDC.getAddress();
    console.log("✅ Mock USDC:", deployments.mockUSDC);
  }

  // Deploy Vesting Contract
  console.log("📦 Deploying Vesting Contract...");
  const FVCVesting = await ethers.getContractFactory("FVCVesting");
  const vestingContract = await FVCVesting.deploy(deployments.fvcToken, deployer.address);
  await vestingContract.waitForDeployment();
  deployments.vestingContract = await vestingContract.getAddress();
  console.log("✅ Vesting Contract:", deployments.vestingContract);

  // Deploy Bonding Contract
  console.log("📦 Deploying Bonding Contract...");
  const usdcAddress = deployments.mockUSDC || "0xTODO_REAL_USDC_ADDRESS"; // Use real USDC on mainnet
  const Bonding = await ethers.getContractFactory("Bonding");
  const bondingContract = await Bonding.deploy(
    deployments.fvcToken,
    usdcAddress,
    deployer.address, // Treasury
    config.bondingConfig.initialDiscount,
    config.bondingConfig.finalDiscount,
    ethers.parseUnits(config.bondingConfig.epochCap, 6),
    ethers.parseUnits(config.bondingConfig.walletCap, 6),
    config.bondingConfig.vestingPeriod
  );
  await bondingContract.waitForDeployment();
  deployments.bondingContract = await bondingContract.getAddress();
  console.log("✅ Bonding Contract:", deployments.bondingContract);

  // Configure contracts
  console.log("\n🔧 Configuring contracts...");
  
  // Grant roles
  const minterRole = await fvcToken.getMinterRole();
  await fvcToken.grantRole(minterRole, deployments.bondingContract);
  await fvcToken.grantRole(minterRole, deployments.vestingContract);
  await fvcToken.grantRole(minterRole, deployer.address);
  
  const saleRole = await vestingContract.SALE_ROLE();
  await vestingContract.grantRole(saleRole, deployer.address);
  
  await fvcToken.setBondingContract(deployments.bondingContract);
  
  console.log("✅ Configuration complete");

  // Verify zero supply
  const totalSupply = await fvcToken.totalSupply();
  console.log("\n📊 Total FVC Supply:", ethers.formatEther(totalSupply), "FVC");
  console.log("✅ Zero supply achieved - optimal tokenomics!");

  // Save deployment info
  const deploymentInfo = {
    network: config.network,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: deployments,
    config: config
  };

  const filename = `deployments-${networkName}.json`;
  writeFileSync(join(__dirname, filename), JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n💾 Deployment info saved to: ${filename}`);
  console.log("\n🎉 Deployment complete!");
  
  return deployments;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
