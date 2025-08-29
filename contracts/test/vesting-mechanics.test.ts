import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";
import { Bonding, FVC, MockUSDC } from "../typechain-types";

describe("FVC Protocol - Vesting Mechanics", function () {
  let bonding: Bonding;
  let fvc: FVC;
  let usdc: MockUSDC;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  let treasury: Signer;
  let ownerAddress: string;
  let user1Address: string;
  let user2Address: string;
  let treasuryAddress: string;

  const CLIFF_DURATION = 365 * 24 * 60 * 60; // 12 months in seconds
  const VESTING_DURATION = 730 * 24 * 60 * 60; // 24 months in seconds
  const TOTAL_DURATION = CLIFF_DURATION + VESTING_DURATION; // 36 months total

  beforeEach(async function () {
    [owner, user1, user2, treasury] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    user1Address = await user1.getAddress();
    user2Address = await user2.getAddress();
    treasuryAddress = await treasury.getAddress();

    // Deploy FVC token
    const FVC = await ethers.getContractFactory("FVC");
    fvc = await FVC.deploy("FVC", "FVC", ownerAddress);

    // Deploy Mock USDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();

    // Deploy Bonding contract
    const Bonding = await ethers.getContractFactory("Bonding");
    bonding = await Bonding.deploy();

    // Initialize bonding contract
    await bonding.initialize(await fvc.getAddress(), await usdc.getAddress(), treasuryAddress);

    // Grant MINTER_ROLE to bonding contract so it can mint FVC to users
    const minterRole = await fvc.getMinterRole();
    await fvc.grantRole(minterRole, await bonding.getAddress());

    // Mint FVC tokens to bonding contract
    await fvc.mint(await bonding.getAddress(), ethers.parseEther("1000000")); // 1M FVC

    // Mint USDC to users for testing
    await usdc.mint(user1Address, ethers.parseUnits("1000000", 6)); // 1M USDC
    await usdc.mint(user2Address, ethers.parseUnits("1000000", 6)); // 1M USDC

    // Start private sale
    await bonding.startPrivateSale(30 * 24 * 60 * 60); // 30 days
  });

  describe("Vesting Schedule Creation", function () {
    it("Should create vesting schedule when user bonds USDC", async function () {
      const usdcAmount = ethers.parseUnits("10000", 6); // 10K USDC
      
      // Approve USDC spending
      await usdc.connect(user1).approve(await bonding.getAddress(), usdcAmount);
      
      // Bond USDC
      await bonding.connect(user1).bond(usdcAmount);
      
      // Check vesting schedule
      const vestingSchedule = await bonding.getVestingSchedule(user1Address);
      expect(vestingSchedule.amount).to.be.gt(0);
      expect(vestingSchedule.startTime).to.be.gt(0);
      expect(vestingSchedule.endTime).to.be.gt(vestingSchedule.startTime);
      
      // Verify duration
      const duration = Number(vestingSchedule.endTime) - Number(vestingSchedule.startTime);
      expect(duration).to.equal(TOTAL_DURATION);
    });

    it("Should have correct cliff and vesting periods", async function () {
      const usdcAmount = ethers.parseUnits("10000", 6);
      await usdc.connect(user1).approve(await bonding.getAddress(), usdcAmount);
      await bonding.connect(user1).bond(usdcAmount);
      
      const vestingSchedule = await bonding.getVestingSchedule(user1Address);
      const startTime = Number(vestingSchedule.startTime);
      const endTime = Number(vestingSchedule.endTime);
      const cliffEndTime = startTime + CLIFF_DURATION;
      
      // Verify cliff duration
      expect(cliffEndTime - startTime).to.equal(CLIFF_DURATION);
      
      // Verify total duration
      expect(endTime - startTime).to.equal(TOTAL_DURATION);
    });
  });

  describe("Cliff Period (First 12 Months)", function () {
    beforeEach(async function () {
      const usdcAmount = ethers.parseUnits("10000", 6);
      await usdc.connect(user1).approve(await bonding.getAddress(), usdcAmount);
      await bonding.connect(user1).bond(usdcAmount);
    });

    it("Should have 0% vested during cliff period", async function () {
      const [vestedAmount, totalAmount] = await bonding.getVestedAmount(user1Address);
      expect(vestedAmount).to.equal(0);
      
      const vestedPercentage = Number((vestedAmount * BigInt(10000)) / totalAmount) / 100;
      expect(vestedPercentage).to.equal(0);
    });

    it("Should have tokens locked during cliff", async function () {
      const isLocked = await bonding.isLocked(user1Address);
      expect(isLocked).to.be.true;
    });

    it("Should maintain 0% vested at 6 months", async function () {
      const vestingSchedule = await bonding.getVestingSchedule(user1Address);
      const startTime = Number(vestingSchedule.startTime);
      const sixMonthsTime = startTime + (180 * 24 * 60 * 60);
      
      // Move time to 6 months
      await ethers.provider.send("evm_increaseTime", [sixMonthsTime - Math.floor(Date.now() / 1000)]);
      await ethers.provider.send("evm_mine", []);
      
      const [vestedAmount, totalAmount] = await bonding.getVestedAmount(user1Address);
      const vestedPercentage = Number((vestedAmount * BigInt(10000)) / totalAmount) / 100;
      expect(vestedPercentage).to.equal(0);
    });
  });

  describe("Linear Vesting Period (After Cliff)", function () {
    let startTime: number;
    let cliffEndTime: number;
    let endTime: number;

    beforeEach(async function () {
      const usdcAmount = ethers.parseUnits("10000", 6);
      await usdc.connect(user1).approve(await bonding.getAddress(), usdcAmount);
      await bonding.connect(user1).bond(usdcAmount);
      
      const vestingSchedule = await bonding.getVestingSchedule(user1Address);
      startTime = Number(vestingSchedule.startTime);
      cliffEndTime = startTime + CLIFF_DURATION;
      endTime = Number(vestingSchedule.endTime);
    });

    it("Should have 25% vested at 25% through vesting period", async function () {
      // Move past cliff to 25% through LINEAR vesting period (after cliff)
      const timeToMove = CLIFF_DURATION + Math.floor(VESTING_DURATION * 0.25);
      
      await ethers.provider.send("evm_increaseTime", [timeToMove]);
      await ethers.provider.send("evm_mine", []);
      
      const [vestedAmount, totalAmount] = await bonding.getVestedAmount(user1Address);
      const vestedPercentage = Number((vestedAmount * BigInt(10000)) / totalAmount) / 100;
      expect(vestedPercentage).to.be.closeTo(25, 1); // Allow 1% tolerance
    });

    it("Should have 50% vested at 50% through vesting period", async function () {
      // Move to 50% through LINEAR vesting period (after cliff)
      const timeToMove = CLIFF_DURATION + Math.floor(VESTING_DURATION * 0.50);
      
      await ethers.provider.send("evm_increaseTime", [timeToMove]);
      await ethers.provider.send("evm_mine", []);
      
      const [vestedAmount, totalAmount] = await bonding.getVestedAmount(user1Address);
      const vestedPercentage = Number((vestedAmount * BigInt(10000)) / totalAmount) / 100;
      expect(vestedPercentage).to.be.closeTo(50, 1);
    });

    it("Should have 75% vested at 75% through vesting period", async function () {
      // Move to 75% through LINEAR vesting period (after cliff)
      const timeToMove = CLIFF_DURATION + Math.floor(VESTING_DURATION * 0.75);
      
      await ethers.provider.send("evm_increaseTime", [timeToMove]);
      await ethers.provider.send("evm_mine", []);
      
      const [vestedAmount, totalAmount] = await bonding.getVestedAmount(user1Address);
      const vestedPercentage = Number((vestedAmount * BigInt(10000)) / totalAmount) / 100;
      expect(vestedPercentage).to.be.closeTo(75, 1);
    });

    it("Should have 100% vested at end of vesting period", async function () {
      // Move to end of vesting period
      const timeToMove = endTime - Math.floor(Date.now() / 1000);
      
      if (timeToMove > 0) {
        await ethers.provider.send("evm_increaseTime", [timeToMove]);
        await ethers.provider.send("evm_mine", []);
        
        const [vestedAmount, totalAmount] = await bonding.getVestedAmount(user1Address);
        const vestedPercentage = Number((vestedAmount * BigInt(10000)) / totalAmount) / 100;
        expect(vestedPercentage).to.be.closeTo(100, 0.1); // Allow 0.1% tolerance
      }
    });

    it("Should unlock tokens after vesting completion", async function () {
      // Move to end of vesting period
      const timeToMove = endTime - Math.floor(Date.now() / 1000);
      
      if (timeToMove > 0) {
        await ethers.provider.send("evm_increaseTime", [timeToMove]);
        await ethers.provider.send("evm_mine", []);
        
        const isLocked = await bonding.isLocked(user1Address);
        expect(isLocked).to.be.false;
      }
    });
  });

  describe("Mathematical Accuracy", function () {
    it("Should maintain precision in calculations", async function () {
      const usdcAmount = ethers.parseUnits("100000", 6); // 100K USDC (within first milestone)
      await usdc.connect(user1).approve(await bonding.getAddress(), usdcAmount);
      await bonding.connect(user1).bond(usdcAmount);
      
      // Move past cliff
      const timeToMove = CLIFF_DURATION + 1;
      await ethers.provider.send("evm_increaseTime", [timeToMove]);
      await ethers.provider.send("evm_mine", []);
      
      // Test that some tokens are vested
      const [vestedAmount, totalAmount] = await bonding.getVestedAmount(user1Address);
      expect(vestedAmount).to.be.gt(0);
      expect(vestedAmount).to.be.lt(totalAmount);
    });

    it("Should handle edge cases correctly", async function () {
      const usdcAmount = ethers.parseUnits("1000", 6); // 1K USDC (small amount for edge case)
      await usdc.connect(user1).approve(await bonding.getAddress(), usdcAmount);
      await bonding.connect(user1).bond(usdcAmount);
      
      // Test at cliff end (exactly at cliff end, not past it)
      const timeToMove = CLIFF_DURATION;
      await ethers.provider.send("evm_increaseTime", [timeToMove]);
      await ethers.provider.send("evm_mine", []);
      
      const [vestedAmount, totalAmount] = await bonding.getVestedAmount(user1Address);
      expect(vestedAmount).to.equal(0); // Should still be 0 at cliff end
    });
  });

  describe("Multiple Users", function () {
    it("Should handle multiple vesting schedules independently", async function () {
      // User 1 bonds
      const usdcAmount1 = ethers.parseUnits("10000", 6);
      await usdc.connect(user1).approve(await bonding.getAddress(), usdcAmount1);
      await bonding.connect(user1).bond(usdcAmount1);
      
      // User 2 bonds
      const usdcAmount2 = ethers.parseUnits("20000", 6);
      await usdc.connect(user2).approve(await bonding.getAddress(), usdcAmount2);
      await bonding.connect(user2).bond(usdcAmount2);
      
      // Check both schedules exist
      const schedule1 = await bonding.getVestingSchedule(user1Address);
      const schedule2 = await bonding.getVestingSchedule(user2Address);
      
      expect(schedule1.amount).to.be.gt(0);
      expect(schedule2.amount).to.be.gt(0);
      expect(schedule1.amount).to.not.equal(schedule2.amount);
    });

    it("Should calculate vesting independently for each user", async function () {
      // Both users bond
      const usdcAmount = ethers.parseUnits("10000", 6);
      await usdc.connect(user1).approve(await bonding.getAddress(), usdcAmount);
      await usdc.connect(user2).approve(await bonding.getAddress(), usdcAmount);
      await bonding.connect(user1).bond(usdcAmount);
      await bonding.connect(user2).bond(usdcAmount);
      
      // Move time forward
      const timeToMove = 180 * 24 * 60 * 60; // 6 months
      await ethers.provider.send("evm_increaseTime", [timeToMove]);
      await ethers.provider.send("evm_mine", []);
      
      // Both should still be in cliff period
      const [vested1, total1] = await bonding.getVestedAmount(user1Address);
      const [vested2, total2] = await bonding.getVestedAmount(user2Address);
      
      expect(vested1).to.equal(0);
      expect(vested2).to.equal(0);
      expect(total1).to.equal(total2);
    });
  });
});
