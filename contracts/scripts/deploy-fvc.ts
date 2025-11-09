import { ethers } from "hardhat";

async function main() {
  const SAFE = process.env.SAFE_ADDRESS!;
  if (!SAFE) throw new Error("Missing SAFE_ADDRESS env");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const FVC = await ethers.getContractFactory("FVC");
  const fvc = await FVC.deploy(SAFE);
  await fvc.waitForDeployment();
  const addr = await fvc.getAddress();
  console.log("FVC:", addr);
}

main().catch((e) => { console.error(e); process.exit(1); });
