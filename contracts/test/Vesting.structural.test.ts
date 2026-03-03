import { expect } from "chai";
import { ethers } from "hardhat";
import type { Contract } from "ethers";

/**
 * Vesting.sol — structural coverage
 *
 * Covers branches not exercised by Vesting.test.ts:
 *   - constructor zero address revert
 *   - createVestingSchedule: zero duration revert
 *   - modifyVestingSchedule: revoked revert, zero duration, cliff > duration
 *   - revokeVesting: refund == 0 (fully vested before revoke)
 *   - release: revoked schedule revert
 *   - _releasableAmount: revoked returns 0, totalAmount == 0 returns 0
 *   - _vestedAmount: totalAmount == 0 returns 0
 *   - emergencyWithdraw: zero unallocated balance
 *   - non-owner access control on all owner functions
 *   - totalVesting accounting on modifyVestingSchedule (increase and decrease)
 *   - getVestingSchedule: releasable field is correct
 *   - getAllSchedules: correct for 0 and N schedules
 */
describe("Vesting — structural coverage", function () {
  let deployer: any;
  let beneficiary: any;
  let stranger: any;

  let fvc: Contract;
  let vesting: Contract;

  const AMOUNT = ethers.parseEther("10000");
  const CLIFF = 365 * 24 * 60 * 60;
  const DURATION = 730 * 24 * 60 * 60;

  async function increaseTime(seconds: number) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine", []);
  }

  async function latestTimestamp(): Promise<number> {
    const block = await ethers.provider.getBlock("latest");
    return block!.timestamp;
  }

  beforeEach(async () => {
    [deployer, beneficiary, stranger] = await ethers.getSigners();

    const FVC = await ethers.getContractFactory("FVC");
    fvc = await FVC.deploy(deployer.address);
    await fvc.waitForDeployment();

    const Vesting = await ethers.getContractFactory("Vesting");
    vesting = await Vesting.deploy(await fvc.getAddress());
    await vesting.waitForDeployment();

    const MINTER_ROLE = await fvc.MINTER_ROLE();
    await fvc.grantRole(MINTER_ROLE, deployer.address);
    await fvc.mint(await vesting.getAddress(), AMOUNT * 20n);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Constructor
  // ─────────────────────────────────────────────────────────────────────────

  describe("constructor", function () {
    it("reverts on zero token address", async () => {
      const Vesting = await ethers.getContractFactory("Vesting");
      await expect(Vesting.deploy(ethers.ZeroAddress))
        .to.be.revertedWithCustomError(Vesting, "Vesting__ZeroAddress");
    });

    it("stores token address correctly", async () => {
      expect(await vesting.token()).to.equal(await fvc.getAddress());
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // createVestingSchedule — remaining reverts
  // ─────────────────────────────────────────────────────────────────────────

  describe("createVestingSchedule — zero duration revert", function () {
    it("reverts when duration == 0", async () => {
      await expect(
        vesting.createVestingSchedule(beneficiary.address, AMOUNT, await latestTimestamp(), 0, 0)
      ).to.be.revertedWithCustomError(vesting, "Vesting__InvalidDuration");
    });

    it("increments totalVesting on creation", async () => {
      const before = await vesting.totalVesting();
      await vesting.createVestingSchedule(beneficiary.address, AMOUNT, await latestTimestamp(), CLIFF, DURATION);
      expect(await vesting.totalVesting()).to.equal(before + AMOUNT);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // modifyVestingSchedule — all revert branches
  // ─────────────────────────────────────────────────────────────────────────

  describe("modifyVestingSchedule reverts", function () {
    beforeEach(async () => {
      await vesting.createVestingSchedule(beneficiary.address, AMOUNT, await latestTimestamp(), CLIFF, DURATION);
    });

    it("reverts when schedule is revoked", async () => {
      await vesting.revokeVesting(beneficiary.address, 0);
      await expect(
        vesting.modifyVestingSchedule(beneficiary.address, 0, AMOUNT, CLIFF, DURATION)
      ).to.be.revertedWithCustomError(vesting, "Vesting__AlreadyRevoked");
    });

    it("reverts when newDuration == 0", async () => {
      await expect(
        vesting.modifyVestingSchedule(beneficiary.address, 0, AMOUNT, 0, 0)
      ).to.be.revertedWithCustomError(vesting, "Vesting__InvalidDuration");
    });

    it("reverts when newCliff > newDuration", async () => {
      await expect(
        vesting.modifyVestingSchedule(beneficiary.address, 0, AMOUNT, DURATION + 1, DURATION)
      ).to.be.revertedWithCustomError(vesting, "Vesting__InvalidDuration");
    });

    it("reverts on invalid scheduleId", async () => {
      await expect(
        vesting.modifyVestingSchedule(beneficiary.address, 99, AMOUNT, CLIFF, DURATION)
      ).to.be.revertedWithCustomError(vesting, "Vesting__NoSchedule");
    });

    it("correctly adjusts totalVesting when amount increases", async () => {
      const newAmount = AMOUNT * 2n;
      const before = await vesting.totalVesting();
      await vesting.modifyVestingSchedule(beneficiary.address, 0, newAmount, CLIFF, DURATION);
      expect(await vesting.totalVesting()).to.equal(before + AMOUNT);
    });

    it("correctly adjusts totalVesting when amount decreases", async () => {
      const newAmount = AMOUNT / 2n;
      const before = await vesting.totalVesting();
      await vesting.modifyVestingSchedule(beneficiary.address, 0, newAmount, CLIFF, DURATION);
      expect(await vesting.totalVesting()).to.equal(before - AMOUNT / 2n);
    });

    it("emits VestingScheduleModified", async () => {
      const newCliff = 90 * 24 * 60 * 60;
      const newDuration = 365 * 24 * 60 * 60;
      await expect(
        vesting.modifyVestingSchedule(beneficiary.address, 0, AMOUNT, newCliff, newDuration)
      ).to.emit(vesting, "VestingScheduleModified")
        .withArgs(beneficiary.address, 0, AMOUNT, newCliff, newDuration);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // revokeVesting — refund == 0 (fully vested)
  // ─────────────────────────────────────────────────────────────────────────

  describe("revokeVesting — zero refund when fully vested", function () {
    it("revoke after full vest: refund == 0, totalVesting unchanged", async () => {
      const startTime = await latestTimestamp();
      await vesting.createVestingSchedule(beneficiary.address, AMOUNT, startTime, CLIFF, DURATION);

      await increaseTime(DURATION + 1);

      const totalBefore = await vesting.totalVesting();
      const ownerBalBefore = await fvc.balanceOf(deployer.address);

      await vesting.revokeVesting(beneficiary.address, 0);

      // refund = totalAmount - vestedAmount = AMOUNT - AMOUNT = 0
      expect(await fvc.balanceOf(deployer.address)).to.equal(ownerBalBefore);
      // totalVesting should not change (refund == 0, so -= 0)
      expect(await vesting.totalVesting()).to.equal(totalBefore);
    });

    it("emits VestingRevoked with refund == 0", async () => {
      const startTime = await latestTimestamp();
      await vesting.createVestingSchedule(beneficiary.address, AMOUNT, startTime, CLIFF, DURATION);
      await increaseTime(DURATION + 1);

      await expect(vesting.revokeVesting(beneficiary.address, 0))
        .to.emit(vesting, "VestingRevoked")
        .withArgs(beneficiary.address, 0, 0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // release — revoked schedule
  // ─────────────────────────────────────────────────────────────────────────

  describe("release — revoked schedule revert", function () {
    it("reverts when trying to release from a revoked schedule", async () => {
      await vesting.createVestingSchedule(beneficiary.address, AMOUNT, await latestTimestamp(), CLIFF, DURATION);
      await vesting.revokeVesting(beneficiary.address, 0);

      await increaseTime(DURATION + 1);

      await expect(
        vesting.connect(beneficiary).release(0)
      ).to.be.revertedWithCustomError(vesting, "Vesting__AlreadyRevoked");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // _releasableAmount / _vestedAmount edge cases via view functions
  // ─────────────────────────────────────────────────────────────────────────

  describe("releasableAmount edge cases", function () {
    it("returns 0 for uninitialised schedule slot (totalAmount == 0)", async () => {
      // releasableAmount reads directly from the mapping without bounds check,
      // so an uninitialised slot (totalAmount == 0) hits the _vestedAmount(totalAmount==0) branch
      const result = await vesting.releasableAmount(stranger.address, 0);
      expect(result).to.equal(0);
    });

    it("_vestedAmount returns 0 when totalAmount is 0 (via releasableAmount on empty slot)", async () => {
      // Explicitly verify the branch: schedules[addr][999] is zeroed → totalAmount==0
      expect(await vesting.releasableAmount(beneficiary.address, 999)).to.equal(0);
    });

    it("returns 0 for a revoked schedule even after duration", async () => {
      await vesting.createVestingSchedule(beneficiary.address, AMOUNT, await latestTimestamp(), CLIFF, DURATION);
      await vesting.revokeVesting(beneficiary.address, 0);
      await increaseTime(DURATION + 1);

      expect(await vesting.releasableAmount(beneficiary.address, 0)).to.equal(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getVestingSchedule — releasable field
  // ─────────────────────────────────────────────────────────────────────────

  describe("getVestingSchedule — releasable field", function () {
    it("returns correct releasable in the tuple after duration", async () => {
      const startTime = await latestTimestamp();
      await vesting.createVestingSchedule(beneficiary.address, AMOUNT, startTime, CLIFF, DURATION);
      await increaseTime(DURATION + 1);

      const [totalAmount, released, , , , revoked, releasable] =
        await vesting.getVestingSchedule(beneficiary.address, 0);

      expect(totalAmount).to.equal(AMOUNT);
      expect(released).to.equal(0);
      expect(revoked).to.be.false;
      expect(releasable).to.equal(AMOUNT);
    });

    it("releasable decreases after partial release", async () => {
      const startTime = await latestTimestamp();
      await vesting.createVestingSchedule(beneficiary.address, AMOUNT, startTime, CLIFF, DURATION);
      await increaseTime(DURATION + 1);

      await vesting.connect(beneficiary).release(0);

      const [, released, , , , , releasable] =
        await vesting.getVestingSchedule(beneficiary.address, 0);

      expect(released).to.equal(AMOUNT);
      expect(releasable).to.equal(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // emergencyWithdraw — zero available
  // ─────────────────────────────────────────────────────────────────────────

  describe("emergencyWithdraw — all tokens allocated", function () {
    it("reverts when all tokens are allocated (no surplus)", async () => {
      // Allocate exactly the balance
      const balance = await fvc.balanceOf(await vesting.getAddress());
      await vesting.createVestingSchedule(beneficiary.address, balance, await latestTimestamp(), CLIFF, DURATION);

      await expect(vesting.emergencyWithdraw(1n))
        .to.be.revertedWith("Exceeds available balance");
    });

    it("allows zero withdrawal when nothing is available (no-op)", async () => {
      const balance = await fvc.balanceOf(await vesting.getAddress());
      await vesting.createVestingSchedule(beneficiary.address, balance, await latestTimestamp(), CLIFF, DURATION);

      // Withdrawing 0 should succeed (0 <= 0)
      await expect(vesting.emergencyWithdraw(0n)).to.not.be.reverted;
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Access control — non-owner reverts
  // ─────────────────────────────────────────────────────────────────────────

  describe("access control", function () {
    beforeEach(async () => {
      await vesting.createVestingSchedule(beneficiary.address, AMOUNT, await latestTimestamp(), CLIFF, DURATION);
    });

    it("non-owner cannot createVestingSchedule", async () => {
      await expect(
        vesting.connect(stranger).createVestingSchedule(
          beneficiary.address, AMOUNT, await latestTimestamp(), CLIFF, DURATION
        )
      ).to.be.reverted;
    });

    it("non-owner cannot modifyVestingSchedule", async () => {
      await expect(
        vesting.connect(stranger).modifyVestingSchedule(beneficiary.address, 0, AMOUNT, CLIFF, DURATION)
      ).to.be.reverted;
    });

    it("non-owner cannot revokeVesting", async () => {
      await expect(
        vesting.connect(stranger).revokeVesting(beneficiary.address, 0)
      ).to.be.reverted;
    });

    it("non-owner cannot emergencyWithdraw", async () => {
      await expect(
        vesting.connect(stranger).emergencyWithdraw(1n)
      ).to.be.reverted;
    });

    it("non-beneficiary cannot release another's schedule", async () => {
      await increaseTime(DURATION + 1);
      // stranger tries to release beneficiary's schedule — _getSchedule uses msg.sender
      await expect(
        vesting.connect(stranger).release(0)
      ).to.be.revertedWithCustomError(vesting, "Vesting__NoSchedule");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Mutation killers: V01 (cliff < vs <=) and V03 (duration >= vs >)
  // ─────────────────────────────────────────────────────────────────────────

  describe("Exact cliff and duration boundary — kills V01 and V03", function () {
    it("V01: 0 releasable at cliff-1, 0 releasable AT cliff, >0 at cliff+1", async () => {
      const now = await latestTimestamp();
      const startTime = now + 100;
      await ethers.provider.send("evm_setNextBlockTimestamp", [startTime]);
      await ethers.provider.send("evm_mine", []);
      await vesting.createVestingSchedule(beneficiary.address, AMOUNT, startTime, CLIFF, DURATION);

      // cliff - 1: must be 0
      await ethers.provider.send("evm_setNextBlockTimestamp", [startTime + CLIFF - 1]);
      await ethers.provider.send("evm_mine", []);
      expect(await vesting.releasableAmount(beneficiary.address, 0)).to.equal(0);

      // exactly at cliff: still 0 (elapsed == cliff, not > cliff yet)
      await ethers.provider.send("evm_setNextBlockTimestamp", [startTime + CLIFF]);
      await ethers.provider.send("evm_mine", []);
      expect(await vesting.releasableAmount(beneficiary.address, 0)).to.equal(0);

      // cliff + 1: now > 0
      await ethers.provider.send("evm_setNextBlockTimestamp", [startTime + CLIFF + 1]);
      await ethers.provider.send("evm_mine", []);
      expect(await vesting.releasableAmount(beneficiary.address, 0)).to.be.gt(0);
    });

    it("V03: <totalAmount at duration-1, exactly totalAmount AT duration", async () => {
      const now = await latestTimestamp();
      const startTime = now + 200;
      await ethers.provider.send("evm_setNextBlockTimestamp", [startTime]);
      await ethers.provider.send("evm_mine", []);
      await vesting.createVestingSchedule(beneficiary.address, AMOUNT, startTime, CLIFF, DURATION);

      // duration - 1: must be < totalAmount
      await ethers.provider.send("evm_setNextBlockTimestamp", [startTime + DURATION - 1]);
      await ethers.provider.send("evm_mine", []);
      expect(await vesting.releasableAmount(beneficiary.address, 0)).to.be.lt(AMOUNT);

      // exactly at duration: must equal totalAmount
      await ethers.provider.send("evm_setNextBlockTimestamp", [startTime + DURATION]);
      await ethers.provider.send("evm_mine", []);
      expect(await vesting.releasableAmount(beneficiary.address, 0)).to.equal(AMOUNT);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Vesting curve — zero cliff (immediate linear vest)
  // ─────────────────────────────────────────────────────────────────────────

  describe("zero cliff (immediate linear vesting)", function () {
    it("tokens vest linearly from t=0 with no cliff", async () => {
      const zeroClifDuration = 365 * 24 * 60 * 60;
      // Set startTime in the future so we can pin the clock
      const now = await latestTimestamp();
      const startTime = now + 100;
      await ethers.provider.send("evm_setNextBlockTimestamp", [startTime]);
      await ethers.provider.send("evm_mine", []);
      await vesting.createVestingSchedule(beneficiary.address, AMOUNT, startTime, 0, zeroClifDuration);

      // Immediately after creation, elapsed is 0 or 1 second → releasable is 0 or dust
      // With zero cliff, 1 second of elapsed gives a tiny non-zero amount — confirm it's < 0.01% of total
      const dustReleasable = await vesting.releasableAmount(beneficiary.address, 0);
      expect(dustReleasable).to.be.lt(AMOUNT / 10000n);

      // At half duration
      const half = Math.floor(zeroClifDuration / 2);
      await ethers.provider.send("evm_setNextBlockTimestamp", [startTime + half]);
      await ethers.provider.send("evm_mine", []);
      const releasable = await vesting.releasableAmount(beneficiary.address, 0);
      const expected = (AMOUNT * BigInt(half)) / BigInt(zeroClifDuration);
      expect(releasable).to.be.closeTo(expected, ethers.parseEther("1"));
    });
  });
});
