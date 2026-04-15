import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const SALE = "0xdf95824ae269c62427a5925231b970aa43d709d1";
  const EURC = "0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c";  // 6 decimals
  const ZCHF = "0xB58E61C3098d85632Df34EecfB899A1Ed80921cB";  // 18 decimals

  const sale = await ethers.getContractAt("Sale", SALE);

  const batch = {
    version: "1.0",
    chainId: "1",
    createdAt: Date.now(),
    meta: {
      name: "Accept EURC and Frankencoin",
      description: "Enable European stablecoins for FVC sale",
      txBuilderVersion: "1.16.5",
    },
    transactions: [
      {
        to: SALE,
        value: "0",
        data: sale.interface.encodeFunctionData("setAcceptedToken", [EURC, true, 6]),
      },
      {
        to: SALE,
        value: "0",
        data: sale.interface.encodeFunctionData("setAcceptedToken", [ZCHF, true, 18]),
      },
    ],
  };

  const outputPath = path.join(__dirname, "..", "safe-batch-accept-euro-tokens.json");
  fs.writeFileSync(outputPath, JSON.stringify(batch, null, 2));

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  ACCEPT EURC + FRANKENCOIN");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  EURC:  ", EURC, "(6 decimals)");
  console.log("  ZCHF:  ", ZCHF, "(18 decimals)");
  console.log();
  console.log("  Batch file:", outputPath);
  console.log();
  console.log("  Import in Safe Transaction Builder:");
  console.log("  https://app.safe.global/apps/open?safe=eth:0xE20c89da2138951655DbbbE6E6db01fe561EBe82&appUrl=https%3A%2F%2Fapps-portal.safe.global%2Ftx-builder");
  console.log("═══════════════════════════════════════════════════════════════\n");
}

main().catch(console.error);
