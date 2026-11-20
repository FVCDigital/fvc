import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deploys the Loan Registry v1 and its 48 hour TimelockController.
 * Spec: contracts/LOAN_REGISTRY.md. Partner settings: docs/specs/partner-integration.md.
 *
 * The script deploys two contracts and stops. Every setting (tokens, limits, the partner's
 * address, the minimum tranche) is admin-only, so it goes through the timelock: the script
 * writes two Safe Transaction Builder batches, one to schedule and one to execute 48 hours
 * later. It never sends them. On the hardhat network it rehearses the whole sequence instead.
 *
 * Usage:
 *   npx hardhat run scripts/deploy-loan-registry.ts                       # rehearsal, local only
 *   LOAN_SAFE_ADDRESS=0x... PARTNER_DEPOSIT_ADDRESS=0x... \
 *     npx hardhat run scripts/deploy-loan-registry.ts --network sepolia
 *   CONFIRM_MAINNET=yes PARTNER_DEPOSIT_ADDRESS=0x... LOAN_MIN_TRANCHE=... \
 *     npx hardhat run scripts/deploy-loan-registry.ts --network mainnet   # a human only
 *
 * LOAN_MIN_TRANCHE is in whole tokens (for example 100 for 100 USDC); 0 or unset leaves it off.
 */

const TIMELOCK_DELAY = 48 * 60 * 60;
const MIN_RATE_BPS = 11_000;
const MAX_RATE_BPS = 15_000;
const MAX_FACILITY_GBP = 50_000_00n;

interface TokenSetting {
  symbol: string;
  address: string;
  decimals: number;
}

interface NetworkSetting {
  safe?: string;
  tokens: TokenSetting[];
  maxPayout: bigint;
  dailyLimit: bigint;
}

