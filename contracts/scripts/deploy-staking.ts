import { ethers } from "hardhat";

async function main() {
  const FVC = process.env.FVC_ADDRESS!;
  const USDC = process.env.USDC_ADDRESS!;
  const TRANSFER_OWNERSHIP_TO = process.env.TRANSFER_OWNERSHIP_TO; // optional
  if (!FVC || !USDC) throw new Error("Missing FVC_ADDRESS or USDC_ADDRESS");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const Staking = await ethers.getContractFactory("Staking");
  const staking = await Staking.deploy(FVC, USDC);
  await staking.waitForDeployment();
  const addr = await staking.getAddress();
  console.log("Staking:", addr);

  if (TRANSFER_OWNERSHIP_TO) {
    await (await staking.transferOwnership(TRANSFER_OWNERSHIP_TO)).wait();
    console.log("Ownership transferred to:", TRANSFER_OWNERSHIP_TO);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
