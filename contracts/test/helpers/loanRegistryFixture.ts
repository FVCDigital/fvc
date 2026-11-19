import { ethers } from "hardhat";
import type { ILoanRegistry, IAccessControl } from "../../typechain-types";

/**
 * Shared deployment for the LoanRegistry suites (spec: contracts/LOAN_REGISTRY.md).
 *
 * The unit fixture uses a plain account as DEFAULT_ADMIN_ROLE so admin calls are one line.
 * The security suite deploys the real 48 hour TimelockController instead (deployWithTimelock).
 * The contract does not check that its admin is a timelock, so both are valid deployments.
 */

export type Registry = ILoanRegistry &
  Pick<IAccessControl, "hasRole" | "grantRole" | "revokeRole" | "renounceRole" | "getRoleAdmin"> & {
    paused(): Promise<boolean>;
    DEFAULT_ADMIN_ROLE(): Promise<string>;
    connect(signer: any): Registry;
  };

export const Status = { Active: 0n, Repaid: 1n, Defaulted: 2n, WrittenOff: 3n } as const;

export const DAY = 24 * 60 * 60;
export const TIMELOCK_DELAY = 48 * 60 * 60;

export const MIN_RATE_BPS = 11_000n;
export const MAX_RATE_BPS = 15_000n;
export const RATE_BPS = 12_700n; // 1.27 USDC per £1
export const MAX_FEE_BPS = 5_000n; // fee at most half the facility (decided 19 Nov)

/** 10^n as a bigint; `**` on bigints breaks under the default TypeScript target. */
export const pow10 = (n: bigint) => BigInt(`1${"0".repeat(Number(n))}`);

export const USDC = (whole: bigint) => whole * pow10(6n);
export const gbp = (pounds: bigint) => pounds * 100n; // pence

export const MAX_FACILITY_GBP = gbp(50_000n);
export const MAX_PAYOUT = USDC(32_000n);
export const DAILY_LIMIT = USDC(65_000n);

/** Token amount for `pence` at `rateBps`, in a token with `decimals` (section 5.1). */
export function tokenFor(pence: bigint, rateBps: bigint = RATE_BPS, decimals = 6n): bigint {
  return (pence * rateBps * pow10(decimals)) / 1_000_000n;
}

export const ref = (label: string) => ethers.id(label);
export const agreement = (label = "agreement-1") => ethers.id(`agreement:${label}`);
export const smeRef = (label = "sme-1", salt = "salt-1") =>
  ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["bytes32", "bytes32"], [ethers.id(label), ethers.id(salt)]));

export function missingRole(account: string, role: string): string {
  return `AccessControl: account ${account.toLowerCase()} is missing role ${role}`;
}