const NETWORKS: Record<string, NetworkSetting> = {
  sepolia: {
    tokens: [{ symbol: "USDC", address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", decimals: 6 }],
    maxPayout: 32_000n,
    dailyLimit: 65_000n,
  },
  mainnet: {
    safe: "0xE20c89da2138951655DbbbE6E6db01fe561EBe82",
    tokens: [
      { symbol: "USDC", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6 },
      { symbol: "USDT", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6 },
    ],
    maxPayout: 32_000n,
    dailyLimit: 65_000n,
  },
};

function units(whole: bigint, decimals: number): bigint {
  return whole * BigInt(`1${"0".repeat(decimals)}`);
}

function requireAddress(value: string | undefined, name: string): string {
  if (!value || !ethers.isAddress(value)) throw new Error(`${name} must be set to an address`);
  return ethers.getAddress(value);
}

async function main() {
  const rehearsal = network.name === "hardhat" || network.name === "localhost";
  if (network.name === "mainnet" && process.env.CONFIRM_MAINNET !== "yes") {
    throw new Error("Mainnet needs CONFIRM_MAINNET=yes. Only a human deploys to mainnet.");
  }

  const signers = await ethers.getSigners();
  const deployer = signers[0];
  const chainId = (await ethers.provider.getNetwork()).chainId;

  let setting: NetworkSetting;
  let safe: string;
  let partner: string | undefined;

  if (rehearsal) {
    const MockStable = await ethers.getContractFactory("MockStable");
    const usdc = await MockStable.deploy("USD Coin", "USDC", 6);
    const usdt = await MockStable.deploy("Tether USD", "USDT", 6);
    setting = {
      tokens: [
        { symbol: "USDC", address: await usdc.getAddress(), decimals: 6 },
        { symbol: "USDT", address: await usdt.getAddress(), decimals: 6 },
      ],
      maxPayout: 32_000n,
      dailyLimit: 65_000n,
    };
    safe = signers[1].address;
    partner = signers[2].address;
  } else {
    const found = NETWORKS[network.name];
    if (!found) throw new Error(`No Loan Registry settings for network ${network.name}`);
    setting = found;
    safe = requireAddress(process.env.LOAN_SAFE_ADDRESS ?? found.safe, "LOAN_SAFE_ADDRESS");
    partner = process.env.PARTNER_DEPOSIT_ADDRESS
      ? requireAddress(process.env.PARTNER_DEPOSIT_ADDRESS, "PARTNER_DEPOSIT_ADDRESS")
      : undefined;
  }
  const minTrancheWhole = BigInt(process.env.LOAN_MIN_TRANCHE ?? "0");
  if (minTrancheWhole > setting.maxPayout) throw new Error("LOAN_MIN_TRANCHE is above the per-payout limit");
  if (partner && partner === safe) throw new Error("The partner's address cannot be the Safe");

  console.log("Loan Registry v1 deployment");
  console.log("  network   ", network.name, `(chain ${chainId})`);
  console.log("  deployer  ", deployer.address);
  console.log("  safe      ", safe);
  console.log("  partner   ", partner ?? "not set: addDestination left out of the batch");
  console.log();

  const Timelock = await ethers.getContractFactory("TimelockController");
  const timelock = await Timelock.deploy(TIMELOCK_DELAY, [safe], [safe], ethers.ZeroAddress);
  await timelock.waitForDeployment();
  const timelockAddress = await timelock.getAddress();
  console.log("  TimelockController", timelockAddress);

  const LoanRegistry = await ethers.getContractFactory("LoanRegistry");
  const registry = await LoanRegistry.deploy(timelockAddress, safe, MAX_FACILITY_GBP);
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  const deployBlock = (await registry.deploymentTransaction()!.wait())!.blockNumber;
  console.log("  LoanRegistry      ", registryAddress);
  console.log();

  // ---------------------------------------------------------------- post-deploy checks
  const checks: [string, boolean][] = [];
  const roles = {
    admin: await registry.DEFAULT_ADMIN_ROLE(),
    originator: await registry.ORIGINATOR_ROLE(),
    recorder: await registry.RECORDER_ROLE(),
    risk: await registry.RISK_ROLE(),
    distributor: await registry.DISTRIBUTOR_ROLE(),
    guardian: await registry.GUARDIAN_ROLE(),
  };
  checks.push(["timelock holds DEFAULT_ADMIN_ROLE", await registry.hasRole(roles.admin, timelockAddress)]);
  checks.push(["Safe does not hold DEFAULT_ADMIN_ROLE", !(await registry.hasRole(roles.admin, safe))]);
  for (const [name, role] of Object.entries(roles)) {
    if (name !== "admin") checks.push([`Safe holds ${name}`, await registry.hasRole(role, safe)]);
    checks.push([`deployer holds no ${name} role`, !(await registry.hasRole(role, deployer.address))]);
  }
  checks.push(["registry.safe() is the Safe", (await registry.safe()) === safe]);
  checks.push(["maxFacilityGbp is 50,000.00", (await registry.maxFacilityGbp()) === MAX_FACILITY_GBP]);
  checks.push(["maxFeeBps is 5,000", (await registry.maxFeeBps()) === 5_000n]);
  checks.push(["Safe is an approved destination", await registry.approvedDestination(safe)]);
  checks.push(["registry not paused", !(await registry.paused())]);
  checks.push(["timelock delay is 48 hours", (await timelock.getMinDelay()) === BigInt(TIMELOCK_DELAY)]);
  const tlAdmin = await timelock.TIMELOCK_ADMIN_ROLE();
  checks.push(["deployer is not timelock admin", !(await timelock.hasRole(tlAdmin, deployer.address))]);
  checks.push(["Safe is not timelock admin", !(await timelock.hasRole(tlAdmin, safe))]);
  checks.push(["Safe is proposer", await timelock.hasRole(await timelock.PROPOSER_ROLE(), safe)]);
  checks.push(["Safe is executor", await timelock.hasRole(await timelock.EXECUTOR_ROLE(), safe)]);
  checks.push(["Safe is canceller", await timelock.hasRole(await timelock.CANCELLER_ROLE(), safe)]);

  // ---------------------------------------------------------------- the timelock batch
  const targets: string[] = [];
  const payloads: string[] = [];
  const labels: string[] = [];
  for (const t of setting.tokens) {
    const maxPayout = units(setting.maxPayout, t.decimals);
    const daily = units(setting.dailyLimit, t.decimals);
    targets.push(registryAddress);
    payloads.push(registry.interface.encodeFunctionData("allowToken", [t.address, MIN_RATE_BPS, MAX_RATE_BPS, maxPayout, daily]));
    labels.push(`allowToken(${t.symbol}, band 1.10 to 1.50, ${setting.maxPayout} per payout, ${setting.dailyLimit} per day)`);
    if (minTrancheWhole > 0n) {
      targets.push(registryAddress);
      payloads.push(registry.interface.encodeFunctionData("setMinTranche", [t.address, units(minTrancheWhole, t.decimals)]));
      labels.push(`setMinTranche(${t.symbol}, ${minTrancheWhole})`);
    }
  }
  if (partner) {
    targets.push(registryAddress);
    payloads.push(registry.interface.encodeFunctionData("addDestination", [partner]));
    labels.push(`addDestination(partner ${partner})`);
  }
  const values = targets.map(() => 0n);
  const predecessor = ethers.ZeroHash;
  const salt = ethers.id(`fvc.loan-registry.v1.setup.${registryAddress}`);
  const operationId = await timelock.hashOperationBatch(targets, values, payloads, predecessor, salt);
  const scheduleData = timelock.interface.encodeFunctionData("scheduleBatch", [targets, values, payloads, predecessor, salt, TIMELOCK_DELAY]);
  const executeData = timelock.interface.encodeFunctionData("executeBatch", [targets, values, payloads, predecessor, salt]);

  console.log("Timelock batch (operation", operationId + ")");
  labels.forEach((l, i) => console.log(`  ${i + 1}. ${l}`));
  console.log();

  if (rehearsal) {
    const safeSigner = signers[1];
    await (await safeSigner.sendTransaction({ to: timelockAddress, data: scheduleData })).wait();
    let earlyReverted = false;
    try {
      await safeSigner.sendTransaction({ to: timelockAddress, data: executeData });
    } catch {
      earlyReverted = true;
    }
    checks.push(["execute before 48 hours reverts", earlyReverted]);
    await ethers.provider.send("evm_increaseTime", [TIMELOCK_DELAY]);
    await ethers.provider.send("evm_mine", []);
    await (await safeSigner.sendTransaction({ to: timelockAddress, data: executeData })).wait();
    checks.push(["batch executed", await timelock.isOperationDone(operationId)]);
    for (const t of setting.tokens) {
      const cfg = await registry.tokenConfig(t.address);
      checks.push([`${t.symbol} allowed with its decimals`, cfg.allowed && Number(cfg.decimals) === t.decimals]);
      checks.push([`${t.symbol} daily limit set`, cfg.dailyLimit === units(setting.dailyLimit, t.decimals)]);
    }
    checks.push(["partner approved", await registry.approvedDestination(partner!)]);

    const usdc = await ethers.getContractAt("MockStable", setting.tokens[0].address);
    const asSafe = registry.connect(safeSigner);
    await (await usdc.mint(safe, units(1_000n, 6))).wait();
    await (await usdc.connect(safeSigner).approve(registryAddress, units(127n, 6))).wait();
    await (await asSafe.createLoan(ethers.id("agreement"), ethers.id("sme"), 1_000_00n, 0n)).wait();
    await (await asSafe.recordDisbursement(1n, 100_00n, setting.tokens[0].address, units(127n, 6), ethers.id("payout"), partner!)).wait();
    checks.push(["smoke tranche reached the partner", (await usdc.balanceOf(partner!)) === units(127n, 6)]);
  } else {
    const outDir = path.join(__dirname, "..", "safe-batches", `loan-registry-${network.name}`);
    fs.mkdirSync(outDir, { recursive: true });
    const batch = (name: string, description: string, data: string) => ({
      version: "1.0",
      chainId: chainId.toString(),
      createdAt: Date.now(),
      meta: { name, description, txBuilderVersion: "1.16.5" },
      transactions: [{ to: timelockAddress, value: "0", data }],
    });
    fs.writeFileSync(
      path.join(outDir, "1-schedule.json"),
      JSON.stringify(batch("Loan Registry: schedule setup", labels.join("; "), scheduleData), null, 2),
    );
    fs.writeFileSync(
      path.join(outDir, "2-execute-after-48h.json"),
      JSON.stringify(batch("Loan Registry: execute setup", `Operation ${operationId}`, executeData), null, 2),
    );
    fs.writeFileSync(
      path.join(outDir, "timelock-args.js"),
      `module.exports = [${TIMELOCK_DELAY}, ["${safe}"], ["${safe}"], "${ethers.ZeroAddress}"];\n`,
    );
    fs.writeFileSync(
      path.join(outDir, "deployment.json"),
      JSON.stringify(
        { network: network.name, chainId: chainId.toString(), timelock: timelockAddress, registry: registryAddress, deployBlock, safe, partner: partner ?? null, operationId, salt },
        null,
        2,
      ),
    );
    console.log("Safe batches written to", outDir);
    console.log();
    console.log("Verify on Etherscan:");
    console.log(`  npx hardhat verify --network ${network.name} --constructor-args ${path.join(outDir, "timelock-args.js")} ${timelockAddress}`);
    console.log(`  npx hardhat verify --network ${network.name} ${registryAddress} ${timelockAddress} ${safe} ${MAX_FACILITY_GBP}`);
    console.log();
    console.log("Then, in order:");
    console.log("  1. Compare both contracts' bytecode with the tagged commit's build.");
    console.log("  2. Signers check every line of 1-schedule.json on a second device, then sign.");
    console.log("  3. Watch the CallScheduled events; anyone may cancel through the Safe during the 48 hours.");
    console.log("  4. After 48 hours, sign 2-execute-after-48h.json.");
    console.log("  5. Re-read tokenConfig, minTranche and approvedDestination; set monitoring alerts (plan S10).");
  }

  console.log();
  console.log("Checks");
  let failed = 0;
  for (const [name, ok] of checks) {
    console.log(`  ${ok ? "pass" : "FAIL"}  ${name}`);
    if (!ok) failed++;
  }
  if (failed > 0) {
    throw new Error(`${failed} post-deploy check(s) failed`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
