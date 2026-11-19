import { ethers } from "hardhat";
import { expect } from "chai";
import {
  Fixture,
  TimelockFixture,
  Status,
  DAY,
  TIMELOCK_DELAY,
  MIN_RATE_BPS,
  MAX_RATE_BPS,
  MAX_FACILITY_GBP,
  MAX_PAYOUT,
  DAILY_LIMIT,
  USDC,
  pow10,
  gbp,
  tokenFor,
  ref,
  agreement,
  smeRef,
  missingRole,
  increaseTime,
  toNextUtcDay,
  loadUnitFixture,
  resetFixtureCache,
  deployWithTimelock,
  viaTimelock,
  onboardToken,
  createLoan,
  disburse,
  repay,
  deposit,
} from "./helpers/loanRegistryFixture";

/**
 * LoanRegistry v1: security controls (contracts/LOAN_REGISTRY.md sections 5 to 7, INVARIANTS S1 to S12).
 *
 * Written first in phase S2; fails with HH700 until the contract exists.
 *
 * MUTATION GUARDS killed here:
 *   L25 destination check on tranche   L26 on release        L27 on forward
 *   L28 per-loan facility limit        L29 per-payout limit  L30 daily limit
 *   L31 band lower bound               L32 band upper bound  L33 measured balance equals amount
 *   L34 guardian cannot unpause        L35 raising limits is admin only
 *   L36 stored decimals used in band   L37 recoverSurplus bounded by surplus
 */

