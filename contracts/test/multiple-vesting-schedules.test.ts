import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";
import { FVC } from "../typechain-types";

describe("Multiple Vesting Schedules", function () {
  let bonding: any;
  let fvc: FVC;
  let usdc: any;
  let owner: Signer;
  let user1: Signer;
  let treasury: Signer;
  let ownerAddress: string;
  let user1Address: string;
  let treasuryAddress: string;

  beforeEach(async function () {
    [owner, user1, treasury] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    user1Address = await user1.getAddress();
    treasuryAddress = await treasury.getAddress();

    // Deploy FVC token
    const FVC = await ethers.getContractFactory("FVC");
    fvc = await FVC.deploy("First Venture Capital", "FVC", ownerAddress);

    // Deploy Mock USDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();

    // Deploy Bonding contract
    const Bonding = await ethers.getContractFactory("Bonding");
    bonding = await Bonding.deploy();

    // Initialize bonding contract
    await bonding.initialize(
      await fvc.getAddress(),
      await usdc.getAddress(),
      treasuryAddress
    );

    // Grant MINTER_ROLE to bonding contract
    const minterRole = await fvc.getMinterRole();
    await fvc.grantRole(minterRole, await bonding.getAddress());

    // Grant BONDING_MANAGER_ROLE to owner
    await bonding.grantRole(await bonding.BONDING_MANAGER_ROLE(), ownerAddress);

    // Start private sale
    await bonding.startPrivateSale(365 * 24 * 60 * 60); // 1 year

    // Give user1 some USDC
    await usdc.mint(user1Address, ethers.parseUnits("10000", 6)); // 10,000 USDC
  });

  describe("Multiple Bond Transactions", function () {
    it("Should allow user to bond multiple times and create separate transactions", async function () {
      // First bond: 1000 USDC
      const firstBondAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(user1).approve(await bonding.getAddress(), firstBondAmount);
      await bonding.connect(user1).bond(firstBondAmount);

      // Second bond: 500 USDC
      const secondBondAmount = ethers.parseUnits("500", 6);
      await usdc.connect(user1).approve(await bonding.getAddress(), secondBondAmount);
      await bonding.connect(user1).bond(secondBondAmount);

      // Third bond: 750 USDC
      const thirdBondAmount = ethers.parseUnits("750", 6);
      await usdc.connect(user1).approve(await bonding.getAddress(), thirdBondAmount);
      await bonding.connect(user1).bond(thirdBondAmount);

      // Check bond count
      const bondCount = await bonding.getBondCount(user1Address);
      expect(bondCount).to.equal(3);

      // Get all bonds
      const userBonds = await bonding.getUserBonds(user1Address);
      expect(userBonds.length).to.equal(3);

      // Verify first bond
      expect(userBonds[0].bondId).to.equal(0);
      expect(userBonds[0].usdcAmount).to.equal(firstBondAmount);
      expect(userBonds[0].isActive).to.be.true;

      // Verify second bond
      expect(userBonds[1].bondId).to.equal(1);
      expect(userBonds[1].usdcAmount).to.equal(secondBondAmount);
      expect(userBonds[1].isActive).to.be.true;

      // Verify third bond
      expect(userBonds[2].bondId).to.equal(2);
      expect(userBonds[2].usdcAmount).to.equal(thirdBondAmount);
      expect(userBonds[2].isActive).to.be.true;
    });

    it("Should calculate total vested amount across all bonds", async function () {
      // Bond multiple times
      const firstBondAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(user1).approve(await bonding.getAddress(), firstBondAmount);
      await bonding.connect(user1).bond(firstBondAmount);

      const secondBondAmount = ethers.parseUnits("500", 6);
      await usdc.connect(user1).approve(await bonding.getAddress(), secondBondAmount);
      await bonding.connect(user1).bond(secondBondAmount);

      // Get total vested amount
      const [totalVested, totalAmount] = await bonding.getTotalVestedAmount(user1Address);
      
      // Initially, nothing should be vested (cliff period)
      expect(totalVested).to.equal(0);
      expect(totalAmount).to.be.gt(0); // Should have FVC tokens
    });

    it("Should maintain separate vesting schedules for each bond", async function () {
      // First bond
      const firstBondAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(user1).approve(await bonding.getAddress(), firstBondAmount);
      await bonding.connect(user1).bond(firstBondAmount);

      // Wait a bit
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]); // 30 days
      await ethers.provider.send("evm_mine", []);

      // Second bond
      const secondBondAmount = ethers.parseUnits("500", 6);
      await usdc.connect(user1).approve(await bonding.getAddress(), secondBondAmount);
      await bonding.connect(user1).bond(secondBondAmount);

      // Get bonds
      const userBonds = await bonding.getUserBonds(user1Address);
      
      // First bond should be older
      expect(userBonds[0].timestamp).to.be.lt(userBonds[1].timestamp);
      
      // Both should be active
      expect(userBonds[0].isActive).to.be.true;
      expect(userBonds[1].isActive).to.be.true;
    });

    it("Should get specific bond by index", async function () {
      // Create multiple bonds
      const firstBondAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(user1).approve(await bonding.getAddress(), firstBondAmount);
      await bonding.connect(user1).bond(firstBondAmount);

      const secondBondAmount = ethers.parseUnits("500", 6);
      await usdc.connect(user1).approve(await bonding.getAddress(), secondBondAmount);
      await bonding.connect(user1).bond(secondBondAmount);

      // Get specific bonds by index
      const firstBond = await bonding.getBondAtIndex(user1Address, 0);
      const secondBond = await bonding.getBondAtIndex(user1Address, 1);

      expect(firstBond.bondId).to.equal(0);
      expect(firstBond.usdcAmount).to.equal(firstBondAmount);
      
      expect(secondBond.bondId).to.equal(1);
      expect(secondBond.usdcAmount).to.equal(secondBondAmount);
    });

    it("Should revert when accessing invalid bond index", async function () {
      // Try to get bond at index 0 when user has no bonds
      await expect(bonding.getBondAtIndex(user1Address, 0))
        .to.be.revertedWith("Bond index out of bounds");
    });

    it("Should maintain backward compatibility with existing functions", async function () {
      // Bond once
      const bondAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(user1).approve(await bonding.getAddress(), bondAmount);
      await bonding.connect(user1).bond(bondAmount);

      // These functions should still work
      const [vestedAmount, totalAmount] = await bonding.getVestedAmount(user1Address);
      const isLocked = await bonding.isLocked(user1Address);
      const vestingSchedule = await bonding.vestingSchedules(user1Address);

      expect(vestedAmount).to.equal(0); // Cliff period
      expect(totalAmount).to.be.gt(0); // Should have FVC tokens
      expect(isLocked).to.be.true; // Should be locked during cliff
      expect(vestingSchedule.amount).to.be.gt(0); // Should have vesting schedule
    });
  });

  describe("Vesting Calculations", function () {
    it("Should calculate vesting correctly for individual bonds", async function () {
      // Create bond
      const bondAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(user1).approve(await bonding.getAddress(), bondAmount);
      await bonding.connect(user1).bond(bondAmount);

      // Get bond
      const userBonds = await bonding.getUserBonds(user1Address);
      const bond = userBonds[0];

      // During cliff period (0-12 months)
      expect(bond.timestamp).to.be.gt(0);
      
      // Check that bond is locked during cliff
      const isLocked = await bonding.isLocked(user1Address);
      expect(isLocked).to.be.true;
    });

    it("Should handle multiple bonds with different timestamps", async function () {
      // First bond
      const firstBondAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(user1).approve(await bonding.getAddress(), firstBondAmount);
      await bonding.connect(user1).bond(firstBondAmount);

      // Wait 6 months
      await ethers.provider.send("evm_increaseTime", [180 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine", []);

      // Second bond
      const secondBondAmount = ethers.parseUnits("500", 6);
      await usdc.connect(user1).approve(await bonding.getAddress(), secondBondAmount);
      await bonding.connect(user1).bond(secondBondAmount);

      // Get bonds
      const userBonds = await bonding.getUserBonds(user1Address);
      
      // First bond should be 6 months older
      const timeDifference = userBonds[1].timestamp - userBonds[0].timestamp;
      expect(timeDifference).to.be.closeTo(180 * 24 * 60 * 60, 60); // 6 months ± 1 minute
    });
  });
});
