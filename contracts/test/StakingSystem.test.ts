import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { FVC, MockUSDC, StakingRewards, FVCFaucet, MockYieldDistributor } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Staking System - Full Integration", function () {
  let fvc: FVC;
  let usdc: MockUSDC;
  let staking: StakingRewards;
  let faucet: FVCFaucet;
  let distributor: MockYieldDistributor;
  
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const FAUCET_AMOUNT = ethers.parseUnits("10000", 18); // 10K FVC
  const WEEKLY_YIELD = ethers.parseUnits("1000", 6); // 1000 USDC

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy FVC
    const FVC = await ethers.getContractFactory("FVC");
    fvc = await FVC.deploy(owner.address);

    // Deploy Mock USDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();

    // Deploy StakingRewards
    const StakingRewards = await ethers.getContractFactory("StakingRewards");
    staking = await StakingRewards.deploy(await fvc.getAddress(), await usdc.getAddress());

    // Deploy FVCFaucet
    const FVCFaucet = await ethers.getContractFactory("FVCFaucet");
    faucet = await FVCFaucet.deploy(await fvc.getAddress());

    // Deploy MockYieldDistributor
    const MockYieldDistributor = await ethers.getContractFactory("MockYieldDistributor");
    distributor = await MockYieldDistributor.deploy(
      await usdc.getAddress(),
      await staking.getAddress(),
      WEEKLY_YIELD
    );

    // Grant MINTER_ROLE to faucet
    const MINTER_ROLE = await fvc.getMinterRole();
    await fvc.grantRole(MINTER_ROLE, await faucet.getAddress());

    // Transfer staking ownership to distributor for notifyRewardAmount
    await staking.transferOwnership(await distributor.getAddress());

    // Mint USDC to distributor
    await usdc.mint(await distributor.getAddress(), ethers.parseUnits("10000", 6));
  });

  describe("FVCFaucet", function () {
    it("Should allow user to claim FVC", async function () {
      await faucet.connect(user1).claim();
      
      const balance = await fvc.balanceOf(user1.address);
      expect(balance).to.equal(FAUCET_AMOUNT);
    });

    it("Should enforce cooldown period", async function () {
      await faucet.connect(user1).claim();
      
      await expect(faucet.connect(user1).claim()).to.be.revertedWithCustomError(
        faucet,
        "Faucet__CooldownActive"
      );
    });

    it("Should allow claim after cooldown", async function () {
      await faucet.connect(user1).claim();
      
      // Fast forward 24 hours
      await increaseTime(86400);
      
      await faucet.connect(user1).claim();
      
      const balance = await fvc.balanceOf(user1.address);
      expect(balance).to.equal(FAUCET_AMOUNT * 2n);
    });

    it("Should enforce max claims per address", async function () {
      // Claim 5 times
      for (let i = 0; i < 5; i++) {
        await faucet.connect(user1).claim();
        await time.increase(86400);
      }
      
      await expect(faucet.connect(user1).claim()).to.be.revertedWithCustomError(
        faucet,
        "Faucet__MaxClaimsReached"
      );
    });

    it("Should return correct canClaim status", async function () {
      const [canClaim1, , remainingClaims1] = await faucet.canClaim(user1.address);
      expect(canClaim1).to.be.true;
      expect(remainingClaims1).to.equal(5);

      await faucet.connect(user1).claim();

      const [canClaim2, cooldown2, remainingClaims2] = await faucet.canClaim(user1.address);
      expect(canClaim2).to.be.false;
      expect(cooldown2).to.be.gt(0);
      expect(remainingClaims2).to.equal(4);
    });
  });

  describe("StakingRewards", function () {
    beforeEach(async function () {
      // User1 claims FVC from faucet
      await faucet.connect(user1).claim();
    });

    it("Should allow user to stake FVC", async function () {
      const stakeAmount = ethers.parseUnits("5000", 18);
      
      await fvc.connect(user1).approve(await staking.getAddress(), stakeAmount);
      await staking.connect(user1).stake(stakeAmount);
      
      const balance = await staking.balanceOf(user1.address);
      expect(balance).to.equal(stakeAmount);
    });

    it("Should calculate proportional rewards correctly", async function () {
      // User1 stakes 10K FVC (100% of pool)
      await fvc.connect(user1).approve(await staking.getAddress(), FAUCET_AMOUNT);
      await staking.connect(user1).stake(FAUCET_AMOUNT);
      
      // Distribute 1000 USDC
      await distributor.distributeYield();
      
      // Wait 7 days (full reward period)
      await increaseTime(7 * 24 * 60 * 60);
      
      // User1 should have earned all 1000 USDC
      const earned = await staking.earned(user1.address);
      expect(earned).to.be.closeTo(WEEKLY_YIELD, ethers.parseUnits("1", 6)); // Allow 1 USDC rounding
    });

    it("Should split rewards proportionally between multiple stakers", async function () {
      // User1 stakes 10K FVC
      await fvc.connect(user1).approve(await staking.getAddress(), FAUCET_AMOUNT);
      await staking.connect(user1).stake(FAUCET_AMOUNT);
      
      // User2 claims and stakes 10K FVC
      await faucet.connect(user2).claim();
      await fvc.connect(user2).approve(await staking.getAddress(), FAUCET_AMOUNT);
      await staking.connect(user2).stake(FAUCET_AMOUNT);
      
      // Distribute 1000 USDC
      await distributor.distributeYield();
      
      // Wait 7 days
      await time.increase(7 * 24 * 60 * 60);
      
      // Each user should have earned ~500 USDC (50% of pool)
      const earned1 = await staking.earned(user1.address);
      const earned2 = await staking.earned(user2.address);
      
      expect(earned1).to.be.closeTo(WEEKLY_YIELD / 2n, ethers.parseUnits("10", 6));
      expect(earned2).to.be.closeTo(WEEKLY_YIELD / 2n, ethers.parseUnits("10", 6));
    });

    it("Should allow user to claim rewards", async function () {
      await fvc.connect(user1).approve(await staking.getAddress(), FAUCET_AMOUNT);
      await staking.connect(user1).stake(FAUCET_AMOUNT);
      
      await distributor.distributeYield();
      await time.increase(7 * 24 * 60 * 60);
      
      const earnedBefore = await staking.earned(user1.address);
      expect(earnedBefore).to.be.gt(0);
      
      await staking.connect(user1).getReward();
      
      const usdcBalance = await usdc.balanceOf(user1.address);
      expect(usdcBalance).to.be.closeTo(earnedBefore, ethers.parseUnits("1", 6));
      
      const earnedAfter = await staking.earned(user1.address);
      expect(earnedAfter).to.equal(0);
    });

    it("Should allow user to withdraw staked FVC", async function () {
      const stakeAmount = ethers.parseUnits("5000", 18);
      
      await fvc.connect(user1).approve(await staking.getAddress(), stakeAmount);
      await staking.connect(user1).stake(stakeAmount);
      
      await staking.connect(user1).withdraw(stakeAmount);
      
      const stakedBalance = await staking.balanceOf(user1.address);
      expect(stakedBalance).to.equal(0);
      
      const fvcBalance = await fvc.balanceOf(user1.address);
      expect(fvcBalance).to.equal(FAUCET_AMOUNT);
    });

    it("Should allow exit (withdraw + claim)", async function () {
      await fvc.connect(user1).approve(await staking.getAddress(), FAUCET_AMOUNT);
      await staking.connect(user1).stake(FAUCET_AMOUNT);
      
      await distributor.distributeYield();
      await time.increase(7 * 24 * 60 * 60);
      
      await staking.connect(user1).exit();
      
      const stakedBalance = await staking.balanceOf(user1.address);
      expect(stakedBalance).to.equal(0);
      
      const fvcBalance = await fvc.balanceOf(user1.address);
      expect(fvcBalance).to.equal(FAUCET_AMOUNT);
      
      const usdcBalance = await usdc.balanceOf(user1.address);
      expect(usdcBalance).to.be.gt(0);
    });
  });

  describe("MockYieldDistributor", function () {
    it("Should distribute yield to staking contract", async function () {
      const balanceBefore = await usdc.balanceOf(await staking.getAddress());
      
      await distributor.distributeYield();
      
      const balanceAfter = await usdc.balanceOf(await staking.getAddress());
      expect(balanceAfter - balanceBefore).to.equal(WEEKLY_YIELD);
    });

    it("Should enforce distribution interval", async function () {
      await distributor.distributeYield();
      
      await expect(distributor.distributeYield()).to.be.revertedWithCustomError(
        distributor,
        "MockYield__TooSoon"
      );
    });

    it("Should allow distribution after interval", async function () {
      await distributor.distributeYield();
      
      await time.increase(7 * 24 * 60 * 60);
      
      await expect(distributor.distributeYield()).to.not.be.reverted;
    });

    it("Should allow custom amount distribution", async function () {
      const customAmount = ethers.parseUnits("500", 6);
      
      await distributor.distributeCustomAmount(customAmount);
      
      const balance = await usdc.balanceOf(await staking.getAddress());
      expect(balance).to.equal(customAmount);
    });
  });

  describe("Full User Flow", function () {
    it("Should complete full cycle: faucet → stake → earn → claim", async function () {
      // 1. User claims FVC from faucet
      await faucet.connect(user1).claim();
      let fvcBalance = await fvc.balanceOf(user1.address);
      expect(fvcBalance).to.equal(FAUCET_AMOUNT);
      
      // 2. User stakes FVC
      await fvc.connect(user1).approve(await staking.getAddress(), FAUCET_AMOUNT);
      await staking.connect(user1).stake(FAUCET_AMOUNT);
      let stakedBalance = await staking.balanceOf(user1.address);
      expect(stakedBalance).to.equal(FAUCET_AMOUNT);
      
      // 3. Yield is distributed
      await distributor.distributeYield();
      
      // 4. Wait for rewards to accrue
      await time.increase(7 * 24 * 60 * 60);
      
      // 5. User claims rewards
      const earned = await staking.earned(user1.address);
      expect(earned).to.be.gt(0);
      
      await staking.connect(user1).getReward();
      
      const usdcBalance = await usdc.balanceOf(user1.address);
      expect(usdcBalance).to.be.closeTo(WEEKLY_YIELD, ethers.parseUnits("1", 6));
      
      // 6. User withdraws stake
      await staking.connect(user1).withdraw(FAUCET_AMOUNT);
      fvcBalance = await fvc.balanceOf(user1.address);
      expect(fvcBalance).to.equal(FAUCET_AMOUNT);
    });
  });
});
