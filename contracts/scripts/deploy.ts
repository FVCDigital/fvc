import { ethers } from "hardhat";

/**
 * Deploy FVC, Sale, and Staking to testnet
 * 
 * Usage: yarn hardhat run scripts/deploy.ts --network base-sepolia
 * 
 * IMPORTANT: After deployment, transfer ownership to Safe via:
 * - FVC: grantRole(DEFAULT_ADMIN_ROLE, safe) then renounceRole(DEFAULT_ADMIN_ROLE, deployer)
 * - Sale: transferOwnership(safe)
 * - Staking: transferOwnership(safe)
 */

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("FVC TESTNET DEPLOYMENT");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("Network:  ", (await ethers.provider.getNetwork()).name);
  console.log("Deployer: ", deployer.address);
  console.log("Balance:  ", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log();

  // CONFIGURATION
  const SAFE_ADDRESS = process.env.SAFE_ADDRESS || deployer.address; // Use deployer if no Safe configured
  const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC
  const INITIAL_RATE = 25_000; // $0.025 per FVC
  const INITIAL_CAP = ethers.parseUnits("1000000", 6); // 1M USDC

  console.log("📋 CONFIGURATION");
  console.log("─────────────────────────────────────────────────────────────");
  console.log("Safe Address:  ", SAFE_ADDRESS);
  console.log("USDC Address:  ", USDC_ADDRESS);
  console.log("Initial Rate:  ", INITIAL_RATE, "($0.025 per FVC)");
  console.log("Initial Cap:   ", ethers.formatUnits(INITIAL_CAP, 6), "USDC");
  console.log();

  // ═══════════════════════════════════════════════════════════════════════════
  // DEPLOY FVC
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("🚀 Deploying FVC...");
  const FVC = await ethers.getContractFactory("FVC");
  const fvc = await FVC.deploy(deployer.address); // Deployer is initial admin
  await fvc.waitForDeployment();
  const fvcAddress = await fvc.getAddress();
  console.log("✅ FVC deployed:", fvcAddress);
  console.log();

  // ═══════════════════════════════════════════════════════════════════════════
  // DEPLOY SALE
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("🚀 Deploying Sale...");
  const Sale = await ethers.getContractFactory("Sale");
  const sale = await Sale.deploy(
    fvcAddress,
    SAFE_ADDRESS, // Beneficiary receives USDC
    INITIAL_RATE,
    INITIAL_CAP
  );
  await sale.waitForDeployment();
  const saleAddress = await sale.getAddress();
  console.log("✅ Sale deployed:", saleAddress);
  console.log();

  // ═══════════════════════════════════════════════════════════════════════════
  // DEPLOY STAKING
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("🚀 Deploying Staking...");
  const Staking = await ethers.getContractFactory("Staking");
  const staking = await Staking.deploy(
    fvcAddress,    // Staking token
    USDC_ADDRESS   // Rewards token
  );
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log("✅ Staking deployed:", stakingAddress);
  console.log();

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIAL CONFIGURATION (if deployer == safe, do it now)
  // ═══════════════════════════════════════════════════════════════════════════
  if (SAFE_ADDRESS.toLowerCase() === deployer.address.toLowerCase()) {
    console.log("⚙️  INITIAL CONFIGURATION (Deployer == Safe)");
    console.log("─────────────────────────────────────────────────────────────");

    // Grant MINTER_ROLE to Sale
    console.log("Granting MINTER_ROLE to Sale...");
    const MINTER_ROLE = await fvc.MINTER_ROLE();
    const grantTx = await fvc.grantRole(MINTER_ROLE, saleAddress);
    await grantTx.wait();
    console.log("✅ MINTER_ROLE granted");

    // Accept USDC
    console.log("Setting USDC as accepted token...");
    const acceptTx = await sale.setAcceptedToken(USDC_ADDRESS, true);
    await acceptTx.wait();
    console.log("✅ USDC accepted");

    // Activate sale
    console.log("Activating sale...");
    const activateTx = await sale.setActive(true);
    await activateTx.wait();
    console.log("✅ Sale activated");
    console.log();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DEPLOYMENT SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("DEPLOYMENT COMPLETE");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("FVC:        ", fvcAddress);
  console.log("Sale:       ", saleAddress);
  console.log("Staking:    ", stakingAddress);
  console.log("USDC:       ", USDC_ADDRESS);
  console.log("Safe:       ", SAFE_ADDRESS);
  console.log("═══════════════════════════════════════════════════════════════");
  console.log();

  console.log("📝 NEXT STEPS:");
  console.log();
  
  if (SAFE_ADDRESS.toLowerCase() !== deployer.address.toLowerCase()) {
    console.log("1. Update verification scripts with deployed addresses:");
    console.log("   - contracts/scripts/verify-testnet-deployment.ts");
    console.log("   - contracts/scripts/simulate-user-flow.ts");
    console.log();
    console.log("2. Transfer ownership to Safe:");
    console.log("   - Sale.transferOwnership(" + SAFE_ADDRESS + ")");
    console.log("   - Staking.transferOwnership(" + SAFE_ADDRESS + ")");
    console.log("   - FVC.grantRole(DEFAULT_ADMIN_ROLE, " + SAFE_ADDRESS + ")");
    console.log("   - FVC.revokeRole(DEFAULT_ADMIN_ROLE, " + deployer.address + ")");
    console.log();
    console.log("3. Execute Safe transactions from playbook:");
    console.log("   - Grant MINTER_ROLE to Sale");
    console.log("   - Set rate, cap, accepted tokens");
    console.log("   - Activate sale");
  } else {
    console.log("1. Update verification scripts with deployed addresses:");
    console.log("   - contracts/scripts/verify-testnet-deployment.ts");
    console.log("   - contracts/scripts/simulate-user-flow.ts");
    console.log();
    console.log("2. Run verification:");
    console.log("   yarn hardhat run scripts/verify-testnet-deployment.ts --network base-sepolia");
  }
  console.log();
  console.log("4. Get testnet USDC from faucet:");
  console.log("   https://faucet.circle.com/");
  console.log();
  console.log("5. Simulate user flow:");
  console.log("   yarn hardhat run scripts/simulate-user-flow.ts --network base-sepolia");
  console.log();

  // Save addresses to file
  const addresses = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    safe: SAFE_ADDRESS,
    fvc: fvcAddress,
    sale: saleAddress,
    staking: stakingAddress,
    usdc: USDC_ADDRESS,
    deployedAt: new Date().toISOString(),
  };

  const fs = require("fs");
  const path = require("path");
  const outputPath = path.join(__dirname, "..", "deployments-testnet.json");
  fs.writeFileSync(outputPath, JSON.stringify(addresses, null, 2));
  console.log("💾 Addresses saved to:", outputPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
