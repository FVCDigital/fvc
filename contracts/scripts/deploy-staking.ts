import { ethers } from "hardhat";

async function main() {
  const FVC = process.env.FVC_ADDRESS!; // FVC token (18dp)
  const USDC = process.env.USDC_ADDRESS!; // Rewards token (6dp) Correct Base Sepolia USDC
  const OWNER = process.env.OWNER_SAFE!; // Gnosis Safe address

  if (!FVC) throw new Error("Missing FVC_ADDRESS");
  if (!USDC) throw new Error("Missing USDC_ADDRESS");
  if (!OWNER) throw new Error("Missing OWNER_SAFE");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("FVC:", FVC);
  console.log("USDC:", USDC);
  console.log("Owner (Safe):", OWNER);

  const Staking = await ethers.getContractFactory("Staking");
  const staking = await Staking.deploy(FVC, USDC);
  await staking.waitForDeployment();

  const stakingAddr = await staking.getAddress();
  console.log("Staking deployed:", stakingAddr);

  // Transfer ownership to Safe
  const tx = await staking.transferOwnership(OWNER);
  await tx.wait();
  console.log("Ownership transferred to:", OWNER);

  console.log("ENV to update:\nNEXT_PUBLIC_STAKING_ADDRESS=", stakingAddr);
}

main().catch((e) => { console.error(e); process.exit(1); });
