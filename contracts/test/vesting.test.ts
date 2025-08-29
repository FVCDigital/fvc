import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract } from "ethers";

describe("FVCVesting Contract", function () {
  let vesting: any;
  let fvc: any;
  let admin: any;
  let beneficiary: any;
  let saleContract: any;

  const CLIFF_DURATION = 365 * 24 * 60 * 60; // 12 months in seconds
  const VESTING_DURATION = 730 * 24 * 60 * 60; // 24 months in seconds
  const TOTAL_DURATION = CLIFF_DURATION + VESTING_DURATION; // 36 months total

  beforeEach(async () => {
    [admin, beneficiary, saleContract] = await ethers.getSigners();

    // Deploy FVC token
    const FVC = await ethers.getContractFactory("FVC");
    fvc = await FVC.deploy("First Venture Capital", "FVC", admin.address);
    await fvc.waitForDeployment();

    // Deploy Vesting contract
    const FVCVesting = await ethers.getContractFactory("FVCVesting");
    vesting = await FVCVesting.deploy(await fvc.getAddress(), admin.address);
    await vesting.waitForDeployment();

    // Grant SALE_ROLE to saleContract
    await vesting.grantSaleRole(saleContract.address);

    // Mint FVC tokens to saleContract for testing
    const minterRole = await fvc.getMinterRole();
    await fvc.grantRole(minterRole, saleContract.address);
    await fvc.connect(saleContract).mint(saleContract.address, ethers.parseEther("1000000")); // 1M FVC

    // Approve vesting contract to spend FVC tokens
    await fvc.connect(saleContract).approve(await vesting.getAddress(), ethers.parseEther("1000000"));
  });

  describe("Initialization", function () {
    it("should initialize with correct constants", async () => {
      expect(await vesting.CLIFF_DURATION()).to.equal(CLIFF_DURATION);
      expect(await vesting.VESTING_DURATION()).to.equal(VESTING_DURATION);
      expect(await vesting.fvcToken()).to.equal(await fvc.getAddress());
    });

    it("should grant correct roles to admin", async () => {
      const vestingAdminRole = await vesting.VESTING_ADMIN_ROLE();
      expect(await vesting.hasRole(vestingAdminRole, admin.address)).to.be.true;
    });
  });

  describe("Vesting Schedule Creation", function () {
    it("should create vesting schedule correctly", async () => {
      const amount = ethers.parseEther("10000"); // 10k FVC
      
      await vesting.connect(saleContract).createVestingSchedule(beneficiary.address, amount);
      
      const schedule = await vesting.vestingSchedules(beneficiary.address);
      expect(schedule.totalAmount).to.equal(amount);
      expect(schedule.releasedAmount).to.equal(0);
      expect(schedule.startTime).to.be.gt(0);
      
      // Check relative timing instead of absolute
      expect(schedule.cliffTime).to.equal(schedule.startTime + BigInt(CLIFF_DURATION));
      expect(schedule.endTime).to.equal(schedule.startTime + BigInt(TOTAL_DURATION));
    });

    it("should fail if beneficiary is zero address", async () => {
      const amount = ethers.parseEther("10000");
      await expect(
        vesting.connect(saleContract).createVestingSchedule(ethers.ZeroAddress, amount)
      ).to.be.revertedWith("Zero beneficiary address");
    });

    it("should fail if amount is zero", async () => {
      await expect(
        vesting.connect(saleContract).createVestingSchedule(beneficiary.address, 0)
      ).to.be.revertedWith("Zero vesting amount");
    });

    it("should fail if schedule already exists", async () => {
      const amount = ethers.parseEther("10000");
      await vesting.connect(saleContract).createVestingSchedule(beneficiary.address, amount);
      
      await expect(
        vesting.connect(saleContract).createVestingSchedule(beneficiary.address, amount)
      ).to.be.revertedWith("Schedule exists");
    });

    it("should fail if caller doesn't have SALE_ROLE", async () => {
      const amount = ethers.parseEther("10000");
      await expect(
        vesting.createVestingSchedule(beneficiary.address, amount)
      ).to.be.reverted;
    });
  });

  describe("Cliff Period (First 12 Months)", function () {
    beforeEach(async () => {
      const amount = ethers.parseEther("10000"); // 10k FVC
      await vesting.connect(saleContract).createVestingSchedule(beneficiary.address, amount);
    });

    it("should have 0% vested during cliff period", async () => {
      const vestedAmount = await vesting.calculateVestedAmount(beneficiary.address);
      expect(vestedAmount).to.equal(0);
    });

    it("should have 0% progress during cliff period", async () => {
      const progress = await vesting.getVestingProgress(beneficiary.address);
      expect(progress).to.equal(0);
    });

    it("should not allow token release during cliff", async () => {
      await expect(
        vesting.connect(beneficiary).release()
      ).to.be.revertedWith("No tokens to release");
    });

    it("should correctly identify cliff not passed", async () => {
      const cliffPassed = await vesting.isCliffPassed(beneficiary.address);
      expect(cliffPassed).to.be.false;
    });
  });

  describe("Linear Vesting Period (After Cliff)", function () {
    let startTime: number;
    let cliffTime: number;
    let endTime: number;

    beforeEach(async () => {
      const amount = ethers.parseEther("10000"); // 10k FVC
      await vesting.connect(saleContract).createVestingSchedule(beneficiary.address, amount);
      
      const schedule = await vesting.vestingSchedules(beneficiary.address);
      startTime = Number(schedule.startTime);
      cliffTime = Number(schedule.cliffTime);
      endTime = Number(schedule.endTime);
    });

    it("should have 25% vested at 25% through vesting period", async () => {
      // Move to 25% through vesting period (6 months after cliff)
      const targetTime = cliffTime + Math.floor(VESTING_DURATION * 25 / 100);
      await ethers.provider.send("evm_setNextBlockTimestamp", [targetTime]);
      await ethers.provider.send("evm_mine", []);
      
      const vestedAmount = await vesting.calculateVestedAmount(beneficiary.address);
      const expectedVested = ethers.parseEther("2500"); // 25% of 10k
      expect(vestedAmount).to.equal(expectedVested);
    });

    it("should have 50% vested at 50% through vesting period", async () => {
      // Move to 50% through vesting period (12 months after cliff)
      const targetTime = cliffTime + Math.floor(VESTING_DURATION * 50 / 100);
      await ethers.provider.send("evm_setNextBlockTimestamp", [targetTime]);
      await ethers.provider.send("evm_mine", []);
      
      const vestedAmount = await vesting.calculateVestedAmount(beneficiary.address);
      const expectedVested = ethers.parseEther("5000"); // 50% of 10k
      expect(vestedAmount).to.equal(expectedVested);
    });

    it("should have 75% vested at 75% through vesting period", async () => {
      // Move to 75% through vesting period (18 months after cliff)
      const targetTime = cliffTime + Math.floor(VESTING_DURATION * 75 / 100);
      await ethers.provider.send("evm_setNextBlockTimestamp", [targetTime]);
      await ethers.provider.send("evm_mine", []);
      
      const vestedAmount = await vesting.calculateVestedAmount(beneficiary.address);
      const expectedVested = ethers.parseEther("7500"); // 75% of 10k
      expect(vestedAmount).to.equal(expectedVested);
    });

    it("should have 100% vested at end of vesting period", async () => {
      // Move to end of vesting period
      const targetTime = cliffTime + VESTING_DURATION;
      await ethers.provider.send("evm_setNextBlockTimestamp", [targetTime]);
      await ethers.provider.send("evm_mine", []);
      
      const vestedAmount = await vesting.calculateVestedAmount(beneficiary.address);
      const expectedVested = ethers.parseEther("10000"); // 100% of 10k
      expect(vestedAmount).to.equal(expectedVested);
    });

    it("should calculate progress correctly during vesting", async () => {
      // Move to 30% through vesting period
      const targetTime = cliffTime + Math.floor(VESTING_DURATION * 30 / 100);
      await ethers.provider.send("evm_setNextBlockTimestamp", [targetTime]);
      await ethers.provider.send("evm_mine", []);
      
      const progress = await vesting.getVestingProgress(beneficiary.address);
      expect(progress).to.equal(30);
    });

    it("should identify cliff has passed", async () => {
      // Move past cliff
      const targetTime = cliffTime + 1;
      await ethers.provider.send("evm_setNextBlockTimestamp", [targetTime]);
      await ethers.provider.send("evm_mine", []);
      
      const cliffPassed = await vesting.isCliffPassed(beneficiary.address);
      expect(cliffPassed).to.be.true;
    });
  });

  describe("Token Release", function () {
    beforeEach(async () => {
      const amount = ethers.parseEther("10000"); // 10k FVC
      await vesting.connect(saleContract).createVestingSchedule(beneficiary.address, amount);
    });

    it("should release tokens correctly after cliff", async () => {
      // Move to 25% through vesting period
      const schedule = await vesting.vestingSchedules(beneficiary.address);
      const cliffTime = Number(schedule.cliffTime);
      const targetTime = cliffTime + Math.floor(VESTING_DURATION * 25 / 100);
      await ethers.provider.send("evm_setNextBlockTimestamp", [targetTime]);
      await ethers.provider.send("evm_mine", []);
      
      // Release tokens
      await vesting.connect(beneficiary).release();
      
      // Check beneficiary balance
      const balance = await fvc.balanceOf(beneficiary.address);
      const expectedBalance = ethers.parseEther("2500"); // 25% of 10k
      expect(balance).to.equal(expectedBalance);
    });

    it("should track released amount correctly", async () => {
      // Move to 50% through vesting period
      const schedule = await vesting.vestingSchedules(beneficiary.address);
      const cliffTime = Number(schedule.cliffTime);
      const targetTime = cliffTime + Math.floor(VESTING_DURATION * 50 / 100);
      await ethers.provider.send("evm_setNextBlockTimestamp", [targetTime]);
      await ethers.provider.send("evm_mine", []);
      
      // Release tokens
      await vesting.connect(beneficiary).release();
      
      // Check released amount
      const scheduleAfter = await vesting.vestingSchedules(beneficiary.address);
      expect(scheduleAfter.releasedAmount).to.equal(ethers.parseEther("5000"));
    });
  });

  describe("Mathematical Accuracy", function () {
    it("should maintain precision in calculations", async () => {
      const amount = ethers.parseEther("1000000"); // 1M FVC
      await vesting.connect(saleContract).createVestingSchedule(beneficiary.address, amount);
      
      // Move past cliff
      const schedule = await vesting.vestingSchedules(beneficiary.address);
      const cliffTime = Number(schedule.cliffTime);
      const targetTime = cliffTime + 1;
      await ethers.provider.send("evm_setNextBlockTimestamp", [targetTime]);
      await ethers.provider.send("evm_mine", []);
      
      // Test that some tokens are vested
      const vestedAmount = await vesting.calculateVestedAmount(beneficiary.address);
      expect(vestedAmount).to.be.gt(0);
    });
  });
});
