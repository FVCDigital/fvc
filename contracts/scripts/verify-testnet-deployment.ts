import { ethers } from "hardhat";

/**
 * Testnet deployment verification script
 * Run after deploying FVC, TokenSale, Staking via Safe
 * 
 * Usage: yarn hardhat run scripts/verify-testnet-deployment.ts --network base-sepolia
 */

interface DeploymentAddresses {
  fvc: string;
  sale: string;
  staking: string;
  usdc: string;
  usdt: string;
  safe: string;
}

// Replace with actual deployed addresses
const ADDRESSES: DeploymentAddresses = {
  fvc: "0x7dA82193bf0671Bb1683Dd6488E914436827ae8e",
  sale: "0xd59b3F0EA3Daa359Ec799EB77c36a7bF8926c812",
  staking: "0x404307557837CDe827f7B4bbb5ea12bD69a6F7F5",
  usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia USDC
  usdt: "0x0000000000000000000000000000000000000000", // Deploy MockStable as USDT
  safe: "0x468D5B7fb6201f7cFbbA9A08B3bF49474145F61f",
};

const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE"));
const BURNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("BURNER_ROLE"));
const DEFAULT_ADMIN_ROLE = ethers.zeroPadValue("0x00", 32);

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("FVC TESTNET DEPLOYMENT VERIFICATION");
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("═══════════════════════════════════════════════════════════════\n");

  // Validate addresses
  if (ADDRESSES.fvc === "0x0000000000000000000000000000000000000000") {
    console.error("❌ ERROR: Update ADDRESSES in script with deployed contract addresses");
    process.exit(1);
  }

  const fvc = await ethers.getContractAt("FVC", ADDRESSES.fvc);
  const sale = await ethers.getContractAt("Sale", ADDRESSES.sale);
  const staking = await ethers.getContractAt("Staking", ADDRESSES.staking);

  console.log("📍 CONTRACT ADDRESSES");
  console.log("─────────────────────────────────────────────────────────────");
  console.log("FVC:        ", ADDRESSES.fvc);
  console.log("Sale:       ", ADDRESSES.sale);
  console.log("Staking:    ", ADDRESSES.staking);
  console.log("USDC:       ", ADDRESSES.usdc);
  console.log("Safe:       ", ADDRESSES.safe);
  console.log();

  // ═══════════════════════════════════════════════════════════════════════════
  // FVC TOKEN CHECKS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("🪙 FVC TOKEN STATE");
  console.log("─────────────────────────────────────────────────────────────");

  const name = await fvc.name();
  const symbol = await fvc.symbol();
  const decimals = await fvc.decimals();
  const cap = await fvc.cap();
  const totalSupply = await fvc.totalSupply();

  console.log("Name:         ", name);
  console.log("Symbol:       ", symbol);
  console.log("Decimals:     ", decimals);
  console.log("Cap:          ", ethers.formatEther(cap), "FVC");
  console.log("Total Supply: ", ethers.formatEther(totalSupply), "FVC");
  console.log();

  // Role checks
  console.log("🔐 FVC ROLE ASSIGNMENTS");
  console.log("─────────────────────────────────────────────────────────────");

  const safeHasAdmin = await fvc.hasRole(DEFAULT_ADMIN_ROLE, ADDRESSES.safe);
  const safeHasMinter = await fvc.hasRole(MINTER_ROLE, ADDRESSES.safe);
  const safeHasBurner = await fvc.hasRole(BURNER_ROLE, ADDRESSES.safe);
  const saleHasMinter = await fvc.hasRole(MINTER_ROLE, ADDRESSES.sale);

  console.log("Safe has DEFAULT_ADMIN_ROLE: ", safeHasAdmin ? "✅" : "❌");
  console.log("Safe has MINTER_ROLE:        ", safeHasMinter ? "✅" : "❌");
  console.log("Safe has BURNER_ROLE:        ", safeHasBurner ? "✅" : "❌");
  console.log("Sale has MINTER_ROLE:   ", saleHasMinter ? "✅" : "❌ REQUIRED");
  console.log();

  if (!saleHasMinter) {
    console.log("⚠️  WARNING: Sale missing MINTER_ROLE - execute Safe TX 1.1");
    console.log();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TOKEN SALE CHECKS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("💰 SALE STATE");
  console.log("─────────────────────────────────────────────────────────────");

  const saleToken = await sale.saleToken();
  const beneficiary = await sale.beneficiary();
  const rate = await sale.rate();
  const cap = await sale.cap();
  const raised = await sale.raised();
  const active = await sale.active();
  const usdcAccepted = await sale.isAccepted(ADDRESSES.usdc);

  console.log("Sale Token:   ", saleToken);
  console.log("Beneficiary:  ", beneficiary);
  console.log("Rate:         ", rate.toString(), "(6d stable per 18d FVC)");
  console.log("Cap:          ", ethers.formatUnits(cap, 6), "USDC");
  console.log("Raised:       ", ethers.formatUnits(raised, 6), "USDC");
  console.log("Active:       ", active ? "✅ LIVE" : "❌ INACTIVE");
  console.log("USDC Accepted:", usdcAccepted ? "✅" : "❌ REQUIRED");
  console.log();

  // Validation
  const saleOwner = await sale.owner();
  console.log("Sale Owner:   ", saleOwner);
  console.log("Owner is Safe:", saleOwner === ADDRESSES.safe ? "✅" : "❌");
  console.log();

  if (!active) {
    console.log("⚠️  WARNING: Sale inactive - execute Safe TX 1.6 (setActive)");
    console.log();
  }
  if (!usdcAccepted) {
    console.log("⚠️  WARNING: USDC not accepted - execute Safe TX 1.4");
    console.log();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STAKING CHECKS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("🥩 STAKING STATE");
  console.log("─────────────────────────────────────────────────────────────");

  const stakingToken = await staking.stakingToken();
  const rewardsToken = await staking.rewardsToken();
  const rewardRate = await staking.rewardRate();
  const rewardsDuration = await staking.rewardsDuration();
  const periodFinish = await staking.periodFinish();
  const totalStaked = await staking.totalSupply();

  console.log("Staking Token:", stakingToken);
  console.log("Rewards Token:", rewardsToken);
  console.log("Reward Rate:  ", rewardRate.toString(), "per second");
  console.log("Duration:     ", (Number(rewardsDuration) / 86400).toFixed(1), "days");
  console.log("Period Finish:", periodFinish.toString(), periodFinish > 0n ? `(${new Date(Number(periodFinish) * 1000).toISOString()})` : "(not started)");
  console.log("Total Staked: ", ethers.formatEther(totalStaked), "FVC");
  console.log();

  const stakingOwner = await staking.owner();
  console.log("Staking Owner:", stakingOwner);
  console.log("Owner is Safe:", stakingOwner === ADDRESSES.safe ? "✅" : "❌");
  console.log();

  // ═══════════════════════════════════════════════════════════════════════════
  // INTEGRATION CHECKS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("🔗 INTEGRATION VALIDATION");
  console.log("─────────────────────────────────────────────────────────────");

  const salePointsToFvc = saleToken.toLowerCase() === ADDRESSES.fvc.toLowerCase();
  const stakingPointsToFvc = stakingToken.toLowerCase() === ADDRESSES.fvc.toLowerCase();
  const stakingRewardsIsUsdc = rewardsToken.toLowerCase() === ADDRESSES.usdc.toLowerCase();
  const beneficiaryIsSafe = beneficiary.toLowerCase() === ADDRESSES.safe.toLowerCase();

  console.log("Sale.saleToken == FVC:       ", salePointsToFvc ? "✅" : "❌");
  console.log("Staking.stakingToken == FVC:      ", stakingPointsToFvc ? "✅" : "❌");
  console.log("Staking.rewardsToken == USDC:     ", stakingRewardsIsUsdc ? "✅" : "❌");
  console.log("Sale.beneficiary == Safe:    ", beneficiaryIsSafe ? "✅" : "❌");
  console.log();

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("DEPLOYMENT READINESS CHECKLIST");
  console.log("═══════════════════════════════════════════════════════════════");

  const checks = [
    { name: "Safe has DEFAULT_ADMIN_ROLE on FVC", pass: safeHasAdmin },
    { name: "Sale has MINTER_ROLE on FVC", pass: saleHasMinter },
    { name: "Sale is active", pass: active },
    { name: "USDC is accepted by Sale", pass: usdcAccepted },
    { name: "Sale beneficiary is Safe", pass: beneficiaryIsSafe },
    { name: "Sale owner is Safe", pass: saleOwner === ADDRESSES.safe },
    { name: "Staking owner is Safe", pass: stakingOwner === ADDRESSES.safe },
    { name: "Staking rewards token is USDC", pass: stakingRewardsIsUsdc },
  ];

  checks.forEach((check) => {
    console.log(check.pass ? "✅" : "❌", check.name);
  });

  const allPass = checks.every((c) => c.pass);
  console.log();
  if (allPass) {
    console.log("🎉 ALL CHECKS PASSED - READY FOR PRESALE");
  } else {
    console.log("⚠️  CONFIGURATION INCOMPLETE - Review Safe transactions");
  }
  console.log("═══════════════════════════════════════════════════════════════");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