describe("LoanRegistry security", function () {
  before(resetFixtureCache);

  let fx: Fixture;
  let usdcAddr: string;
  let registryAddr: string;

  async function setup() {
    fx = await loadUnitFixture();
    usdcAddr = await fx.usdc.getAddress();
    registryAddr = await fx.registry.getAddress();
    return fx;
  }

  // ------------------------------------------------------------------ timelock (real 48 hour delay)

  describe("timelock", () => {
    let tl: TimelockFixture;
    const call = (fn: string, args: unknown[]) => tl.registry.interface.encodeFunctionData(fn as any, args as any);

    it("is the only holder of DEFAULT_ADMIN_ROLE; the Safe and the deployer are not admins", async () => {
      tl = await deployWithTimelock();
      expect(await tl.registry.hasRole(tl.roles.admin, await tl.timelock.getAddress())).to.equal(true);
      expect(await tl.registry.hasRole(tl.roles.admin, tl.safe.address)).to.equal(false);
      expect(await tl.registry.hasRole(tl.roles.admin, tl.admin.address)).to.equal(false);
    });

    it("the Safe cannot call admin functions directly", async () => {
      tl = await deployWithTimelock();
      await expect(tl.registry.connect(tl.safe).addDestination(tl.partner.address)).to.be.revertedWith(
        missingRole(tl.safe.address, tl.roles.admin)
      );
    });

    it("an admin change executes only after 48 hours", async () => {
      tl = await deployWithTimelock();
      const target = await tl.registry.getAddress();
      const data = call("addDestination", [tl.partner.address]);
      await tl.timelock.connect(tl.safe).schedule(target, 0, data, ethers.ZeroHash, ethers.ZeroHash, TIMELOCK_DELAY);
      await increaseTime(TIMELOCK_DELAY - 60);
      await expect(tl.timelock.connect(tl.safe).execute(target, 0, data, ethers.ZeroHash, ethers.ZeroHash)).to.be.revertedWith(
        "TimelockController: operation is not ready"
      );
      await increaseTime(60);
      await tl.timelock.connect(tl.safe).execute(target, 0, data, ethers.ZeroHash, ethers.ZeroHash);
      expect(await tl.registry.approvedDestination(tl.partner.address)).to.equal(true);
    });

    it("the Safe can cancel a queued change before it runs", async () => {
      tl = await deployWithTimelock();
      const target = await tl.registry.getAddress();
      const data = call("addDestination", [tl.outsider.address]);
      await tl.timelock.connect(tl.safe).schedule(target, 0, data, ethers.ZeroHash, ethers.ZeroHash, TIMELOCK_DELAY);
      const id = await tl.timelock.hashOperation(target, 0, data, ethers.ZeroHash, ethers.ZeroHash);
      await tl.timelock.connect(tl.safe).cancel(id);
      await increaseTime(TIMELOCK_DELAY);
      await expect(tl.timelock.connect(tl.safe).execute(target, 0, data, ethers.ZeroHash, ethers.ZeroHash)).to.be.revertedWith(
        "TimelockController: operation is not ready"
      );
      expect(await tl.registry.approvedDestination(tl.outsider.address)).to.equal(false);
    });

    it("nobody but the Safe can queue or execute", async () => {
      tl = await deployWithTimelock();
      const target = await tl.registry.getAddress();
      const data = call("addDestination", [tl.outsider.address]);
      await expect(
        tl.timelock.connect(tl.outsider).schedule(target, 0, data, ethers.ZeroHash, ethers.ZeroHash, TIMELOCK_DELAY)
      ).to.be.reverted;
      await tl.timelock.connect(tl.safe).schedule(target, 0, data, ethers.ZeroHash, ethers.ZeroHash, TIMELOCK_DELAY);
      await increaseTime(TIMELOCK_DELAY);
      await expect(tl.timelock.connect(tl.outsider).execute(target, 0, data, ethers.ZeroHash, ethers.ZeroHash)).to.be
        .reverted;
    });

    it("onboards a token and a destination, then a full loan runs end to end", async () => {
      tl = await deployWithTimelock();
      const usdc = await tl.usdc.getAddress();
      await viaTimelock(tl, call("allowToken", [usdc, MIN_RATE_BPS, MAX_RATE_BPS, MAX_PAYOUT, DAILY_LIMIT]), ref("t1"));
      await viaTimelock(tl, call("addDestination", [tl.partner.address]), ref("t2"));
      const id = await createLoan(tl, gbp(10_000n));
      await disburse(tl, id, gbp(10_000n), "1");
      await repay(tl, id, gbp(10_000n), "1");
      expect((await tl.registry.loans(id)).status).to.equal(Status.Repaid);
    });

    it("unpausing waits 48 hours and the Safe can cancel a queued unpause", async () => {
      tl = await deployWithTimelock();
      await tl.registry.connect(tl.safe).pause();
      await expect(tl.registry.connect(tl.safe).unpause()).to.be.revertedWith(missingRole(tl.safe.address, tl.roles.admin));

      const target = await tl.registry.getAddress();
      const data = call("unpause", []);
      await tl.timelock.connect(tl.safe).schedule(target, 0, data, ethers.ZeroHash, ref("u1"), TIMELOCK_DELAY);
      const id = await tl.timelock.hashOperation(target, 0, data, ethers.ZeroHash, ref("u1"));
      await tl.timelock.connect(tl.safe).cancel(id);
      expect(await tl.registry.paused()).to.equal(true);

      await viaTimelock(tl, data, ref("u2"));
      expect(await tl.registry.paused()).to.equal(false);
    });

    it("recoverSurplus runs through the timelock and pays the Safe", async () => {
      tl = await deployWithTimelock();
      await tl.usdc.mint(await tl.registry.getAddress(), USDC(100n));
      const before = await tl.usdc.balanceOf(tl.safe.address);
      await viaTimelock(tl, call("recoverSurplus", [await tl.usdc.getAddress()]));
      expect(await tl.usdc.balanceOf(tl.safe.address)).to.equal(before + USDC(100n));
    });
  });

  // ------------------------------------------------------------------ guardian (reduce only, S8)

  describe("guardian", () => {
    it("pauses, and cannot unpause (kills L34)", async () => {
      await setup();
      await expect(fx.registry.connect(fx.safe).pause()).to.emit(fx.registry, "Paused").withArgs(fx.safe.address);
      await expect(fx.registry.connect(fx.safe).unpause()).to.be.revertedWith(missingRole(fx.safe.address, fx.roles.admin));
      await expect(fx.registry.connect(fx.safe).pause()).to.be.revertedWith("Pausable: paused");
    });

    it("removes a destination at once, but never the Safe", async () => {
      await setup();
      await expect(fx.registry.connect(fx.safe).removeDestination(fx.partner.address))
        .to.emit(fx.registry, "DestinationRemoved")
        .withArgs(fx.partner.address);
      expect(await fx.registry.approvedDestination(fx.partner.address)).to.equal(false);
      await expect(fx.registry.connect(fx.safe).removeDestination(fx.safe.address)).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__CannotRemoveSafe"
      );
      await expect(fx.registry.connect(fx.safe).removeDestination(fx.partner.address)).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__DestinationNotApproved"
      );
    });

    it("disallows a token but keeps its configuration known", async () => {
      await setup();
      await expect(fx.registry.connect(fx.safe).disallowToken(usdcAddr))
        .to.emit(fx.registry, "TokenDisallowed")
        .withArgs(usdcAddr);
      const config = await fx.registry.tokenConfig(usdcAddr);
      expect(config.allowed).to.equal(false);
      expect(config.known).to.equal(true);
      await expect(fx.registry.connect(fx.safe).disallowToken(usdcAddr)).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__TokenNotAllowed"
      );
    });

    it("lowers token limits, and cannot raise them (kills L35)", async () => {
      await setup();
      await expect(fx.registry.connect(fx.safe).lowerTokenLimits(usdcAddr, USDC(10_000n), USDC(20_000n)))
        .to.emit(fx.registry, "TokenLimitsSet")
        .withArgs(usdcAddr, USDC(10_000n), USDC(20_000n));
      await expect(
        fx.registry.connect(fx.safe).lowerTokenLimits(usdcAddr, USDC(10_001n), USDC(20_000n))
      ).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__NotALowering");
      await expect(
        fx.registry.connect(fx.safe).lowerTokenLimits(usdcAddr, USDC(10_000n), USDC(20_001n))
      ).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__NotALowering");
      await expect(fx.registry.connect(fx.safe).setTokenLimits(usdcAddr, MAX_PAYOUT, DAILY_LIMIT)).to.be.revertedWith(
        missingRole(fx.safe.address, fx.roles.admin)
      );
    });

    it("lowers the per-loan limit, and cannot raise it", async () => {
      await setup();
      await expect(fx.registry.connect(fx.safe).lowerMaxFacility(gbp(25_000n)))
        .to.emit(fx.registry, "MaxFacilitySet")
        .withArgs(gbp(25_000n));
      await expect(fx.registry.connect(fx.safe).lowerMaxFacility(gbp(25_001n))).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__NotALowering"
      );
      await expect(fx.registry.connect(fx.safe).setMaxFacility(MAX_FACILITY_GBP)).to.be.revertedWith(
        missingRole(fx.safe.address, fx.roles.admin)
      );
    });

    it("cannot add destinations, allow tokens, change bands or recover surplus", async () => {
      await setup();
      const deny = missingRole(fx.safe.address, fx.roles.admin);
      await expect(fx.registry.connect(fx.safe).addDestination(fx.other.address)).to.be.revertedWith(deny);
      await expect(
        fx.registry.connect(fx.safe).allowToken(usdcAddr, MIN_RATE_BPS, MAX_RATE_BPS, MAX_PAYOUT, DAILY_LIMIT)
      ).to.be.revertedWith(deny);
      await expect(fx.registry.connect(fx.safe).setRateBand(usdcAddr, 10_000n, 20_000n)).to.be.revertedWith(deny);
      await expect(fx.registry.connect(fx.safe).recoverSurplus(usdcAddr)).to.be.revertedWith(deny);
      await expect(fx.registry.connect(fx.safe).grantRole(fx.roles.guardian, fx.other.address)).to.be.revertedWith(deny);
    });

    it("reduce-only controls and admin configuration still work while paused (S9)", async () => {
      await setup();
      await fx.registry.connect(fx.safe).pause();
      await fx.registry.connect(fx.safe).removeDestination(fx.partner.address);
      await fx.registry.connect(fx.safe).lowerTokenLimits(usdcAddr, USDC(1_000n), USDC(2_000n));
      await fx.registry.connect(fx.safe).lowerMaxFacility(gbp(1_000n));
      await fx.registry.connect(fx.safe).disallowToken(usdcAddr);
      await fx.registry.connect(fx.admin).addDestination(fx.other.address);
      await fx.registry.connect(fx.admin).setRateBand(usdcAddr, 11_500n, 14_000n);
      await fx.registry.connect(fx.admin).unpause();
      expect(await fx.registry.paused()).to.equal(false);
    });

    it("an outsider holds none of these powers", async () => {
      await setup();
      const guardian = missingRole(fx.outsider.address, fx.roles.guardian);
      const admin = missingRole(fx.outsider.address, fx.roles.admin);
      await expect(fx.registry.connect(fx.outsider).pause()).to.be.revertedWith(guardian);
      await expect(fx.registry.connect(fx.outsider).removeDestination(fx.partner.address)).to.be.revertedWith(guardian);
      await expect(fx.registry.connect(fx.outsider).disallowToken(usdcAddr)).to.be.revertedWith(guardian);
      await expect(fx.registry.connect(fx.outsider).lowerTokenLimits(usdcAddr, 0n, 0n)).to.be.revertedWith(guardian);
      await expect(fx.registry.connect(fx.outsider).lowerMaxFacility(0n)).to.be.revertedWith(guardian);
      await expect(fx.registry.connect(fx.outsider).unpause()).to.be.revertedWith(admin);
      await expect(fx.registry.connect(fx.outsider).addDestination(fx.outsider.address)).to.be.revertedWith(admin);
      await expect(fx.registry.connect(fx.outsider).setMaxFacility(1n)).to.be.revertedWith(admin);
      await expect(fx.registry.connect(fx.outsider).recoverSurplus(usdcAddr)).to.be.revertedWith(admin);
    });
  });

  // ------------------------------------------------------------------ admin configuration checks

  describe("admin configuration", () => {
    it("allowToken validates the band, the limits and the address", async () => {
      await setup();
      const MockStable = await ethers.getContractFactory("MockStable");
      const token = await (await MockStable.deploy("GBP Coin", "GBPC", 6)).getAddress();
      const allow = (min: bigint, max: bigint, payout: bigint, daily: bigint, t = token) =>
        fx.registry.connect(fx.admin).allowToken(t, min, max, payout, daily);
      await expect(allow(0n, 10_200n, USDC(1n), USDC(2n))).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__InvalidRateBand"
      );
      await expect(allow(10_200n, 9_800n, USDC(1n), USDC(2n))).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__InvalidRateBand"
      );
      await expect(allow(9_800n, 10_200n, USDC(3n), USDC(2n))).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__InvalidLimits"
      );
      await expect(allow(9_800n, 10_200n, USDC(1n), USDC(2n), ethers.ZeroAddress)).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__ZeroAddress"
      );
      await expect(allow(9_800n, 10_200n, USDC(25_000n), USDC(50_000n)))
        .to.emit(fx.registry, "TokenAllowed")
        .withArgs(token, 6n, 9_800n, 10_200n, USDC(25_000n), USDC(50_000n));
    });

    it("re-allows a disallowed token", async () => {
      await setup();
      await fx.registry.connect(fx.safe).disallowToken(usdcAddr);
      await fx.registry.connect(fx.admin).allowToken(usdcAddr, MIN_RATE_BPS, MAX_RATE_BPS, MAX_PAYOUT, DAILY_LIMIT);
      expect((await fx.registry.tokenConfig(usdcAddr)).allowed).to.equal(true);
    });

    it("setRateBand and setTokenLimits need a known token and valid values", async () => {
      await setup();
      const stranger = ethers.Wallet.createRandom().address;
      await expect(fx.registry.connect(fx.admin).setRateBand(stranger, 11_000n, 15_000n)).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__TokenUnknown"
      );
      await expect(fx.registry.connect(fx.admin).setTokenLimits(stranger, 1n, 2n)).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__TokenUnknown"
      );
      await expect(fx.registry.connect(fx.admin).setRateBand(usdcAddr, 15_000n, 11_000n)).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__InvalidRateBand"
      );
      await expect(fx.registry.connect(fx.admin).setTokenLimits(usdcAddr, 3n, 2n)).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__InvalidLimits"
      );
      await expect(fx.registry.connect(fx.admin).setRateBand(usdcAddr, 12_000n, 14_000n))
        .to.emit(fx.registry, "RateBandSet")
        .withArgs(usdcAddr, 12_000n, 14_000n);
    });

    it("addDestination rejects zero and duplicates; setMaxFacility rejects zero", async () => {
      await setup();
      await expect(fx.registry.connect(fx.admin).addDestination(ethers.ZeroAddress)).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__ZeroAddress"
      );
      await expect(fx.registry.connect(fx.admin).addDestination(fx.partner.address)).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__DestinationAlreadyApproved"
      );
      await expect(fx.registry.connect(fx.admin).addDestination(fx.other.address))
        .to.emit(fx.registry, "DestinationAdded")
        .withArgs(fx.other.address);
      await expect(fx.registry.connect(fx.admin).setMaxFacility(0n)).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__ZeroAmount"
      );
    });
  });

  // ------------------------------------------------------------------ approved destinations (S1)

  describe("approved destinations", () => {
    it("tranche to an unapproved address reverts (kills L25)", async () => {
      await setup();
      const id = await createLoan(fx);
      await expect(
        fx.registry
          .connect(fx.safe)
          .recordDisbursement(id, gbp(1_000n), usdcAddr, tokenFor(gbp(1_000n)), ref("p"), fx.outsider.address)
      ).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__DestinationNotApproved");
    });

    it("release to an unapproved address reverts (kills L26)", async () => {
      await setup();
      const id = await createLoan(fx, gbp(10_000n));
      await disburse(fx, id, gbp(10_000n), "1");
      await deposit(fx, id, gbp(1_000n), "1");
      await repay(fx, id, gbp(10_000n), "1");
      await expect(
        fx.registry.connect(fx.safe).releaseCollateral(id, usdcAddr, tokenFor(gbp(1_000n)), fx.outsider.address)
      ).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__DestinationNotApproved");
    });

    it("forward to an unapproved address reverts (kills L27)", async () => {
      await setup();
      const id = await createLoan(fx);
      await disburse(fx, id, gbp(10_000n), "1");
      await repay(fx, id, gbp(1_000n), "1");
      await expect(fx.registry.connect(fx.safe).forward(usdcAddr, 1n, fx.outsider.address)).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__DestinationNotApproved"
      );
    });

    it("a removed destination stops receiving at once", async () => {
      await setup();
      const id = await createLoan(fx);
      await disburse(fx, id, gbp(1_000n), "1");
      await fx.registry.connect(fx.safe).removeDestination(fx.partner.address);
      await expect(disburse(fx, id, gbp(1_000n), "2")).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__DestinationNotApproved"
      );
    });
  });

  // ------------------------------------------------------------------ limits (S2, S3)

  describe("limits", () => {
    it("createLoan above the per-loan limit reverts; the admin can raise it (kills L28)", async () => {
      await setup();
      await expect(
        fx.registry.connect(fx.safe).createLoan(agreement(), smeRef(), MAX_FACILITY_GBP + 1n, 0n)
      ).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__MaxFacilityExceeded");
      await fx.registry.connect(fx.admin).setMaxFacility(MAX_FACILITY_GBP * 2n);
      await fx.registry.connect(fx.safe).createLoan(agreement(), smeRef(), MAX_FACILITY_GBP + 1n, 0n);
    });

    it("a transfer one unit over the per-payout limit reverts; exactly the limit passes (kills L29)", async () => {
      await setup();
      const id = await createLoan(fx);
      await expect(
        fx.registry
          .connect(fx.safe)
          .recordDisbursement(id, gbp(25_000n), usdcAddr, MAX_PAYOUT + 1n, ref("over"), fx.partner.address)
      ).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__PayoutLimitExceeded");
      await fx.registry
        .connect(fx.safe)
        .recordDisbursement(id, gbp(25_000n), usdcAddr, MAX_PAYOUT, ref("exact"), fx.partner.address);
    });

    it("the per-payout limit also binds release and forward", async () => {
      await setup();
      await fx.registry.connect(fx.safe).lowerTokenLimits(usdcAddr, USDC(1_000n), DAILY_LIMIT);
      const id = await createLoan(fx, gbp(500n));
      await disburse(fx, id, gbp(500n), "1");
      await deposit(fx, id, gbp(1_000n), "1");
      await repay(fx, id, gbp(500n), "1");
      await expect(
        fx.registry.connect(fx.safe).releaseCollateral(id, usdcAddr, tokenFor(gbp(1_000n)), fx.safe.address)
      ).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__PayoutLimitExceeded");

      const id2 = await createLoan(fx, gbp(2_000n), 0n, "2");
      await fx.registry.connect(fx.admin).setTokenLimits(usdcAddr, MAX_PAYOUT, DAILY_LIMIT);
      await disburse(fx, id2, gbp(2_000n), "2");
      await repay(fx, id2, gbp(2_000n), "2");
      await fx.registry.connect(fx.safe).lowerTokenLimits(usdcAddr, USDC(1_000n), DAILY_LIMIT);
      await expect(
        fx.registry.connect(fx.safe).forward(usdcAddr, USDC(1_000n) + 1n, fx.safe.address)
      ).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__PayoutLimitExceeded");
    });

    it("outflow past the daily limit reverts and succeeds the next UTC day (kills L30)", async () => {
      await setup();
      await toNextUtcDay();
      const a = await createLoan(fx, gbp(50_000n), 0n, "a");
      const b = await createLoan(fx, gbp(50_000n), 0n, "b");
      await disburse(fx, a, gbp(25_000n), "a1");
      await disburse(fx, a, gbp(25_000n), "a2");
      expect(await fx.registry.outflowUsedToday(usdcAddr)).to.equal(tokenFor(gbp(50_000n)));
      await expect(disburse(fx, b, gbp(2_000n), "b1")).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__DailyLimitExceeded"
      );
      await toNextUtcDay();
      expect(await fx.registry.outflowUsedToday(usdcAddr)).to.equal(0n);
      await disburse(fx, b, gbp(2_000n), "b1");
    });

    it("limits are tracked per token", async () => {
      await setup();
      await toNextUtcDay();
      const a = await createLoan(fx, gbp(50_000n), 0n, "a");
      const b = await createLoan(fx, gbp(50_000n), 0n, "b");
      await disburse(fx, a, gbp(25_000n), "a1");
      await disburse(fx, a, gbp(25_000n), "a2");
      await disburse(fx, b, gbp(25_000n), "b1", fx.usdt);
      expect(await fx.registry.outflowUsedToday(await fx.usdt.getAddress())).to.equal(tokenFor(gbp(25_000n)));
    });

    it("lowering the daily limit mid-day takes effect at once", async () => {
      await setup();
      await toNextUtcDay();
      const id = await createLoan(fx);
      await disburse(fx, id, gbp(10_000n), "1");
      await fx.registry.connect(fx.safe).lowerTokenLimits(usdcAddr, MAX_PAYOUT, tokenFor(gbp(10_000n)));
      await expect(disburse(fx, id, gbp(1n), "2")).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__DailyLimitExceeded"
      );
    });

    it("repayments and collateral deposits do not use the outflow limit", async () => {
      await setup();
      await toNextUtcDay();
      const id = await createLoan(fx);
      await disburse(fx, id, gbp(25_000n), "1");
      const used = await fx.registry.outflowUsedToday(usdcAddr);
      await repay(fx, id, gbp(25_000n), "1");
      await deposit(fx, id, gbp(10_000n), "1");
      expect(await fx.registry.outflowUsedToday(usdcAddr)).to.equal(used);
    });

    it("the daily limit resets at 00:00 UTC, not 24 hours after the first outflow", async () => {
      await setup();
      await toNextUtcDay(DAY - 120);
      const a = await createLoan(fx, gbp(50_000n), 0n, "a");
      await disburse(fx, a, gbp(25_000n), "a1");
      await disburse(fx, a, gbp(25_000n), "a2");
      await toNextUtcDay(1);
      const b = await createLoan(fx, gbp(50_000n), 0n, "b");
      await disburse(fx, b, gbp(25_000n), "b1");
    });
  });

  // ------------------------------------------------------------------ rate band (S4)

  describe("rate band", () => {
    const pence = gbp(1_000n);
    const minAmount = tokenFor(pence, MIN_RATE_BPS);
    const maxAmount = tokenFor(pence, MAX_RATE_BPS);

    async function loanWithRoom() {
      const id = await createLoan(fx);
      await disburse(fx, id, gbp(20_000n), "room");
      return id;
    }

    it("accepts amounts exactly at both edges", async () => {
      await setup();
      const id = await loanWithRoom();
      await fx.registry.connect(fx.safe).recordRepayment(id, pence, usdcAddr, minAmount, ref("lo"));
      await fx.registry.connect(fx.safe).recordRepayment(id, pence, usdcAddr, maxAmount, ref("hi"));
    });

    it("rejects one unit under the lower edge (kills L31)", async () => {
      await setup();
      const id = await loanWithRoom();
      await expect(
        fx.registry.connect(fx.safe).recordRepayment(id, pence, usdcAddr, minAmount - 1n, ref("lo"))
      ).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__RateOutOfBand");
    });

    it("rejects one unit over the upper edge (kills L32)", async () => {
      await setup();
      const id = await loanWithRoom();
      await expect(
        fx.registry.connect(fx.safe).recordRepayment(id, pence, usdcAddr, maxAmount + 1n, ref("hi"))
      ).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__RateOutOfBand");
    });

    it("a changed band applies to the next call", async () => {
      await setup();
      const id = await loanWithRoom();
      await fx.registry.connect(fx.admin).setRateBand(usdcAddr, 12_000n, 13_000n);
      await expect(
        fx.registry.connect(fx.safe).recordRepayment(id, pence, usdcAddr, minAmount, ref("old-edge"))
      ).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__RateOutOfBand");
    });

    it("checks claimCollateral too", async () => {
      await setup();
      const id = await loanWithRoom();
      await deposit(fx, id, gbp(5_000n), "c");
      await fx.registry.connect(fx.safe).markDefault(id);
      await expect(
        fx.registry.connect(fx.safe).claimCollateral(id, usdcAddr, tokenFor(gbp(1_000n)), gbp(10n), ref("cl"))
      ).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__RateOutOfBand");
    });

    it("uses each token's stored decimals (kills L36)", async () => {
      await setup();
      const MockStable = await ethers.getContractFactory("MockStable");
      const dai = await MockStable.deploy("Dai", "DAI", 18);
      await onboardToken(fx, dai, 18n);
      const daiAddr = await dai.getAddress();
      expect((await fx.registry.tokenConfig(daiAddr)).decimals).to.equal(18n);

      const id = await loanWithRoom();
      await fx.registry.connect(fx.safe).recordRepayment(id, pence, daiAddr, tokenFor(pence, 12_700n, 18n), ref("ok"));
      await expect(
        fx.registry.connect(fx.safe).recordRepayment(id, pence, daiAddr, tokenFor(pence, 12_700n, 6n), ref("bad"))
      ).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__RateOutOfBand");
    });
  });

  // ------------------------------------------------------------------ token behaviour (S5, S6, S11)

  describe("token behaviour", () => {
    it("a fee-on-transfer token is rejected on every inflow (kills L33)", async () => {
      await setup();
      const Fee = await ethers.getContractFactory("MockFeeOnTransferToken");
      const fee = await Fee.deploy(100n);
      await onboardToken(fx, fee);
      const feeAddr = await fee.getAddress();
      const id = await createLoan(fx);
      await disburse(fx, id, gbp(10_000n), "1");

      await expect(
        fx.registry.connect(fx.safe).recordRepayment(id, gbp(1_000n), feeAddr, tokenFor(gbp(1_000n)), ref("r"))
      ).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__BalanceMismatch");
      await expect(
        fx.registry.connect(fx.safe).depositCollateral(id, feeAddr, tokenFor(gbp(1_000n)), gbp(1_000n), ref("c"))
      ).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__BalanceMismatch");
      await expect(
        fx.registry
          .connect(fx.safe)
          .recordDisbursement(id, gbp(1_000n), feeAddr, tokenFor(gbp(1_000n)), ref("p"), fx.partner.address)
      ).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__BalanceMismatch");
    });

    it("a token that returns false instead of reverting is rejected", async () => {
      await setup();
      const False = await ethers.getContractFactory("MockFalseReturnToken");
      const bad = await False.deploy();
      await onboardToken(fx, bad);
      await bad.setFailing(true);
      const id = await createLoan(fx);
      await disburse(fx, id, gbp(10_000n), "1");
      await expect(
        fx.registry
          .connect(fx.safe)
          .recordRepayment(id, gbp(1_000n), await bad.getAddress(), tokenFor(gbp(1_000n)), ref("r"))
      ).to.be.revertedWith("SafeERC20: ERC20 operation did not succeed");
      expect((await fx.registry.loans(id)).repaidGbp).to.equal(0n);
    });

    it("a token callback cannot re-enter a function that moves tokens", async () => {
      await setup();
      const Reentrant = await ethers.getContractFactory("MockReentrantToken");
      const evil = await Reentrant.deploy();
      await onboardToken(fx, evil);
      const evilAddr = await evil.getAddress();
      for (const role of [fx.roles.recorder, fx.roles.distributor, fx.roles.originator]) {
        await fx.registry.connect(fx.admin).grantRole(role, evilAddr);
      }
      const id = await createLoan(fx);
      await disburse(fx, id, gbp(10_000n), "1");

      const reenter = fx.registry.interface.encodeFunctionData("recordRepayment", [
        id,
        gbp(1_000n),
        evilAddr,
        tokenFor(gbp(1_000n)),
        ref("inner"),
      ]);
      await evil.arm(registryAddr, reenter);
      await expect(
        fx.registry.connect(fx.safe).recordRepayment(id, gbp(1_000n), evilAddr, tokenFor(gbp(1_000n)), ref("outer"))
      ).to.be.revertedWith("ReentrancyGuard: reentrant call");
    });

    it("pulls only from the caller, never from another address that approved the registry (S6)", async () => {
      await setup();
      await fx.usdc.mint(fx.other.address, USDC(100_000n));
      await fx.usdc.connect(fx.other).approve(registryAddr, ethers.MaxUint256);
      const otherBefore = await fx.usdc.balanceOf(fx.other.address);
      const id = await createLoan(fx);
      await disburse(fx, id, gbp(10_000n), "1");
      await repay(fx, id, gbp(1_000n), "1");
      expect(await fx.usdc.balanceOf(fx.other.address)).to.equal(otherBefore);
    });

    it("a frozen registry blocks outflows but keeps every balance accounted for", async () => {
      await setup();
      const Block = await ethers.getContractFactory("MockBlacklistToken");
      const frozen = await Block.deploy();
      await onboardToken(fx, frozen);
      const frozenAddr = await frozen.getAddress();
      const id = await createLoan(fx);
      await disburse(fx, id, gbp(10_000n), "1");
      await repay(fx, id, gbp(1_000n), "1", frozen);
      await frozen.setBlacklisted(registryAddr, true);
      await expect(fx.registry.connect(fx.safe).forward(frozenAddr, 1n, fx.safe.address)).to.be.revertedWith("Blacklisted");
      expect(await fx.registry.totalReceived(frozenAddr)).to.equal(tokenFor(gbp(1_000n)));
      expect(await fx.registry.totalForwarded(frozenAddr)).to.equal(0n);
    });
  });

  // ------------------------------------------------------------------ recoverSurplus and solvency (S10)

  describe("recoverSurplus", () => {
    it("moves only tokens the registry does not owe, always to the Safe (kills L37)", async () => {
      await setup();
      const id = await createLoan(fx);
      await disburse(fx, id, gbp(10_000n), "1");
      await repay(fx, id, gbp(4_000n), "1");
      await deposit(fx, id, gbp(2_000n), "1");
      const owed = tokenFor(gbp(4_000n)) + tokenFor(gbp(2_000n));
      await fx.usdc.mint(registryAddr, USDC(123n));

      expect(await fx.registry.surplus(usdcAddr)).to.equal(USDC(123n));
      const safeBefore = await fx.usdc.balanceOf(fx.safe.address);
      await expect(fx.registry.connect(fx.admin).recoverSurplus(usdcAddr))
        .to.emit(fx.registry, "SurplusRecovered")
        .withArgs(usdcAddr, USDC(123n));
      expect(await fx.usdc.balanceOf(fx.safe.address)).to.equal(safeBefore + USDC(123n));
      expect(await fx.usdc.balanceOf(registryAddr)).to.equal(owed);
      await expect(fx.registry.connect(fx.admin).recoverSurplus(usdcAddr)).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__NoSurplus"
      );
    });

    it("recovers the whole balance of a token that was never allowed", async () => {
      await setup();
      const MockStable = await ethers.getContractFactory("MockStable");
      const stray = await MockStable.deploy("Stray", "STR", 18);
      await stray.mint(registryAddr, pow10(18n));
      await fx.registry.connect(fx.admin).recoverSurplus(await stray.getAddress());
      expect(await stray.balanceOf(fx.safe.address)).to.equal(pow10(18n));
    });

    it("is not counted against the outflow limits", async () => {
      await setup();
      await toNextUtcDay();
      await fx.usdc.mint(registryAddr, DAILY_LIMIT * 2n);
      await fx.registry.connect(fx.admin).recoverSurplus(usdcAddr);
      expect(await fx.registry.outflowUsedToday(usdcAddr)).to.equal(0n);
    });

    it("keeps the registry solvent across a mixed sequence", async () => {
      await setup();
      const usdtAddr = await fx.usdt.getAddress();
      const a = await createLoan(fx, gbp(20_000n), gbp(200n), "a");
      const b = await createLoan(fx, gbp(10_000n), 0n, "b");
      await disburse(fx, a, gbp(20_000n), "a");
      await disburse(fx, b, gbp(5_000n), "b", fx.usdt);
      await deposit(fx, a, gbp(2_000n), "a");
      await deposit(fx, b, gbp(1_000n), "b", fx.usdt);
      await repay(fx, a, gbp(5_000n), "a1");
      await repay(fx, a, gbp(3_000n), "a2", fx.usdt);
      await repay(fx, b, gbp(1_000n), "b1", fx.usdt);
      await fx.registry.connect(fx.safe).forward(usdcAddr, tokenFor(gbp(4_000n)), fx.safe.address);
      await fx.registry.connect(fx.safe).markDefault(b);
      await fx.registry
        .connect(fx.safe)
        .claimCollateral(b, usdtAddr, tokenFor(gbp(1_000n)), gbp(1_000n), ref("claim-b"));

      for (const [token, addr] of [
        [fx.usdc, usdcAddr],
        [fx.usdt, usdtAddr],
      ] as const) {
        const held =
          (await fx.registry.totalReceived(addr)) -
          (await fx.registry.totalForwarded(addr)) +
          (await fx.registry.totalCollateralHeld(addr));
        expect(await token.balanceOf(registryAddr)).to.be.gte(held);
        expect(await fx.registry.surplus(addr)).to.equal((await token.balanceOf(registryAddr)) - held);
      }
    });
  });

  // ------------------------------------------------------------------ pause (S9)

  describe("pause", () => {
    it("blocks every function that moves tokens or changes a loan", async () => {
      await setup();
      const id = await createLoan(fx);
      await disburse(fx, id, gbp(10_000n), "1");
      await deposit(fx, id, gbp(1_000n), "1");
      await repay(fx, id, gbp(1_000n), "1");
      await fx.registry.connect(fx.safe).pause();
      const s = fx.registry.connect(fx.safe);
      const paused = "Pausable: paused";
      await expect(s.createLoan(agreement("p"), smeRef("p"), gbp(1_000n), 0n)).to.be.revertedWith(paused);
      await expect(disburse(fx, id, gbp(1_000n), "2")).to.be.revertedWith(paused);
      await expect(s.closeFacility(id)).to.be.revertedWith(paused);
      await expect(repay(fx, id, gbp(1_000n), "2")).to.be.revertedWith(paused);
      await expect(deposit(fx, id, gbp(1_000n), "2")).to.be.revertedWith(paused);
      await expect(s.markDefault(id)).to.be.revertedWith(paused);
      await expect(s.cure(id)).to.be.revertedWith(paused);
      await expect(s.writeOff(id)).to.be.revertedWith(paused);
      await expect(s.claimCollateral(id, usdcAddr, 1n, 1n, ref("c"))).to.be.revertedWith(paused);
      await expect(s.releaseCollateral(id, usdcAddr, 1n, fx.safe.address)).to.be.revertedWith(paused);
      await expect(s.forward(usdcAddr, 1n, fx.safe.address)).to.be.revertedWith(paused);
    });

    it("after unpause, normal operation resumes", async () => {
      await setup();
      const id = await createLoan(fx);
      await fx.registry.connect(fx.safe).pause();
      await fx.registry.connect(fx.admin).unpause();
      await disburse(fx, id, gbp(1_000n), "1");
      expect((await fx.registry.loans(id)).disbursedGbp).to.equal(gbp(1_000n));
    });

    it("unpause reverts when not paused", async () => {
      await setup();
      await expect(fx.registry.connect(fx.admin).unpause()).to.be.revertedWith("Pausable: not paused");
    });
  });
});
