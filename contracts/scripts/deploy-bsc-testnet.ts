import { ethers } from "hardhat";

/**
 * Deploy FVC, Sale, and Vesting to BSC Testnet
 * 
 * Usage: 
 * 1. Add DEPLOYER_PRIVATE_KEY to .env (account with BNB on BSC testnet)
 * 2. Run: yarn hardhat run scripts/deploy-bsc-testnet.ts --network bsc-testnet
 * 
 * Get BSC testnet BNB: https://testnet.bnbchain.org/faucet-smart
 * Get testnet USDC/USDT: https://testnet.binance.vision/faucet-smart (or use MockStable)
 */

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("FVC BSC TESTNET DEPLOYMENT");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("Network:  ", (await ethers.provider.getNetwork()).name);
  console.log("Chain ID: ", (await ethers.provider.getNetwork()).chainId);
  console.log("Deployer: ", deployer.address);
  console.log("Balance:  ", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "BNB");
  console.log();

  // CONFIGURATION FOR TESTNET
  const TREASURY = process.env.TREASURY_ADDRESS || deployer.address;
  
  // BSC Testnet token addresses (use Mock if needed)
  const USDC_ADDRESS = process.env.BSC_TESTNET_USDC || "0x0000000000000000000000000000000000000000"; // Will deploy Mock
  const USDT_ADDRESS = process.env.BSC_TESTNET_USDT || "0x0000000000000000000000000000000000000000"; // Will deploy Mock
  
  const INITIAL_RATE = ethers.parseUnits("0.025", 6); // $0.025 per FVC (25000 with 6 decimals)
  const INITIAL_CAP = ethers.parseUnits("1000000", 6); // 1M USDC cap

  console.log("📋 CONFIGURATION");
  console.log("─────────────────────────────────────────────────────────────");
  console.log("Treasury:      ", TREASURY);
  console.log("Initial Rate:  ", ethers.formatUnits(INITIAL_RATE, 6), "USDC per FVC ($0.025)");
  console.log("Initial Cap:   ", ethers.formatUnits(INITIAL_CAP, 6), "USDC");
  console.log();

  // Deploy Mock Stablecoins if addresses not provided
  let usdcAddress = USDC_ADDRESS;
  let usdtAddress = USDT_ADDRESS;

  if (USDC_ADDRESS === "0x0000000000000000000000000000000000000000") {
    console.log("🚀 Deploying Mock USDC...");
    const MockStable = await ethers.getContractFactory("MockStable");
    const mockUsdc = await MockStable.deploy("Mock USDC", "USDC", 6);
    await mockUsdc.waitForDeployment();
    usdcAddress = await mockUsdc.getAddress();
    console.log("✅ Mock USDC deployed:", usdcAddress);
    
    // Mint some to deployer for testing
    const mintTx = await mockUsdc.mint(deployer.address, ethers.parseUnits("1000000", 6));
    await mintTx.wait();
    console.log("✅ Minted 1M USDC to deployer");
    console.log();
  }

  if (USDT_ADDRESS === "0x0000000000000000000000000000000000000000") {
    console.log("🚀 Deploying Mock USDT...");
    const MockStable = await ethers.getContractFactory("MockStable");
    const mockUsdt = await MockStable.deploy("Mock USDT", "USDT", 6);
    await mockUsdt.waitForDeployment();
    usdtAddress = await mockUsdt.getAddress();
    console.log("✅ Mock USDT deployed:", usdtAddress);
    
    // Mint some to deployer for testing
    const mintTx = await mockUsdt.mint(deployer.address, ethers.parseUnits("1000000", 6));
    await mintTx.wait();
    console.log("✅ Minted 1M USDT to deployer");
    console.log();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DEPLOY FVC
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("🚀 Deploying FVC Token...");
  const FVC = await ethers.getContractFactory("FVC");
  const fvc = await FVC.deploy(deployer.address); // Deployer is initial admin
  await fvc.waitForDeployment();
  const fvcAddress = await fvc.getAddress();
  console.log("✅ FVC deployed:", fvcAddress);
  console.log();

  // ═══════════════════════════════════════════════════════════════════════════
  // DEPLOY VESTING
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("🚀 Deploying Vesting Contract...");
  const Vesting = await ethers.getContractFactory("Vesting");
  const vesting = await Vesting.deploy(fvcAddress);
  await vesting.waitForDeployment();
  const vestingAddress = await vesting.getAddress();
  console.log("✅ Vesting deployed:", vestingAddress);
  console.log();

  // ═══════════════════════════════════════════════════════════════════════════
  // DEPLOY SALE
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("🚀 Deploying Sale Contract...");
  const Sale = await ethers.getContractFactory("Sale");
  const sale = await Sale.deploy(
    fvcAddress,
    TREASURY,
    INITIAL_RATE,
    INITIAL_CAP
  );
  await sale.waitForDeployment();
  const saleAddress = await sale.getAddress();
  console.log("✅ Sale deployed:", saleAddress);
  console.log();

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIAL CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("⚙️  CONFIGURING CONTRACTS");
  console.log("─────────────────────────────────────────────────────────────");

  // 1. Grant MINTER_ROLE to Sale contract
  console.log("1. Granting MINTER_ROLE to Sale...");
  const MINTER_ROLE = await fvc.MINTER_ROLE();
  const grantSaleTx = await fvc.grantRole(MINTER_ROLE, saleAddress);
  await grantSaleTx.wait();
  console.log("   ✅ Sale can now mint FVC");

  // 2. Grant MINTER_ROLE to Vesting contract (for vested purchases)
  console.log("2. Granting MINTER_ROLE to Vesting...");
  const grantVestingTx = await fvc.grantRole(MINTER_ROLE, vestingAddress);
  await grantVestingTx.wait();
  console.log("   ✅ Vesting can now mint FVC");

  // 3. Accept USDC
  console.log("3. Setting USDC as accepted token...");
  const acceptUsdcTx = await sale.setAcceptedToken(usdcAddress, true, 6);
  await acceptUsdcTx.wait();
  console.log("   ✅ USDC accepted");

  // 4. Accept USDT
  console.log("4. Setting USDT as accepted token...");
  const acceptUsdtTx = await sale.setAcceptedToken(usdtAddress, true, 6);
  await acceptUsdtTx.wait();
  console.log("   ✅ USDT accepted");

  // 5. Configure vesting (for purchases >= $50k)
  console.log("5. Configuring vesting parameters...");
  const VESTING_THRESHOLD = ethers.parseUnits("50000", 6); // $50k
  const CLIFF_DURATION = 180 * 24 * 60 * 60; // 180 days
  const VESTING_DURATION = 730 * 24 * 60 * 60; // 730 days (2 years)
  
  const vestingConfigTx = await sale.setVestingConfig(
    vestingAddress,
    VESTING_THRESHOLD,
    CLIFF_DURATION,
    VESTING_DURATION
  );
  await vestingConfigTx.wait();
  console.log("   ✅ Vesting configured: >= $50k → 180 day cliff, 730 day vesting");

  // 6. Activate sale
  console.log("6. Activating sale...");
  const activateTx = await sale.setActive(true);
  await activateTx.wait();
  console.log("   ✅ Sale is now ACTIVE");
  console.log();

  // ═══════════════════════════════════════════════════════════════════════════
  // DEPLOYMENT SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("DEPLOYMENT COMPLETE ✅");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("FVC Token:      ", fvcAddress);
  console.log("Sale Contract:  ", saleAddress);
  console.log("Vesting:        ", vestingAddress);
  console.log("USDC:           ", usdcAddress);
  console.log("USDT:           ", usdtAddress);
  console.log("Treasury:       ", TREASURY);
  console.log("═══════════════════════════════════════════════════════════════");
  console.log();

  // Save addresses
  const addresses = {
    network: "bsc-testnet",
    chainId: "97",
    deployer: deployer.address,
    treasury: TREASURY,
    fvc: fvcAddress,
    sale: saleAddress,
    vesting: vestingAddress,
    usdc: usdcAddress,
    usdt: usdtAddress,
    rate: ethers.formatUnits(INITIAL_RATE, 6),
    cap: ethers.formatUnits(INITIAL_CAP, 6),
    vestingThreshold: ethers.formatUnits(VESTING_THRESHOLD, 6),
    cliffDays: 180,
    vestingDays: 730,
    deployedAt: new Date().toISOString(),
  };

  const fs = require("fs");
  const path = require("path");
  const outputPath = path.join(__dirname, "..", "deployments-bsc-testnet.json");
  fs.writeFileSync(outputPath, JSON.stringify(addresses, null, 2));
  console.log("💾 Addresses saved to:", outputPath);
  console.log();

  console.log("📝 NEXT STEPS:");
  console.log();
  console.log("1. Add these addresses to app-extracted/.env:");
  console.log("   BSC_SALE_ADDRESS=" + saleAddress);
  console.log("   BSC_FVC_ADDRESS=" + fvcAddress);
  console.log("   BSC_VESTING_ADDRESS=" + vestingAddress);
  console.log("   BSC_USDC_ADDRESS=" + usdcAddress);
  console.log("   BSC_USDT_ADDRESS=" + usdtAddress);
  console.log();
  console.log("2. Test purchase flow:");
  console.log("   - Connect wallet to BSC Testnet");
  console.log("   - Get testnet BNB: https://testnet.bnbchain.org/faucet-smart");
  console.log("   - Use deployed Mock USDC/USDT (already minted to deployer)");
  console.log("   - Test buy() function on Sale contract");
  console.log();
  console.log("3. For mainnet deployment:");
  console.log("   - Use real USDC: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d");
  console.log("   - Use real USDT: 0x55d398326f99059fF775485246999027B3197955");
  console.log("   - Update TREASURY_ADDRESS to Gnosis Safe");
  console.log("   - Run: yarn hardhat run scripts/deploy-bsc-testnet.ts --network bsc-mainnet");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
