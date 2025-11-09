import { ethers } from "hardhat";

async function main() {
  const FVC = process.env.FVC_ADDRESS!;
  const CLAIM = process.env.FAUCET_CLAIM_AMOUNT || "10"; // FVC (18dp)
  const COOLDOWN = process.env.FAUCET_COOLDOWN || String(24 * 60 * 60);
  const MAX = process.env.FAUCET_MAX_CLAIMS || "5";
  if (!FVC) throw new Error("Missing FVC_ADDRESS");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const Faucet = await ethers.getContractFactory("FVCFaucet");
  const faucet = await Faucet.deploy(FVC, ethers.parseUnits(CLAIM, 18), BigInt(COOLDOWN), BigInt(MAX));
  await faucet.waitForDeployment();
  const faucetAddr = await faucet.getAddress();
  console.log("Faucet:", faucetAddr);

  // grant MINTER_ROLE to faucet
  const fvc = await ethers.getContractAt("FVC", FVC);
  const MINTER_ROLE = await fvc.MINTER_ROLE();
  await (await fvc.grantRole(MINTER_ROLE, faucetAddr)).wait();
  console.log("Granted MINTER_ROLE to faucet");
}

main().catch((e) => { console.error(e); process.exit(1); });
