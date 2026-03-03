import { ethers } from "hardhat";

async function main() {
  const fvcAddress = process.env.FVC_ADDRESS;
  const safeAddress = process.env.SAFE_ADDRESS;

  if (!fvcAddress || !safeAddress) {
    throw new Error("Missing FVC_ADDRESS or SAFE_ADDRESS in env");
  }

  const [signer] = await ethers.getSigners();
  const deployer = await signer.getAddress();

  const fvc = await ethers.getContractAt("FVC", fvcAddress, signer);

  const MINTER_ROLE = await fvc.MINTER_ROLE();
  const BURNER_ROLE = await fvc.BURNER_ROLE();
  const DEFAULT_ADMIN_ROLE = await fvc.DEFAULT_ADMIN_ROLE();

  // Grant roles to Safe (idempotent if already granted)
  const grantIfNeeded = async (role: string, account: string, label: string) => {
    const has = await fvc.hasRole(role, account);
    if (!has) {
      const tx = await fvc.grantRole(role, account);
      await tx.wait();
      console.log(`Granted ${label} to ${account}`);
    } else {
      console.log(`${account} already has ${label}`);
    }
  };

  await grantIfNeeded(MINTER_ROLE, safeAddress, "MINTER_ROLE");
  await grantIfNeeded(BURNER_ROLE, safeAddress, "BURNER_ROLE");
  await grantIfNeeded(DEFAULT_ADMIN_ROLE, safeAddress, "DEFAULT_ADMIN_ROLE");

  // Revoke/renounce from deployer where applicable
  const revokeIfHas = async (role: string, account: string, label: string) => {
    const has = await fvc.hasRole(role, account);
    if (has) {
      const tx = await fvc.revokeRole(role, account);
      await tx.wait();
      console.log(`Revoked ${label} from ${account}`);
    } else {
      console.log(`${account} does not have ${label}`);
    }
  };

  await revokeIfHas(MINTER_ROLE, deployer, "MINTER_ROLE");

  // Renounce admin (must be called by the account itself)
  const hasAdmin = await fvc.hasRole(DEFAULT_ADMIN_ROLE, deployer);
  if (hasAdmin) {
    const tx = await fvc.renounceRole(DEFAULT_ADMIN_ROLE, deployer);
    await tx.wait();
    console.log(`Renounced DEFAULT_ADMIN_ROLE for ${deployer}`);
  } else {
    console.log(`${deployer} is not admin; nothing to renounce`);
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
