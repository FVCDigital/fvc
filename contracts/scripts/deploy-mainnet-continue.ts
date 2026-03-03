import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Continue mainnet deployment — FVC already deployed at 0xB84eC31C6B520c3aeA6a19483EB8f88cB55A0556
 * Deploys Vesting + Sale, then configures everything.
 */

const FVC_ADDRESS = "0xB84eC31C6B520c3aeA6a19483EB8f88cB55A0556";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  if (Number(network.chainId) !== 1) {
    throw new Error(`Wrong network: expected mainnet (1), got ${network.chainId}`);
  }

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("===================================================================");
  console.log("FVC MAINNET — CONTINUE DEPLOYMENT");
  console.log("===================================================================");
  console.log("Deployer:", deployer.address);
  console.log("Balance: ", ethers.formatEther(balance), "ETH");
  console.log("FVC:     ", FVC_ADDRESS, "(already deployed)");
  console.log();

  const TREASURY            = "0xE20c89da2138951655DbbbE6E6db01fe561EBe82";
  const RATE                = 30_000;
  const CAP                 = ethers.parseUnits("100000000", 6);
  const VESTING_THRESHOLD   = 0n;
  const CLIFF               = 365 * 24 * 60 * 60;
  const DURATION            = 730 * 24 * 60 * 60;
  const USDC                = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const USDT                = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
  const CHAINLINK_ETH_USD   = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";
  const ETH_USD_FALLBACK    = ethers.parseUnits("2000", 6);

  async function deploy(factory: any, args: any[]): Promise<[any, string]> {
    const tx = await factory.getDeployTransaction(...args);
    const sent = await deployer.sendTransaction(tx);
    console.log("   tx:", sent.hash);
    const receipt = await sent.wait();
    const address = receipt!.contractAddress!;
    return [factory.attach(address).connect(deployer), address];
  }

  // ── 1. Deploy Vesting ──────────────────────────────────────────────────────
  console.log("1. Deploying Vesting...");
  const VestingFactory = await ethers.getContractFactory("Vesting");
  const [vesting, vestingAddress] = await deploy(VestingFactory, [FVC_ADDRESS]);
  console.log("   Vesting:", vestingAddress);

  // ── 2. Deploy Sale ─────────────────────────────────────────────────────────
  console.log("2. Deploying Sale...");
  const SaleFactory = await ethers.getContractFactory("Sale");
  const [sale, saleAddress] = await deploy(SaleFactory, [FVC_ADDRESS, TREASURY, RATE, CAP, CHAINLINK_ETH_USD]);
  console.log("   Sale:", saleAddress);
  console.log();

  // ── 3. Configure ───────────────────────────────────────────────────────────
  console.log("CONFIGURING");
  console.log("-------------------------------------------------------------------");

  const fvc = (await ethers.getContractFactory("FVC")).attach(FVC_ADDRESS).connect(deployer);

  console.log("3. Granting MINTER_ROLE to Sale...");
  const MINTER_ROLE = await (fvc as any).MINTER_ROLE();
  await (await (fvc as any).grantRole(MINTER_ROLE, saleAddress)).wait();
  console.log("   Done");

  console.log("4. Accepting USDC...");
  await (await (sale as any).setAcceptedToken(USDC, true, 6)).wait();
  console.log("   Done");

  console.log("5. Accepting USDT...");
  await (await (sale as any).setAcceptedToken(USDT, true, 6)).wait();
  console.log("   Done");

  console.log("6. Setting ETH/USD fallback ($2,000)...");
  await (await (sale as any).setEthUsdRate(ETH_USD_FALLBACK)).wait();
  console.log("   Done");

  console.log("7. Setting vesting config (threshold=0, 12mo cliff, 24mo)...");
  await (await (sale as any).setVestingConfig(vestingAddress, VESTING_THRESHOLD, CLIFF, DURATION)).wait();
  console.log("   Done");

  console.log("8. Transferring Vesting ownership to Sale...");
  await (await (vesting as any).transferOwnership(saleAddress)).wait();
  console.log("   Done");

  console.log("9. Activating sale...");
  await (await (sale as any).setActive(true)).wait();
  console.log("   Done");

  console.log("10. Transferring Sale ownership to Treasury (Gnosis Safe)...");
  await (await (sale as any).transferOwnership(TREASURY)).wait();
  console.log("    Done");

  // ── 4. Transfer FVC admin to Treasury ─────────────────────────────────────
  console.log("11. Granting FVC DEFAULT_ADMIN_ROLE to Treasury...");
  const DEFAULT_ADMIN_ROLE = await (fvc as any).DEFAULT_ADMIN_ROLE();
  await (await (fvc as any).grantRole(DEFAULT_ADMIN_ROLE, TREASURY)).wait();
  console.log("    Done");

  const finalBalance = await ethers.provider.getBalance(deployer.address);
  const gasUsed = balance - finalBalance;

  console.log();
  console.log("===================================================================");
  console.log("DEPLOYMENT COMPLETE");
  console.log("===================================================================");
  console.log("FVC Token:        ", FVC_ADDRESS);
  console.log("Sale Contract:    ", saleAddress);
  console.log("Vesting Contract: ", vestingAddress);
  console.log("Treasury/Owner:   ", TREASURY);
  console.log("Gas used:         ", ethers.formatEther(gasUsed), "ETH");
  console.log("===================================================================");

  const deployment = {
    network: "mainnet",
    chainId: 1,
    deployer: deployer.address,
    treasury: TREASURY,
    fvc: FVC_ADDRESS,
    sale: saleAddress,
    vesting: vestingAddress,
    usdc: USDC,
    usdt: USDT,
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

  console.log("\n===================================================================");
  console.log("CPANEL .ENV VALUES — paste into server .env");
  console.log("===================================================================");
  console.log(`ETH_CHAIN_ID=1`);
  console.log(`ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/6tgWso4UXVZmfMyP0ErKJ`);
  console.log(`ETH_FVC_ADDRESS=${FVC_ADDRESS}`);
  console.log(`ETH_SALE_ADDRESS=${saleAddress}`);
  console.log(`ETH_VESTING_ADDRESS=${vestingAddress}`);
  console.log(`ETH_USDC_ADDRESS=${USDC}`);
  console.log(`ETH_USDT_ADDRESS=${USDT}`);
  console.log("===================================================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\nFAILED:", e.message);
    process.exit(1);
  });
