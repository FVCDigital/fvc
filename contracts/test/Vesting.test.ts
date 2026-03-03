import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import type { Contract } from "ethers";

describe("Vesting", function () {
  let deployer: any;
  let beneficiary: any;
  let otherAccount: any;

  let fvc: Contract;
  let vesting: Contract;

  const AMOUNT = ethers.parseEther("10000"); // 10,000 FVC
  const CLIFF = 180 * 24 * 60 * 60; // 180 days
  const DURATION = 730 * 24 * 60 * 60; // 2 years

  beforeEach(async () => {
    [deployer, beneficiary, otherAccount] = await ethers.getSigners();

    const FVC = await ethers.getContractFactory("FVC");
    fvc = await FVC.deploy(deployer.address);
    await fvc.waitForDeployment();

    const Vesting = await ethers.getContractFactory("Vesting");
    vesting = await Vesting.deploy(await fvc.getAddress());
    await vesting.waitForDeployment();

    const MINTER_ROLE = await fvc.MINTER_ROLE();
    await fvc.grantRole(MINTER_ROLE, deployer.address);
    await fvc.mint(await vesting.getAddress(), AMOUNT);
  });

  describe("Vesting Schedule", function () {
    it("should create a vesting schedule", async function () {
      const startTime = await time.latest();

      await expect(vesting.createVestingSchedule(
        beneficiary.address,
        AMOUNT,
        startTime,
        CLIFF,
        DURATION
      )).to.emit(vesting, "VestingScheduleCreated")
        .withArgs(beneficiary.address, 0, AMOUNT, startTime, CLIFF, DURATION);

      const schedule = await vesting.getVestingSchedule(beneficiary.address, 0);
      expect(schedule.totalAmount).to.equal(AMOUNT);
      expect(schedule.cliff).to.equal(CLIFF);
      expect(schedule.duration).to.equal(DURATION);
    });

    it("should release tokens correctly after cliff", async function () {
      const startTime = await time.latest();
      await vesting.createVestingSchedule(
        beneficiary.address,
        AMOUNT,
        startTime,
        CLIFF,
        DURATION
      );

      // Before cliff — 0 releasable
      await time.increaseTo(startTime + CLIFF - 10);
      expect(await vesting.releasableAmount(beneficiary.address, 0)).to.equal(0);

      // At exactly cliff — still 0 (curve starts at 0% at cliff)
      await time.increaseTo(startTime + CLIFF);
      expect(await vesting.releasableAmount(beneficiary.address, 0)).to.equal(0);

      // Midpoint of vesting window
      const vestingWindow = DURATION - CLIFF;
      const midpoint = CLIFF + Math.floor(vestingWindow / 2);
      await time.increaseTo(startTime + midpoint);
      const releasable = await vesting.releasableAmount(beneficiary.address, 0);
      const expected = (AMOUNT * BigInt(vestingWindow / 2)) / BigInt(vestingWindow);
      expect(releasable).to.be.closeTo(expected, ethers.parseEther("1"));

      // Release
      await vesting.connect(beneficiary).release(0);
      expect(await fvc.balanceOf(beneficiary.address)).to.be.closeTo(expected, ethers.parseEther("1"));
    });

    it("should release all tokens after duration", async function () {
      const startTime = await time.latest();
      await vesting.createVestingSchedule(
        beneficiary.address,
        AMOUNT,
        startTime,
        CLIFF,
        DURATION
      );

      await time.increaseTo(startTime + DURATION + 1);
      expect(await vesting.releasableAmount(beneficiary.address, 0)).to.equal(AMOUNT);

      await vesting.connect(beneficiary).release(0);
      expect(await fvc.balanceOf(beneficiary.address)).to.equal(AMOUNT);
    });

    it("should allow owner to revoke vesting", async function () {
      const startTime = await time.latest();
      await vesting.createVestingSchedule(
        beneficiary.address,
        AMOUNT,
        startTime,
        CLIFF,
        DURATION
      );

      await vesting.revokeVesting(beneficiary.address, 0);
      const schedule = await vesting.getVestingSchedule(beneficiary.address, 0);
      expect(schedule.revoked).to.be.true;

      // Full amount returned to owner (before cliff, 0 vested)
      expect(await fvc.balanceOf(deployer.address)).to.equal(AMOUNT);
    });
  });
});
