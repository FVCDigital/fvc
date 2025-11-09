import { ethers } from "hardhat";

async function main() {
  const STAKING = process.env.STAKING_ADDRESS!;
  const NEW_OWNER = process.env.NEW_OWNER!;
  if (!STAKING || !NEW_OWNER) throw new Error("Missing STAKING_ADDRESS or NEW_OWNER");

  const staking = await ethers.getContractAt("Staking", STAKING);
  await (await staking.transferOwnership(NEW_OWNER)).wait();
  console.log("Transferred ownership of Staking to:", NEW_OWNER);
}

main().catch((e) => { console.error(e); process.exit(1); });
