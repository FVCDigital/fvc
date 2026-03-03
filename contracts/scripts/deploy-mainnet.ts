import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deploy FVC, Sale, and Vesting to Ethereum Mainnet
 *
 * Prerequisites:
 *   1. DEPLOYER_PRIVATE_KEY in contracts/.env
 *   2. ETHEREUM_MAINNET_RPC in contracts/.env
 *   3. MAINNET_TREASURY_ADDRESS in contracts/.env (Gnosis Safe)
 *   4. Deployer wallet needs mainnet ETH for gas (~0.001 ETH at low gas)
 *
 * Run:
 *   npx hardhat run scripts/deploy-mainnet.ts --network mainnet
 */

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  if (Number(network.chainId) !== 1) {
    throw new Error(`Wrong network: expected mainnet (1), got ${network.chainId}. Aborting.`);
  }

  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("===================================================================");
  console.log("FVC ETHEREUM MAINNET DEPLOYMENT");
  console.log("===================================================================");
  console.log("Network:  ", network.name);
  console.log("Chain ID: ", network.chainId.toString());
  console.log("Deployer: ", deployer.address);
  console.log("Balance:  ", ethers.formatEther(balance), "ETH");
  console.log();

  if (balance < ethers.parseEther("0.001")) {
    throw new Error("Deployer balance too low — need at least 0.001 ETH for gas.");
  }

  const TREASURY = process.env.MAINNET_TREASURY_ADDRESS;
  if (!TREASURY) throw new Error("MAINNET_TREASURY_ADDRESS not set in .env");

  // $0.03 per FVC — 30_000 stable units (6 decimals) per 1e18 FVC
  const RATE = 30_000;

  // $100M cap — effectively uncapped for seed round
  const CAP = ethers.parseUnits("100000000", 6);

  // Vest all purchases (threshold = 0): 12-month cliff, 24-month total
  const VESTING_THRESHOLD = 0n;
  const CLIFF    = 365 * 24 * 60 * 60;  // 12 months
  const DURATION = 730 * 24 * 60 * 60;  // 24 months

  // Mainnet token addresses
  const USDC_MAINNET = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const USDT_MAINNET = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

  // Chainlink ETH/USD mainnet feed
  const CHAINLINK_ETH_USD = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";

  // Manual ETH/USD fallback (used if Chainlink is stale)
  const ETH_USD_FALLBACK = ethers.parseUnits("2000", 6); // conservative $2,000

  console.log("CONFIGURATION");
  console.log("-------------------------------------------------------------------");
  console.log("Treasury (Safe):  ", TREASURY);
  console.log("FVC Price:         $0.03 (rate =", RATE, ")");
  console.log("Sale Cap:          $100,000,000");
  console.log("Vesting threshold: 0 (vest ALL purchases)");
  console.log("Cliff:             12 months");
  console.log("Duration:          24 months");
  console.log("Chainlink Feed:   ", CHAINLINK_ETH_USD);
  console.log("ETH/USD Fallback:  $2,000");
  console.log("USDC:             ", USDC_MAINNET);
  console.log("USDT:             ", USDT_MAINNET);
  console.log();
  console.log("Deploying in 5 seconds — Ctrl+C to abort...");
  await new Promise(r => setTimeout(r, 5000));

  // Helper: deploy and resolve address from receipt (works around ethers v6 deploy receipt bug)
  async function deployContract(factory: any, args: any[]): Promise<[any, string]> {
    const tx = await factory.getDeployTransaction(...args);
    const sentTx = await deployer.sendTransaction(tx);
    const receipt = await sentTx.wait();
    const address = receipt!.contractAddress!;
    const instance = factory.attach(address).connect(deployer);
    return [instance, address];
  }

  // ── 1. Deploy FVC ──────────────────────────────────────────────────────────
  console.log("1. Deploying FVC Token...");
  const FVC = await ethers.getContractFactory("FVC");
  const [fvc, fvcAddress] = await deployContract(FVC, [deployer.address]);
  console.log("   FVC:", fvcAddress);

  // ── 2. Deploy Vesting ──────────────────────────────────────────────────────
  console.log("2. Deploying Vesting...");
  const Vesting = await ethers.getContractFactory("Vesting");
  const [vesting, vestingAddress] = await deployContract(Vesting, [fvcAddress]);
  console.log("   Vesting:", vestingAddress);

  // ── 3. Deploy Sale ─────────────────────────────────────────────────────────
  console.log("3. Deploying Sale...");
  const Sale = await ethers.getContractFactory("Sale");
  const [sale, saleAddress] = await deployContract(Sale, [fvcAddress, TREASURY, RATE, CAP, CHAINLINK_ETH_USD]);
  console.log("   Sale:", saleAddress);
  console.log();

  // ── 4. Configure ───────────────────────────────────────────────────────────
  console.log("CONFIGURING");
  console.log("-------------------------------------------------------------------");

  console.log("4. Granting MINTER_ROLE to Sale...");
  const MINTER_ROLE = await fvc.MINTER_ROLE();
  await (await fvc.grantRole(MINTER_ROLE, saleAddress)).wait();
  console.log("   Done");

  console.log("5. Accepting USDC...");
  await (await sale.setAcceptedToken(USDC_MAINNET, true, 6)).wait();
  console.log("   Done");

  console.log("6. Accepting USDT...");
  await (await sale.setAcceptedToken(USDT_MAINNET, true, 6)).wait();
  console.log("   Done");

  console.log("7. Setting ETH/USD fallback rate ($2,000)...");
  await (await sale.setEthUsdRate(ETH_USD_FALLBACK)).wait();
  console.log("   Done");

  console.log("8. Setting vesting config (threshold=0, 12mo cliff, 24mo duration)...");
  await (await sale.setVestingConfig(vestingAddress, VESTING_THRESHOLD, CLIFF, DURATION)).wait();
  console.log("   Done");

  console.log("9. Transferring Vesting ownership to Sale...");
  await (await vesting.transferOwnership(saleAddress)).wait();
  console.log("   Done");

  console.log("10. Activating sale...");
  await (await sale.setActive(true)).wait();
  console.log("    Done");

  console.log("11. Transferring Sale ownership to Treasury (Gnosis Safe)...");
  await (await sale.transferOwnership(TREASURY)).wait();
  console.log("    Done");
  console.log();

  // ── 5. Summary ─────────────────────────────────────────────────────────────
  const finalBalance = await ethers.provider.getBalance(deployer.address);
  const gasUsed = balance - finalBalance;

  console.log("===================================================================");
  console.log("DEPLOYMENT COMPLETE");
  console.log("===================================================================");
  console.log("FVC Token:        ", fvcAddress);
  console.log("Sale Contract:    ", saleAddress);
  console.log("Vesting Contract: ", vestingAddress);
  console.log("Treasury/Owner:   ", TREASURY);
  console.log("USDC:             ", USDC_MAINNET);
  console.log("USDT:             ", USDT_MAINNET);
  console.log("Rate:              $0.03 per FVC");
  console.log("Chainlink Feed:   ", CHAINLINK_ETH_USD);
  console.log("Gas used:         ", ethers.formatEther(gasUsed), "ETH");
  console.log("===================================================================");

  // ── 6. Save addresses ──────────────────────────────────────────────────────
  const deployment = {
    network: "mainnet",
    chainId: 1,
    deployer: deployer.address,
    treasury: TREASURY,
    fvc: fvcAddress,
    sale: saleAddress,
    vesting: vestingAddress,
    usdc: USDC_MAINNET,
    usdt: USDT_MAINNET,
    rate: "0.03",
    chainlinkFeed: CHAINLINK_ETH_USD,
    ethUsdFallback: "2000",
    cap: "100000000",
    vestingThreshold: "0",
    cliffDays: 365,
    vestingDays: 730,
    deployedAt: new Date().toISOString(),
  };

  const outputPath = path.join(__dirname, "..", "deployments-mainnet.json");
  fs.writeFileSync(outputPath, JSON.stringify(deployment, null, 2));
  console.log("\nAddresses saved to:", outputPath);

  // ── 7. cPanel .env block ───────────────────────────────────────────────────
  console.log("\n===================================================================");
  console.log("CPANEL .ENV VALUES — paste into server .env");
  console.log("===================================================================");
  console.log(`ETH_CHAIN_ID=1`);
  console.log(`ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/6tgWso4UXVZmfMyP0ErKJ`);
  console.log(`ETH_FVC_ADDRESS=${fvcAddress}`);
  console.log(`ETH_SALE_ADDRESS=${saleAddress}`);
  console.log(`ETH_VESTING_ADDRESS=${vestingAddress}`);
  console.log(`ETH_USDC_ADDRESS=${USDC_MAINNET}`);
  console.log(`ETH_USDT_ADDRESS=${USDT_MAINNET}`);
  console.log("===================================================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\nDEPLOYMENT FAILED:", e.message);
    process.exit(1);
  });
