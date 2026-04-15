import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const NEW_SALE = "0xdf95824ae269c62427a5925231b970aa43d709d1";
  const FVC = "0xB84eC31C6B520c3aeA6a19483EB8f88cB55A0556";
  const VESTING = "0x24263Dce127Ad06cC272897629d6688Ec54df389";
  const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
  
  const CLIFF = 365 * 24 * 60 * 60;
  const DURATION = 730 * 24 * 60 * 60;
  const ETH_USD_FALLBACK = ethers.parseUnits("2000", 6);
  
  const sale = await ethers.getContractAt("Sale", NEW_SALE);
  const fvc = await ethers.getContractAt("FVC", FVC);
  const MINTER_ROLE = await fvc.MINTER_ROLE();

  // Safe Transaction Builder batch format
  const batch = {
    version: "1.0",
    chainId: "1",
    createdAt: Date.now(),
    meta: {
      name: "Configure New Sale Contract with Allowlist",
      description: "Grant MINTER_ROLE, accept tokens, set vesting, activate",
      txBuilderVersion: "1.16.5",
    },
    transactions: [
      {
        to: FVC,
        value: "0",
        data: fvc.interface.encodeFunctionData("grantRole", [MINTER_ROLE, NEW_SALE]),
        contractMethod: {
          name: "grantRole",
          inputs: [
            { name: "role", type: "bytes32" },
            { name: "account", type: "address" },
          ],
        },
        contractInputsValues: {
          role: MINTER_ROLE,
          account: NEW_SALE,
        },
      },
      {
        to: NEW_SALE,
        value: "0",
        data: sale.interface.encodeFunctionData("setAcceptedToken", [USDC, true, 6]),
      },
      {
        to: NEW_SALE,
        value: "0",
        data: sale.interface.encodeFunctionData("setAcceptedToken", [USDT, true, 6]),
      },
      {
        to: NEW_SALE,
        value: "0",
        data: sale.interface.encodeFunctionData("setEthUsdRate", [ETH_USD_FALLBACK]),
      },
      {
        to: NEW_SALE,
        value: "0",
        data: sale.interface.encodeFunctionData("setVestingConfig", [VESTING, 0, CLIFF, DURATION]),
      },
      {
        to: NEW_SALE,
        value: "0",
        data: sale.interface.encodeFunctionData("setActive", [true]),
      },
    ],
  };

  const outputPath = path.join(__dirname, "..", "safe-batch-configure-sale.json");
  fs.writeFileSync(outputPath, JSON.stringify(batch, null, 2));

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  SAFE BATCH FILE EXPORTED");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  File:", outputPath);
  console.log();
  console.log("  To import:");
  console.log("  1. Go to: https://app.safe.global/apps/open?safe=eth:0xE20c89da2138951655DbbbE6E6db01fe561EBe82&appUrl=https%3A%2F%2Fapps-portal.safe.global%2Ftx-builder");
  console.log("  2. Click the upload icon (top right)");
  console.log("  3. Select: safe-batch-configure-sale.json");
  console.log("  4. Review transactions and submit");
  console.log("═══════════════════════════════════════════════════════════════\n");
}

main().catch(console.error);
