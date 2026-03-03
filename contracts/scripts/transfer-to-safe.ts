import { ethers } from "hardhat";

/**
 * Transfer ownership of all contracts to Safe
 * Run this ONCE from deployer EOA
 * 
 * Usage: yarn hardhat run scripts/transfer-to-safe.ts --network base-sepolia
 */

const ADDRESSES = {
  fvc: "0x7dA82193bf0671Bb1683Dd6488E914436827ae8e",
  tokenSale: "0xd59b3F0EA3Daa359Ec799EB77c36a7bF8926c812",
  staking: "0x404307557837CDe827f7B4bbb5ea12bD69a6F7F5",
  safe: "0x468D5B7fb6201f7cFbbA9A08B3bF49474145F61f",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("TRANSFER OWNERSHIP TO SAFE");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("Deployer:", deployer.address);
  console.log("Safe:    ", ADDRESSES.safe);
  console.log();

  const fvc = await ethers.getContractAt("FVC", ADDRESSES.fvc);
  const sale = await ethers.getContractAt("TokenSale", ADDRESSES.tokenSale);
  const staking = await ethers.getContractAt("Staking", ADDRESSES.staking);

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Grant DEFAULT_ADMIN_ROLE to Safe on FVC
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("1️⃣  Granting DEFAULT_ADMIN_ROLE to Safe on FVC...");
  const DEFAULT_ADMIN_ROLE = ethers.zeroPadValue("0x00", 32);
  const grantTx = await fvc.grantRole(DEFAULT_ADMIN_ROLE, ADDRESSES.safe);
  await grantTx.wait();
  console.log("✅ Granted");
  console.log("   TX:", grantTx.hash);
  console.log();

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Transfer TokenSale ownership to Safe
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("2️⃣  Transferring TokenSale ownership to Safe...");
  const transferSaleTx = await sale.transferOwnership(ADDRESSES.safe);
  await transferSaleTx.wait();
  console.log("✅ Transferred");
  console.log("   TX:", transferSaleTx.hash);
  console.log();

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Transfer Staking ownership to Safe
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("3️⃣  Transferring Staking ownership to Safe...");
  const transferStakingTx = await staking.transferOwnership(ADDRESSES.safe);
  await transferStakingTx.wait();
  console.log("✅ Transferred");
  console.log("   TX:", transferStakingTx.hash);
  console.log();

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Renounce deployer's DEFAULT_ADMIN_ROLE on FVC
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("4️⃣  Renouncing deployer's DEFAULT_ADMIN_ROLE on FVC...");
  const renounceTx = await fvc.renounceRole(DEFAULT_ADMIN_ROLE, deployer.address);
  await renounceTx.wait();
  console.log("✅ Renounced");
  console.log("   TX:", renounceTx.hash);
  console.log();

  // ═══════════════════════════════════════════════════════════════════════════
  // Verification
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("VERIFICATION");
  console.log("═══════════════════════════════════════════════════════════════");
  
  const safeHasAdmin = await fvc.hasRole(DEFAULT_ADMIN_ROLE, ADDRESSES.safe);
  const deployerHasAdmin = await fvc.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
  const saleOwner = await sale.owner();
  const stakingOwner = await staking.owner();

  console.log("Safe has DEFAULT_ADMIN_ROLE:     ", safeHasAdmin ? "✅" : "❌");
  console.log("Deployer has DEFAULT_ADMIN_ROLE: ", deployerHasAdmin ? "❌ (renounced)" : "✅");
  console.log("TokenSale owner is Safe:         ", saleOwner === ADDRESSES.safe ? "✅" : "❌");
  console.log("Staking owner is Safe:           ", stakingOwner === ADDRESSES.safe ? "✅" : "❌");
  console.log();

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("✅ OWNERSHIP TRANSFER COMPLETE");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log();
  console.log("📝 NEXT: Execute Safe transactions via Transaction Builder");
  console.log("   See: contracts/SAFE_TRANSACTIONS.txt");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