export async function increaseTime(seconds: number): Promise<void> {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

export async function latestTimestamp(): Promise<number> {
  const block = await ethers.provider.getBlock("latest");
  return block!.timestamp;
}

/** Moves to `seconds` after the next 00:00 UTC. */
export async function toNextUtcDay(seconds = 60): Promise<void> {
  const now = await latestTimestamp();
  const next = (Math.floor(now / DAY) + 1) * DAY + seconds;
  await ethers.provider.send("evm_setNextBlockTimestamp", [next]);
  await ethers.provider.send("evm_mine", []);
}

export interface Fixture {
  registry: Registry;
  usdc: any;
  usdt: any;
  admin: any;
  safe: any;
  outsider: any;
  partner: any;
  other: any;
  roles: { originator: string; recorder: string; risk: string; distributor: string; guardian: string; admin: string };
}

async function deployTokens() {
  const MockStable = await ethers.getContractFactory("MockStable");
  const usdc: any = await MockStable.deploy("USD Coin", "USDC", 6);
  const usdt: any = await MockStable.deploy("Tether USD", "USDT", 6);
  return { usdc, usdt };
}

async function readRoles(registry: Registry) {
  return {
    originator: await registry.ORIGINATOR_ROLE(),
    recorder: await registry.RECORDER_ROLE(),
    risk: await registry.RISK_ROLE(),
    distributor: await registry.DISTRIBUTOR_ROLE(),
    guardian: await registry.GUARDIAN_ROLE(),
    admin: await registry.DEFAULT_ADMIN_ROLE(),
  };
}

/** Allows a token with the default band and pilot limits, funds the Safe and approves the registry. */
export async function onboardToken(fx: Pick<Fixture, "registry" | "admin" | "safe">, token: any, decimals = 6n) {
  const scale = pow10(decimals);
  await fx.registry
    .connect(fx.admin)
    .allowToken(await token.getAddress(), MIN_RATE_BPS, MAX_RATE_BPS, 32_000n * scale, 65_000n * scale);
  await token.mint(fx.safe.address, 10_000_000n * scale);
  await token.connect(fx.safe).approve(await fx.registry.getAddress(), ethers.MaxUint256);
}

async function deployUnit(): Promise<Fixture> {
  const [admin, safe, outsider, partner, other] = await ethers.getSigners();
  const { usdc, usdt } = await deployTokens();

  const LoanRegistry = await ethers.getContractFactory("LoanRegistry");
  const registry = (await LoanRegistry.deploy(admin.address, safe.address, MAX_FACILITY_GBP)) as unknown as Registry;
  await registry.waitForDeployment();

  const fx = { registry, usdc, usdt, admin, safe, outsider, partner, other } as Fixture;
  await onboardToken(fx, usdc);
  await onboardToken(fx, usdt);
  await registry.connect(admin).addDestination(partner.address);
  fx.roles = await readRoles(registry);
  return fx;
}

let snapshot: string | undefined;
let cached: Fixture | undefined;

/**
 * Deploys once per test file and reverts to a snapshot on every later call, so each test starts
 * from the same state and fails on its own while the contract does not exist.
 */
export async function loadUnitFixture(): Promise<Fixture> {
  if (snapshot && cached) {
    await ethers.provider.send("evm_revert", [snapshot]);
    snapshot = await ethers.provider.send("evm_snapshot", []);
    return cached;
  }
  cached = await deployUnit();
  snapshot = await ethers.provider.send("evm_snapshot", []);
  return cached;
}

/** Resets the cache; call from a root `before` in each test file. */
export function resetFixtureCache(): void {
  snapshot = undefined;
  cached = undefined;
}

export interface TimelockFixture extends Fixture {
  timelock: any;
}

/** Real deployment shape: TimelockController (48h, Safe as proposer, executor, canceller, no admin). */
export async function deployWithTimelock(): Promise<TimelockFixture> {
  const [deployer, safe, outsider, partner, other] = await ethers.getSigners();
  const { usdc, usdt } = await deployTokens();

  const Timelock = await ethers.getContractFactory("TimelockController");
  const timelock = await Timelock.deploy(TIMELOCK_DELAY, [safe.address], [safe.address], ethers.ZeroAddress);
  await timelock.waitForDeployment();

  const LoanRegistry = await ethers.getContractFactory("LoanRegistry");
  const registry = (await LoanRegistry.deploy(
    await timelock.getAddress(),
    safe.address,
    MAX_FACILITY_GBP
  )) as unknown as Registry;
  await registry.waitForDeployment();

  for (const token of [usdc, usdt]) {
    await token.mint(safe.address, USDC(10_000_000n));
    await token.connect(safe).approve(await registry.getAddress(), ethers.MaxUint256);
  }

  const fx = { registry, usdc, usdt, admin: deployer, safe, outsider, partner, other, timelock } as TimelockFixture;
  fx.roles = await readRoles(registry);
  return fx;
}

/** Queues, waits 48 hours and executes one admin call through the timelock, as the Safe. */
export async function viaTimelock(fx: TimelockFixture, data: string, salt = ethers.ZeroHash): Promise<void> {
  const target = await fx.registry.getAddress();
  await fx.timelock.connect(fx.safe).schedule(target, 0, data, ethers.ZeroHash, salt, TIMELOCK_DELAY);
  await increaseTime(TIMELOCK_DELAY);
  await fx.timelock.connect(fx.safe).execute(target, 0, data, ethers.ZeroHash, salt);
}

// ------------------------------------------------------------------ call helpers (Safe holds every role)

export async function createLoan(fx: Fixture, facilityGbp = gbp(50_000n), feeGbp = 0n, label = "1"): Promise<bigint> {
  await fx.registry.connect(fx.safe).createLoan(agreement(label), smeRef(label, `salt-${label}`), facilityGbp, feeGbp);
  return await fx.registry.loanCount();
}

export async function disburse(fx: Fixture, loanId: bigint, pence: bigint, label: string, token: any = fx.usdc) {
  return fx.registry
    .connect(fx.safe)
    .recordDisbursement(loanId, pence, await token.getAddress(), tokenFor(pence), ref(`payout:${label}`), fx.partner.address);
}

export async function repay(fx: Fixture, loanId: bigint, pence: bigint, label: string, token: any = fx.usdc) {
  return fx.registry
    .connect(fx.safe)
    .recordRepayment(loanId, pence, await token.getAddress(), tokenFor(pence), ref(`settlement:${label}`));
}

export async function deposit(fx: Fixture, loanId: bigint, pence: bigint, label: string, token: any = fx.usdc) {
  return fx.registry
    .connect(fx.safe)
    .depositCollateral(loanId, await token.getAddress(), tokenFor(pence), pence, ref(`collateral:${label}`));
}
