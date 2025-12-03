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

    // Deploy FVC
    const FVC = await ethers.getContractFactory("FVC");
    fvc = await FVC.deploy(deployer.address);
    await fvc.waitForDeployment();

    // Deploy Vesting
    const Vesting = await ethers.getContractFactory("Vesting");
    vesting = await Vesting.deploy(await fvc.getAddress());
    await vesting.waitForDeployment();

    // Mint tokens to vesting contract
    const MINTER_ROLE = await fvc.getMinterRole();
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
        .withArgs(beneficiary.address, AMOUNT, startTime, CLIFF, DURATION);

      const schedule = await vesting.getVestingSchedule(beneficiary.address);
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

      // Move to just before cliff - should be 0
      await time.increaseTo(startTime + CLIFF - 10);
      expect(await vesting.releasableAmount(beneficiary.address)).to.equal(0);

      // Move to exactly cliff - should be (AMOUNT * CLIFF / DURATION)
      await time.increaseTo(startTime + CLIFF);
      const expectedVested = (AMOUNT * BigInt(CLIFF)) / BigInt(DURATION);
      // Allow small rounding difference
      expect(await vesting.releasableAmount(beneficiary.address)).to.be.closeTo(expectedVested, ethers.parseEther("0.0001"));

      // Release
      await vesting.connect(beneficiary).release();
      expect(await fvc.balanceOf(beneficiary.address)).to.be.closeTo(expectedVested, ethers.parseEther("0.0001"));
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
      expect(await vesting.releasableAmount(beneficiary.address)).to.equal(AMOUNT);

      await vesting.connect(beneficiary).release();
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

      await vesting.revokeVesting(beneficiary.address);
      const schedule = await vesting.getVestingSchedule(beneficiary.address);
      expect(schedule.revoked).to.be.true;
      
      // Unvested tokens returned to owner (deployer)
      // Note: Owner had 0 initially (minted all to vesting)
      // Owner gets back full amount since 0 was vested (before cliff)
      expect(await fvc.balanceOf(deployer.address)).to.equal(AMOUNT);
    });
  });
});
