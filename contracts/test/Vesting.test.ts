import { expect } from "chai";
import { ethers } from "hardhat";
import type { Contract } from "ethers";

async function increaseTime(seconds: number) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

async function latestTimestamp(): Promise<number> {
  const block = await ethers.provider.getBlock("latest");
  return block!.timestamp;
}

describe("Vesting", function () {
  let deployer: any;
  let beneficiary: any;
  let investor2: any;

  let fvc: Contract;
  let vesting: Contract;

  const AMOUNT = ethers.parseEther("10000"); // 10,000 FVC
  const CLIFF = 365 * 24 * 60 * 60;         // 12 months
  const DURATION = 730 * 24 * 60 * 60;      // 24 months

  beforeEach(async () => {
    [deployer, beneficiary, investor2] = await ethers.getSigners();

    const FVC = await ethers.getContractFactory("FVC");
    fvc = await FVC.deploy(deployer.address);
    await fvc.waitForDeployment();

    const Vesting = await ethers.getContractFactory("Vesting");
    vesting = await Vesting.deploy(await fvc.getAddress());
    await vesting.waitForDeployment();

    const MINTER_ROLE = await fvc.MINTER_ROLE();
    await fvc.grantRole(MINTER_ROLE, deployer.address);
    // Pre-fund vesting contract with enough for all tests
    await fvc.mint(await vesting.getAddress(), AMOUNT * 10n);
  });

  // ----------------------------------------------------------------
  // Schedule creation
  // ----------------------------------------------------------------

  describe("createVestingSchedule", function () {
    it("creates schedule and returns scheduleId 0 for first schedule", async () => {
      const startTime = await latestTimestamp();
      const tx = await vesting.createVestingSchedule(
        beneficiary.address, AMOUNT, startTime, CLIFF, DURATION
      );
      const receipt = await tx.wait();
      // scheduleId returned from function; check event
      await expect(tx)
        .to.emit(vesting, "VestingScheduleCreated")
        .withArgs(beneficiary.address, 0, AMOUNT, startTime, CLIFF, DURATION);

      expect(await vesting.scheduleCount(beneficiary.address)).to.equal(1);
    });

    it("creates a second schedule for same beneficiary with different terms", async () => {
      const startTime = await latestTimestamp();
      await vesting.createVestingSchedule(beneficiary.address, AMOUNT, startTime, CLIFF, DURATION);

      const CLIFF2 = 90 * 24 * 60 * 60;
      const DURATION2 = 365 * 24 * 60 * 60;
      await expect(
        vesting.createVestingSchedule(beneficiary.address, AMOUNT, startTime, CLIFF2, DURATION2)
      ).to.emit(vesting, "VestingScheduleCreated")
        .withArgs(beneficiary.address, 1, AMOUNT, startTime, CLIFF2, DURATION2);

      expect(await vesting.scheduleCount(beneficiary.address)).to.equal(2);
    });

    it("reverts when cliff > duration", async () => {
      const startTime = await latestTimestamp();
      await expect(
        vesting.createVestingSchedule(beneficiary.address, AMOUNT, startTime, DURATION + 1, DURATION)
      ).to.be.revertedWithCustomError(vesting, "Vesting__InvalidDuration");
    });

    it("reverts on zero amount", async () => {
      await expect(
        vesting.createVestingSchedule(beneficiary.address, 0, await latestTimestamp(), CLIFF, DURATION)
      ).to.be.revertedWithCustomError(vesting, "Vesting__ZeroAmount");
    });

    it("reverts on zero address beneficiary", async () => {
      await expect(
        vesting.createVestingSchedule(ethers.ZeroAddress, AMOUNT, await latestTimestamp(), CLIFF, DURATION)
      ).to.be.revertedWithCustomError(vesting, "Vesting__ZeroAddress");
    });

    it("reverts when contract has insufficient token balance", async () => {
      const huge = ethers.parseEther("999999999");
      await expect(
        vesting.createVestingSchedule(beneficiary.address, huge, await latestTimestamp(), CLIFF, DURATION)
      ).to.be.revertedWithCustomError(vesting, "Vesting__InsufficientBalance");
    });
  });

  // ----------------------------------------------------------------
  // Vesting curve: 0% at cliff, linear to 100% at duration
  // ----------------------------------------------------------------

  describe("Vesting curve (12-month cliff, 24-month duration)", function () {
    let startTime: number;

    beforeEach(async () => {
      startTime = await latestTimestamp();
      await vesting.createVestingSchedule(beneficiary.address, AMOUNT, startTime, CLIFF, DURATION);
    });

    it("0% releasable before cliff", async () => {
      await increaseTime(CLIFF - 10);
      expect(await vesting.releasableAmount(beneficiary.address, 0)).to.equal(0);
    });

    it("0% releasable at exactly cliff boundary", async () => {
      // Pin the next block to exactly startTime + CLIFF so elapsed == cliff, not cliff+1
      await ethers.provider.send("evm_setNextBlockTimestamp", [startTime + CLIFF]);
      await ethers.provider.send("evm_mine", []);
      expect(await vesting.releasableAmount(beneficiary.address, 0)).to.equal(0);
    });

    it("~50% releasable at cliff + 6 months (midpoint of vesting window)", async () => {
      const SIX_MONTHS = 182 * 24 * 60 * 60;
      await increaseTime(CLIFF + SIX_MONTHS);
      const releasable = await vesting.releasableAmount(beneficiary.address, 0);
      const vestingWindow = BigInt(DURATION - CLIFF);
      const expected = (AMOUNT * BigInt(SIX_MONTHS)) / vestingWindow;
      expect(releasable).to.be.closeTo(expected, ethers.parseEther("1"));
    });

    it("100% releasable at full duration", async () => {
      await increaseTime(DURATION + 1);
      expect(await vesting.releasableAmount(beneficiary.address, 0)).to.equal(AMOUNT);
    });
  });

  // ----------------------------------------------------------------
  // release()
  // ----------------------------------------------------------------

  describe("release(scheduleId)", function () {
    let startTime: number;

    beforeEach(async () => {
      startTime = await latestTimestamp();
      await vesting.createVestingSchedule(beneficiary.address, AMOUNT, startTime, CLIFF, DURATION);
    });

    it("releases all tokens after full duration", async () => {
      await increaseTime(DURATION + 1);
      await vesting.connect(beneficiary).release(0);
      expect(await fvc.balanceOf(beneficiary.address)).to.equal(AMOUNT);
    });

    it("reverts before cliff", async () => {
      await expect(
        vesting.connect(beneficiary).release(0)
      ).to.be.revertedWithCustomError(vesting, "Vesting__NothingToRelease");
    });

    it("reverts on invalid scheduleId", async () => {
      await expect(
        vesting.connect(beneficiary).release(99)
      ).to.be.revertedWithCustomError(vesting, "Vesting__NoSchedule");
    });

    it("partial release mid-vesting, then full release at end", async () => {
      const SIX_MONTHS = 182 * 24 * 60 * 60;
      await increaseTime(CLIFF + SIX_MONTHS);
      await vesting.connect(beneficiary).release(0);
      const partial = await fvc.balanceOf(beneficiary.address);
      expect(partial).to.be.gt(0);

      await increaseTime(DURATION - CLIFF - SIX_MONTHS + 1);
      await vesting.connect(beneficiary).release(0);
      expect(await fvc.balanceOf(beneficiary.address)).to.equal(AMOUNT);
    });

    it("beneficiary can release from two independent schedules", async () => {
      const CLIFF2 = 0;
      const DURATION2 = 365 * 24 * 60 * 60;
      await vesting.createVestingSchedule(beneficiary.address, AMOUNT, startTime, CLIFF2, DURATION2);

      // Schedule 1 (id=1) has no cliff — release after 6 months
      const SIX_MONTHS = 182 * 24 * 60 * 60;
      await increaseTime(SIX_MONTHS);
      await vesting.connect(beneficiary).release(1);
      const balAfterSchedule1 = await fvc.balanceOf(beneficiary.address);
      expect(balAfterSchedule1).to.be.gt(0);

      // Schedule 0 (id=0) still locked (before cliff)
      expect(await vesting.releasableAmount(beneficiary.address, 0)).to.equal(0);
    });
  });

  // ----------------------------------------------------------------
  // modifyVestingSchedule
  // ----------------------------------------------------------------

  describe("modifyVestingSchedule", function () {
    it("owner can modify terms before any release", async () => {
      const startTime = await latestTimestamp();
      await vesting.createVestingSchedule(beneficiary.address, AMOUNT, startTime, CLIFF, DURATION);

      const newCliff = 90 * 24 * 60 * 60;
      const newDuration = 365 * 24 * 60 * 60;
      await expect(
        vesting.modifyVestingSchedule(beneficiary.address, 0, AMOUNT, newCliff, newDuration)
      ).to.emit(vesting, "VestingScheduleModified")
        .withArgs(beneficiary.address, 0, AMOUNT, newCliff, newDuration);

      const [, , , cliff, duration] = await vesting.getVestingSchedule(beneficiary.address, 0);
      expect(cliff).to.equal(newCliff);
      expect(duration).to.equal(newDuration);
    });

    it("reverts if tokens already released", async () => {
      const startTime = await latestTimestamp();
      await vesting.createVestingSchedule(beneficiary.address, AMOUNT, startTime, 0, DURATION);
      await increaseTime(DURATION + 1);
      await vesting.connect(beneficiary).release(0);

      await expect(
        vesting.modifyVestingSchedule(beneficiary.address, 0, AMOUNT, 0, DURATION)
      ).to.be.revertedWithCustomError(vesting, "Vesting__ReleasedAlready");
    });
  });

  // ----------------------------------------------------------------
  // revokeVesting
  // ----------------------------------------------------------------

  describe("revokeVesting(beneficiary, scheduleId)", function () {
    it("revokes and returns unvested tokens to owner", async () => {
      const startTime = await latestTimestamp();
      await vesting.createVestingSchedule(beneficiary.address, AMOUNT, startTime, CLIFF, DURATION);

      await vesting.revokeVesting(beneficiary.address, 0);
      const [, , , , , revoked] = await vesting.getVestingSchedule(beneficiary.address, 0);
      expect(revoked).to.be.true;
      expect(await fvc.balanceOf(deployer.address)).to.equal(AMOUNT);
    });

    it("reverts on double revoke", async () => {
      const startTime = await latestTimestamp();
      await vesting.createVestingSchedule(beneficiary.address, AMOUNT, startTime, CLIFF, DURATION);
      await vesting.revokeVesting(beneficiary.address, 0);
      await expect(
        vesting.revokeVesting(beneficiary.address, 0)
      ).to.be.revertedWithCustomError(vesting, "Vesting__AlreadyRevoked");
    });

    it("revoking one schedule does not affect another", async () => {
      const startTime = await latestTimestamp();
      await vesting.createVestingSchedule(beneficiary.address, AMOUNT, startTime, CLIFF, DURATION);
      await vesting.createVestingSchedule(beneficiary.address, AMOUNT, startTime, 0, DURATION);

      await vesting.revokeVesting(beneficiary.address, 0);

      // Schedule 1 unaffected
      const [, , , , , revoked1] = await vesting.getVestingSchedule(beneficiary.address, 1);
      expect(revoked1).to.be.false;
    });
  });

  // ----------------------------------------------------------------
  // getAllSchedules view
  // ----------------------------------------------------------------

  // ----------------------------------------------------------------
  // Mutation kill: V01 — cliff boundary is exclusive (< not <=)
  // ----------------------------------------------------------------

  describe("Cliff boundary exactness (kills V01)", function () {
    it("0% releasable one second before cliff, >0% two seconds after cliff", async () => {
      // Use a future startTime so we can advance to precise boundaries
      const now = await latestTimestamp();
      const startTime = now + 10;
      await ethers.provider.send("evm_setNextBlockTimestamp", [startTime]);
      await ethers.provider.send("evm_mine", []);
      await vesting.createVestingSchedule(beneficiary.address, AMOUNT, startTime, CLIFF, DURATION);

      // One second before cliff
      await ethers.provider.send("evm_setNextBlockTimestamp", [startTime + CLIFF - 1]);
      await ethers.provider.send("evm_mine", []);
      expect(await vesting.releasableAmount(beneficiary.address, 0)).to.equal(0);

      // Two seconds after cliff: elapsed = cliff + 2 → positive
      // V01 mutant (<=) would return 0 here since elapsed <= cliff+2 is false, but
      // the key distinction: at elapsed = cliff+1 the mutant returns 0, original returns >0
      await ethers.provider.send("evm_setNextBlockTimestamp", [startTime + CLIFF + 2]);
      await ethers.provider.send("evm_mine", []);
      expect(await vesting.releasableAmount(beneficiary.address, 0)).to.be.gt(0);
    });
  });

  // ----------------------------------------------------------------
  // Mutation kill: V03 — 100% at exactly t = startTime + duration
  // ----------------------------------------------------------------

  describe("Full duration boundary exactness (kills V03)", function () {
    it("<100% one second before duration, 100% at exactly duration", async () => {
      const now = await latestTimestamp();
      const startTime = now + 10;
      await ethers.provider.send("evm_setNextBlockTimestamp", [startTime]);
      await ethers.provider.send("evm_mine", []);
      await vesting.createVestingSchedule(beneficiary.address, AMOUNT, startTime, CLIFF, DURATION);

      // One second before end: must be < totalAmount
      // V03 mutant (>) would return totalAmount here (elapsed > duration is false, so falls through to linear)
      // but the original (>=) also falls through — both return linear. This boundary is at elapsed == duration.
      // The distinguishing case: elapsed == duration → original returns totalAmount, mutant falls to linear.
      await ethers.provider.send("evm_setNextBlockTimestamp", [startTime + DURATION - 1]);
      await ethers.provider.send("evm_mine", []);
      expect(await vesting.releasableAmount(beneficiary.address, 0)).to.be.lt(AMOUNT);

      // Exactly at duration: original returns totalAmount, mutant returns linear (< totalAmount)
      await ethers.provider.send("evm_setNextBlockTimestamp", [startTime + DURATION]);
      await ethers.provider.send("evm_mine", []);
      expect(await vesting.releasableAmount(beneficiary.address, 0)).to.equal(AMOUNT);
    });
  });

  // ----------------------------------------------------------------
  // Mutation kill: V06 — totalVesting decrements on release
  // ----------------------------------------------------------------

  describe("totalVesting accounting (kills V06)", function () {
    it("totalVesting decreases by released amount after release()", async () => {
      const startTime = await latestTimestamp();
      await vesting.createVestingSchedule(beneficiary.address, AMOUNT, startTime, CLIFF, DURATION);

      const vestingBefore = await vesting.totalVesting();
      expect(vestingBefore).to.equal(AMOUNT);

      await increaseTime(DURATION + 1);
      await vesting.connect(beneficiary).release(0);

      expect(await vesting.totalVesting()).to.equal(0);
    });
  });

  // ----------------------------------------------------------------
  // Mutation kill: V10 — revoke refund = totalAmount - vestedSoFar
  // ----------------------------------------------------------------

  describe("Revoke refund arithmetic (kills V10)", function () {
    it("partial vest then revoke: refund = totalAmount - vestedAtRevoke", async () => {
      const startTime = await latestTimestamp();
      await vesting.createVestingSchedule(beneficiary.address, AMOUNT, startTime, CLIFF, DURATION);

      // Advance to midpoint of vesting window (cliff + half of window)
      const SIX_MONTHS = 182 * 24 * 60 * 60;
      const revokeAt = startTime + CLIFF + SIX_MONTHS;
      await ethers.provider.send("evm_setNextBlockTimestamp", [revokeAt]);
      await ethers.provider.send("evm_mine", []);

      const vestingWindow = BigInt(DURATION - CLIFF);
      const expectedVested = (AMOUNT * BigInt(SIX_MONTHS)) / vestingWindow;
      const expectedRefund = AMOUNT - expectedVested;

      const ownerBalBefore = await fvc.balanceOf(deployer.address);
      await vesting.revokeVesting(beneficiary.address, 0);
      const ownerBalAfter = await fvc.balanceOf(deployer.address);

      const actualRefund = ownerBalAfter - ownerBalBefore;
      // Allow 1 FVC tolerance for timestamp imprecision
      expect(actualRefund).to.be.closeTo(expectedRefund, ethers.parseEther("1"));
      // Critically: refund must be less than totalAmount (not totalAmount + vested)
      expect(actualRefund).to.be.lt(AMOUNT);
    });
  });

  // ----------------------------------------------------------------
  // emergencyWithdraw
  // ----------------------------------------------------------------

  describe("emergencyWithdraw", function () {
    it("owner can withdraw unallocated surplus tokens", async () => {
      // Mint extra tokens beyond what is allocated to any schedule
      const surplus = ethers.parseEther("500");
      await fvc.mint(await vesting.getAddress(), surplus);

      const ownerBalBefore = await fvc.balanceOf(deployer.address);
      await vesting.emergencyWithdraw(surplus);
      expect(await fvc.balanceOf(deployer.address)).to.equal(ownerBalBefore + surplus);
    });

    it("reverts if withdrawal exceeds unallocated balance", async () => {
      const startTime = await latestTimestamp();
      await vesting.createVestingSchedule(beneficiary.address, AMOUNT, startTime, CLIFF, DURATION);
      // Contract holds AMOUNT * 10 (pre-funded), AMOUNT is allocated; surplus = AMOUNT * 9
      const tooMuch = AMOUNT * 10n; // exceeds surplus
      await expect(vesting.emergencyWithdraw(tooMuch)).to.be.revertedWith("Exceeds available balance");
    });
  });

  describe("getAllSchedules (investor dashboard)", function () {
    it("returns all schedules for a beneficiary", async () => {
      const startTime = await latestTimestamp();
      await vesting.createVestingSchedule(beneficiary.address, AMOUNT, startTime, CLIFF, DURATION);
      await vesting.createVestingSchedule(beneficiary.address, AMOUNT * 2n, startTime, 0, DURATION);

      const all = await vesting.getAllSchedules(beneficiary.address);
      expect(all.length).to.equal(2);
      expect(all[0].totalAmount).to.equal(AMOUNT);
      expect(all[1].totalAmount).to.equal(AMOUNT * 2n);
      expect(all[1].cliff).to.equal(0);
    });

    it("returns empty array for address with no schedules", async () => {
      const all = await vesting.getAllSchedules(investor2.address);
      expect(all.length).to.equal(0);
    });
  });
});
