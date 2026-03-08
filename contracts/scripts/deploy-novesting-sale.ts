import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deploy a second Sale contract with NO vesting config.
 *
 * This Sale is used exclusively for the /hamidou private allocation page.
 * Because setVestingConfig is never called, vestingContract == address(0),
 * so _mintOrVest() mints directly to the buyer — no vesting, no lock-up.
 *
 * After deployment you must execute ONE Gnosis Safe transaction:
 *   FVC.grantRole(MINTER_ROLE, noVestingSaleAddress)
 *
 * The Safe transaction JSON is written to:
 *   gnosis-safe/ethereum-mainnet/grant-minter-novesting-sale.json
 *
 * Run:
 *   npx hardhat run scripts/deploy-novesting-sale.ts --network mainnet
 */

const MAINNET = {
  FVC:       "0xB84eC31C6B520c3aeA6a19483EB8f88cB55A0556",
  TREASURY:  "0xE20c89da2138951655DbbbE6E6db01fe561EBe82",
  USDC:      "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  USDT:      "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  CHAINLINK: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
};

// Same rate as main sale: $0.03 per FVC
const RATE = 30_000;
// $10M cap for this private channel
const CAP  = ethers.parseUnits("10000000", 6);

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  if (Number(network.chainId) !== 1) {
    throw new Error(`Wrong network: expected mainnet (1), got ${network.chainId}`);
  }

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("=".repeat(60));
  console.log("FVC — No-Vesting Sale Deployment");
  console.log("=".repeat(60));
  console.log("Deployer:", deployer.address);
  console.log("Balance: ", ethers.formatEther(balance), "ETH");
  console.log();

  if (balance < ethers.parseEther("0.001")) {
    throw new Error("Deployer balance too low — need at least 0.001 ETH.");
  }

  // Deploy Sale — no setVestingConfig call means vestingContract = address(0)
  console.log("Deploying no-vesting Sale...");
  const Sale = await ethers.getContractFactory("Sale");
  const sale = await Sale.deploy(
    MAINNET.FVC,
    MAINNET.TREASURY,
    RATE,
    CAP,
    MAINNET.CHAINLINK
  );
  await sale.waitForDeployment();
  const saleAddress = await sale.getAddress();
  console.log("✓ Sale deployed:", saleAddress);

  // Accept USDC and USDT (owner = treasury/Safe, so we can't call from deployer)
  // These must be called from the Safe — included in the Safe tx JSON below.
  console.log();
  console.log("NOTE: The following must be executed from the Gnosis Safe:");
  console.log("  1. FVC.grantRole(MINTER_ROLE, saleAddress)");
  console.log("  2. Sale.setAcceptedToken(USDC, true, 6)");
  console.log("  3. Sale.setAcceptedToken(USDT, true, 6)");
  console.log("  4. Sale.setEthUsdRate(fallback) — optional, Chainlink is live");
  console.log("  5. Sale.setActive(true)");

  // Write deployment record
  const record = {
    network: "mainnet",
    chainId: 1,
    purpose: "no-vesting private sale (hamidou channel)",
    deployer: deployer.address,
    noVestingSale: saleAddress,
    fvc: MAINNET.FVC,
    treasury: MAINNET.TREASURY,
    usdc: MAINNET.USDC,
    usdt: MAINNET.USDT,
    rate: "0.03",
    cap: "10000000",
    vestingConfig: "NONE — tokens mint directly to buyer",
    deployedAt: new Date().toISOString(),
  };

  const outPath = path.join(__dirname, "../deployments-novesting.json");
  fs.writeFileSync(outPath, JSON.stringify(record, null, 2));
  console.log("\n✓ Deployment record written to deployments-novesting.json");

  // Write Gnosis Safe batch transaction JSON
  const MINTER_ROLE = "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6";

  const safeTx = {
    version: "1.0",
    chainId: "1",
    createdAt: Date.now(),
    meta: {
      name: "Grant MINTER_ROLE + configure no-vesting Sale",
      description: "5 transactions: grant minter role, accept USDC/USDT, activate sale",
    },
    transactions: [
      {
        to: MAINNET.FVC,
        value: "0",
        data: null,
        contractMethod: {
          inputs: [
            { name: "role",    type: "bytes32" },
            { name: "account", type: "address" },
          ],
          name: "grantRole",
          payable: false,
        },
        contractInputsValues: {
          role: MINTER_ROLE,
          account: saleAddress,
        },
      },
      {
        to: saleAddress,
        value: "0",
        data: null,
        contractMethod: {
          inputs: [
            { name: "token",     type: "address" },
            { name: "allowed",   type: "bool"    },
            { name: "decimals_", type: "uint8"   },
          ],
          name: "setAcceptedToken",
          payable: false,
        },
        contractInputsValues: {
          token: MAINNET.USDC,
          allowed: "true",
          decimals_: "6",
        },
      },
      {
        to: saleAddress,
        value: "0",
        data: null,
        contractMethod: {
          inputs: [
            { name: "token",     type: "address" },
            { name: "allowed",   type: "bool"    },
            { name: "decimals_", type: "uint8"   },
          ],
          name: "setAcceptedToken",
          payable: false,
        },
        contractInputsValues: {
          token: MAINNET.USDT,
          allowed: "true",
          decimals_: "6",
        },
      },
      {
        to: saleAddress,
        value: "0",
        data: null,
        contractMethod: {
          inputs: [{ name: "_active", type: "bool" }],
          name: "setActive",
          payable: false,
        },
        contractInputsValues: { _active: "true" },
      },
    ],
  };

  const safeDir = path.join(__dirname, "../../gnosis-safe/ethereum-mainnet");
  fs.mkdirSync(safeDir, { recursive: true });
  const safePath = path.join(safeDir, "grant-minter-novesting-sale.json");
  fs.writeFileSync(safePath, JSON.stringify(safeTx, null, 2));
  console.log("✓ Gnosis Safe batch written to gnosis-safe/ethereum-mainnet/grant-minter-novesting-sale.json");

  console.log("\n=".repeat(60));
  console.log("NEXT STEPS:");
  console.log("1. Import grant-minter-novesting-sale.json into Gnosis Safe Transaction Builder");
  console.log("2. Execute the batch");
  console.log("3. Update NEXT_PUBLIC_NOVESTING_SALE_ADDRESS in dapp/.env.local");
  console.log("4. hamidou.html will work automatically once the sale is active");
  console.log("=".repeat(60));
  console.log("\nNo-vesting Sale address:", saleAddress);
}

main().catch(e => { console.error(e); process.exit(1); });
