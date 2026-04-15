import { ethers } from "hardhat";

async function main() {
  const NEW_SALE = "0xdf95824ae269c62427a5925231b970aa43d709d1";
  const sale = await ethers.getContractAt("Sale", NEW_SALE);
  
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  NEW SALE CONTRACT STATUS");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Address:", NEW_SALE);
  console.log("  Owner:", await sale.owner());
  console.log("  Active:", await sale.active());
  console.log("  Rate:", (await sale.rate()).toString(), "($" + (Number(await sale.rate()) / 1e6) + "/FVC)");
  console.log("  Vesting:", await sale.vestingContract());
  console.log("  USDC accepted:", await sale.isAccepted("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"));
  console.log("  USDT accepted:", await sale.isAccepted("0xdAC17F958D2ee523a2206206994597C13D831ec7"));
  console.log("═══════════════════════════════════════════════════════════════");
}

main().catch(console.error);
