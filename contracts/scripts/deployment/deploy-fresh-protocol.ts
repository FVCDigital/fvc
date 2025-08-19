import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying Fresh FVC Protocol with Correct Tokenomics...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)));

  // ============ DEPLOY FVC TOKEN ============
  console.log("\n📦 Deploying FVC Token...");
  const FVC = await ethers.getContractFactory("FVC");
  const fvcToken = await FVC.deploy(
    "First Venture Capital",
    "FVC", 
    deployer.address
  );
  await fvcToken.waitForDeployment();
  
  const fvcAddress = await fvcToken.getAddress();
  console.log("✅ FVC Token deployed to:", fvcAddress);

  // ============ DEPLOY MOCK USDC ============
  console.log("\n📦 Deploying Mock USDC...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  
  const usdcAddress = await mockUSDC.getAddress();
  console.log("✅ Mock USDC deployed to:", usdcAddress);

  // ============ DEPLOY BONDING CONTRACT ============
  console.log("\n📦 Deploying Bonding Contract...");
  const Bonding = await ethers.getContractFactory("Bonding");
  const bondingContract = await Bonding.deploy(
    fvcAddress,                           // FVC token
    usdcAddress,                          // USDC token
    deployer.address,                     // Treasury
    20,                                   // Initial discount (20%)
    5,                                    // Final discount (5%)
    ethers.parseUnits("100000", 6),       // Epoch cap (100K USDC)
    ethers.parseUnits("10000", 6),        // Wallet cap (10K USDC)
    6 * 30 * 24 * 60 * 60                 // Vesting period (6 months)
  );
  await bondingContract.waitForDeployment();
  
  const bondingAddress = await bondingContract.getAddress();
  console.log("✅ Bonding Contract deployed to:", bondingAddress);

  // ============ DEPLOY SIMPLE VESTING CONTRACT ============
  console.log("\n📦 Deploying SimpleFVCVesting...");
  const SimpleFVCVesting = await ethers.getContractFactory("SimpleFVCVesting");
  const vestingContract = await SimpleFVCVesting.deploy(
    fvcAddress,
    deployer.address // Vesting admin
  );
  await vestingContract.waitForDeployment();
  
  const vestingAddress = await vestingContract.getAddress();
  console.log("✅ SimpleFVCVesting deployed to:", vestingAddress);

  // ============ CONFIGURE CONTRACTS ============
  console.log("\n⚙️  Configuring Contracts...");

  // Set bonding contract in FVC
  console.log("Setting bonding contract in FVC...");
  await fvcToken.setBondingContract(bondingAddress);

  // Grant minter role to bonding contract
  console.log("Granting MINTER_ROLE to bonding contract...");
  const minterRole = await fvcToken.getMinterRole();
  await fvcToken.grantRole(minterRole, bondingAddress);

  // Grant minter role to vesting contract for initial allocation
  console.log("Granting MINTER_ROLE to vesting contract...");
  await fvcToken.grantRole(minterRole, vestingAddress);

  // ============ MINT CORRECT TOKENOMICS ============
  console.log("\n💰 Minting Correct 1B FVC Allocation...");

  const ONE_BILLION = ethers.parseEther("1000000000"); // 1B FVC
  
  // Whitepaper allocation (all amounts in FVC)
  const BONDING_ALLOCATION = ethers.parseEther("205000000");    // 205M FVC (20.5%)
  const FOUNDERS_ALLOCATION = ethers.parseEther("170000000");   // 170M FVC (17.0%)
  const TREASURY_ALLOCATION = ethers.parseEther("270000000");   // 270M FVC (27.0%)
  const MARKETING_ALLOCATION = ethers.parseEther("305000000");  // 305M FVC (30.5%)
  const LIQUIDITY_ALLOCATION = ethers.parseEther("50000000");   // 50M FVC (5.0%)

  // Mint to appropriate addresses
  console.log("Minting bonding allocation...");
  await fvcToken.mint(bondingAddress, BONDING_ALLOCATION);

  console.log("Minting treasury allocation...");
  await fvcToken.mint(deployer.address, TREASURY_ALLOCATION); // Treasury = deployer for now

  console.log("Minting founders allocation...");
  await fvcToken.mint(deployer.address, FOUNDERS_ALLOCATION); // Founders = deployer for now

  console.log("Minting marketing allocation...");
  await fvcToken.mint(deployer.address, MARKETING_ALLOCATION); // Marketing = deployer for now

  console.log("Minting liquidity allocation...");
  await fvcToken.mint(deployer.address, LIQUIDITY_ALLOCATION); // Liquidity = deployer for now

  // ============ VERIFY TOTAL SUPPLY ============
  const totalSupply = await fvcToken.totalSupply();
  console.log("\n📊 Total FVC Supply:", ethers.formatEther(totalSupply));
  
  if (totalSupply === ONE_BILLION) {
    console.log("✅ Perfect! Total supply matches 1B FVC target");
  } else {
    console.log("❌ Warning: Total supply doesn't match 1B FVC");
  }

  // ============ CONFIGURE VESTING CONTRACT ============
  console.log("\n🧪 Configuring Vesting Contract...");
  
  // Grant SALE_ROLE to deployer so they can create test schedules
  console.log("Granting SALE_ROLE to deployer...");
  await vestingContract.grantSaleRole(deployer.address);

  console.log("✅ Vesting contract configured");
  console.log("   Deployer can now create test vesting schedules");
  console.log("   Use scripts/testing/test-simple-vesting.ts to test");

  // ============ DEPLOYMENT SUMMARY ============
  console.log("\n📝 Deployment Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🪙 FVC Token:", fvcAddress);
  console.log("💵 Mock USDC:", usdcAddress);
  console.log("🏦 Bonding Contract:", bondingAddress);
  console.log("⏰ Vesting Contract:", vestingAddress);
  console.log("👤 Treasury/Admin:", deployer.address);
  console.log("💰 Total Supply: 1,000,000,000 FVC");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Save deployment info for frontend
  const deploymentInfo = {
    fvcToken: fvcAddress,
    mockUSDC: usdcAddress,
    bondingContract: bondingAddress,
    vestingContract: vestingAddress,
    admin: deployer.address,
    totalSupply: "1000000000",
    allocations: {
      bonding: "205000000",
      founders: "170000000", 
      treasury: "270000000",
      marketing: "305000000",
      liquidity: "50000000"
    },
    network: (await ethers.provider.getNetwork()).name,
    deployedAt: new Date().toISOString()
  };

  console.log("\n💾 Deployment Info (save for frontend):");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  console.log("\n🎯 Next Steps:");
  console.log("1. Update frontend contract addresses");
  console.log("2. Test vesting functionality");
  console.log("3. Create additional private sale schedules");
  console.log("4. Configure bonding rounds");
  
  console.log("\n✅ Fresh Protocol Deployment Complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
