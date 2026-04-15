import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deploy NEW Sale contract with Allowlist support
 * 
 * This deploys a new Sale contract alongside the existing one.
 * Existing FVC and Vesting contracts are reused.
 * 
 * After deployment:
 *   1. Grant MINTER_ROLE to new Sale via Safe
 *   2. Transfer Vesting ownership to new Sale via Safe (if needed)
 *   3. Update UI config to point to new Sale
 *   4. Deactivate old Sale if desired
 * 
 * Run:
 *   npx hardhat run scripts/upgrade-sale-allowlist.ts --network mainnet
 */

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  // Load existing deployment
  const deploymentsPath = path.join(__dirname, "..", `deployments-${chainId === 1 ? 'mainnet' : 'sepolia'}.json`);
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error(`No existing deployment found at ${deploymentsPath}`);
  }
  const existing = JSON.parse(fs.readFileSync(deploymentsPath, 'utf-8'));

  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  DEPLOY NEW SALE CONTRACT WITH ALLOWLIST SUPPORT");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  Network:     ${network.name} (${chainId})`);
  console.log(`  Deployer:    ${deployer.address}`);
  console.log(`  Balance:     ${ethers.formatEther(balance)} ETH`);
  console.log("───────────────────────────────────────────────────────────────");
  console.log("  EXISTING CONTRACTS (will be reused):");
  console.log(`    FVC:       ${existing.fvc}`);
  console.log(`    Vesting:   ${existing.vesting}`);
  console.log(`    Treasury:  ${existing.treasury}`);
  console.log(`    Old Sale:  ${existing.sale}`);
  console.log("═══════════════════════════════════════════════════════════════\n");

  if (balance < ethers.parseEther("0.004")) {
    throw new Error("Need at least 0.004 ETH for deployment gas");
  }

  const TREASURY = existing.treasury;
  const FVC_ADDRESS = existing.fvc;
  const VESTING_ADDRESS = existing.vesting;
  
  // Same config as before
  const RATE = 30_000; // $0.03
  const CAP = ethers.parseUnits("100000000", 6); // $100M
  const CHAINLINK_ETH_USD = existing.chainlinkFeed || "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";
  const ETH_USD_FALLBACK = ethers.parseUnits("2000", 6);
  const USDC = existing.usdc;
  const USDT = existing.usdt;
  
  // Vesting config
  const VESTING_THRESHOLD = 0n;
  const CLIFF = 365 * 24 * 60 * 60;  // 12 months
  const DURATION = 730 * 24 * 60 * 60;  // 24 months

  console.log("Deploying new Sale with allowlist in 5 seconds... Ctrl+C to abort");
  await new Promise(r => setTimeout(r, 5000));

  // Deploy new Sale
  console.log("\n1. Deploying new Sale contract...");
  const Sale = await ethers.getContractFactory("Sale");
  const saleTx = await Sale.getDeployTransaction(FVC_ADDRESS, TREASURY, RATE, CAP, CHAINLINK_ETH_USD);
  const sentTx = await deployer.sendTransaction(saleTx);
  const receipt = await sentTx.wait();
  const newSaleAddress = receipt!.contractAddress!;
  const sale = Sale.attach(newSaleAddress).connect(deployer);
  console.log(`   New Sale: ${newSaleAddress}`);

  // Configure (deployer is owner until we transfer)
  console.log("\n2. Configuring new Sale...");
  
  console.log("   - Accepting USDC...");
  await (await sale.setAcceptedToken(USDC, true, 6)).wait();
  
  console.log("   - Accepting USDT...");
  await (await sale.setAcceptedToken(USDT, true, 6)).wait();
  
  console.log("   - Setting ETH/USD fallback...");
  await (await sale.setEthUsdRate(ETH_USD_FALLBACK)).wait();
  
  console.log("   - Setting vesting config...");
  await (await sale.setVestingConfig(VESTING_ADDRESS, VESTING_THRESHOLD, CLIFF, DURATION)).wait();
  
  // DON'T activate or transfer ownership yet - Safe needs to grant MINTER_ROLE first
  console.log("\n   ⚠️  NOT activating sale yet - Safe must grant MINTER_ROLE first");

  // Save ABI
  const abiPath = path.join(__dirname, "..", "abi", "Sale.json");
  const artifactPath = path.join(__dirname, "..", "artifacts", "src", "sale", "Sale.sol", "Sale.json");
  
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
    fs.mkdirSync(path.dirname(abiPath), { recursive: true });
    fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
    console.log(`\n   ABI saved to: ${abiPath}`);
  }

  // Update deployment file
  existing.saleWithAllowlist = newSaleAddress;
  existing.saleWithAllowlistDeployedAt = new Date().toISOString();
  existing.saleWithAllowlistStatus = {
    deployed: true,
    configured: true,
    minterRoleGranted: false,
    vestingOwnershipTransferred: false,
    activated: false,
    ownershipTransferred: false,
  };
  fs.writeFileSync(deploymentsPath, JSON.stringify(existing, null, 2));

  // Generate Safe calldata
  const fvc = await ethers.getContractAt("FVC", FVC_ADDRESS);
  const MINTER_ROLE = await fvc.MINTER_ROLE();
  
  const grantRoleCalldata = fvc.interface.encodeFunctionData("grantRole", [MINTER_ROLE, newSaleAddress]);
  const activateCalldata = sale.interface.encodeFunctionData("setActive", [true]);
  const transferOwnershipCalldata = sale.interface.encodeFunctionData("transferOwnership", [TREASURY]);

  const finalBalance = await ethers.provider.getBalance(deployer.address);
  const gasUsed = balance - finalBalance;

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  DEPLOYMENT COMPLETE - SAFE ACTIONS REQUIRED");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  New Sale:    ${newSaleAddress}`);
  console.log(`  Gas used:    ${ethers.formatEther(gasUsed)} ETH`);
  console.log("───────────────────────────────────────────────────────────────");
  console.log("  Execute these via Gnosis Safe Transaction Builder:\n");
  
  console.log("  TX 1: Grant MINTER_ROLE to new Sale");
  console.log(`    To:    ${FVC_ADDRESS}`);
  console.log(`    Value: 0`);
  console.log(`    Data:  ${grantRoleCalldata}`);
  console.log();
  
  console.log("  TX 2: Activate new Sale");
  console.log(`    To:    ${newSaleAddress}`);
  console.log(`    Value: 0`);
  console.log(`    Data:  ${activateCalldata}`);
  console.log();
  
  console.log("  TX 3: Transfer new Sale ownership to Safe");
  console.log(`    To:    ${newSaleAddress}`);
  console.log(`    Value: 0`);
  console.log(`    Data:  ${transferOwnershipCalldata}`);
  console.log();
  
  console.log("  (Optional) TX 4: Deactivate old Sale");
  console.log(`    To:    ${existing.sale}`);
  console.log(`    Value: 0`);
  console.log(`    Data:  ${sale.interface.encodeFunctionData("setActive", [false])}`);
  
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  UPDATE UI CONFIG");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  ETH_SALE_ADDRESS=${newSaleAddress}`);
  console.log("═══════════════════════════════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\nDEPLOYMENT FAILED:", e.message);
    process.exit(1);
  });
