import { ethers } from "hardhat";

async function main() {
  const TREASURY = process.env.TREASURY_ADDRESS!;
  const USDC = process.env.AAVE_USDC!;
  if (!TREASURY || !USDC) throw new Error("Missing TREASURY_ADDRESS or AAVE_USDC");

  const treasury = await ethers.getContractAt("Treasury", TREASURY);
  const tx = await treasury.harvestFromAdapter(USDC);
  const rcpt = await tx.wait();
  console.log("Harvested; tx:", rcpt?.hash);
}

main().catch((e) => { console.error(e); process.exit(1); });
