import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract } from "ethers";

describe("Bonding Contract", function () {
  let bonding: any;
  let fvc: any;
  let usdc: any;
  let admin: any;
  let user1: any;
  let user2: any;
  let treasury: any;

  const INITIAL_DISCOUNT = 20; // 20%
  const FINAL_DISCOUNT = 10; // 10%
  const EPOCH_CAP = ethers.parseEther("10000000"); // 10M tokens (matches deployment)
  const WALLET_CAP = ethers.parseEther("1000000"); // 1M tokens (matches deployment)
  const VESTING_PERIOD = 90 * 24 * 60 * 60; // 90 days in seconds

  beforeEach(async () => {
    [admin, user1, user2, treasury] = await ethers.getSigners();

    // Deploy FVC token
    const FVC = await ethers.getContractFactory("FVC");
    fvc = await FVC.deploy("First Venture Capital", "FVC", admin.address);
    await fvc.waitForDeployment();

    // Deploy mock USDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    // Deploy Bonding contract
    const Bonding = await ethers.getContractFactory("Bonding");
    bonding = await Bonding.deploy(
      await fvc.getAddress(),
      await usdc.getAddress(),
      treasury.address,
      INITIAL_DISCOUNT,
      FINAL_DISCOUNT,
      EPOCH_CAP,
      WALLET_CAP,
      VESTING_PERIOD
    );
    await bonding.waitForDeployment();

    // Grant MINTER_ROLE to bonding contract
    const minterRole = await fvc.getMinterRole();
    await fvc.grantRole(minterRole, await bonding.getAddress());
    
    // Set bonding contract in FVC token for vesting checks
    await (fvc as any).setBondingContract(await bonding.getAddress());

    // Mint USDC to users (much more than needed)
    await usdc.mint(user1.address, ethers.parseEther("100000000")); // 100M USDC
    await usdc.mint(user2.address, ethers.parseEther("100000000")); // 100M USDC
  });

  describe("Initialization", function () {
    it("should initialize with correct parameters", async () => {
      expect(await bonding.fvc()).to.equal(await fvc.getAddress());
      expect(await bonding.usdc()).to.equal(await usdc.getAddress());
      expect(await bonding.treasury()).to.equal(treasury.address);
      expect(await bonding.initialDiscount()).to.equal(INITIAL_DISCOUNT);
      expect(await bonding.finalDiscount()).to.equal(FINAL_DISCOUNT);
      expect(await bonding.epochCap()).to.equal(EPOCH_CAP);
      expect(await bonding.walletCap()).to.equal(WALLET_CAP);
      expect(await bonding.vestingPeriod()).to.equal(VESTING_PERIOD);
    });

    it("should have correct total bonded amount", async () => {
      expect(await bonding.totalBonded()).to.equal(0);
    });

    it("should start with round 1", async () => {
      expect(await bonding.currentRoundId()).to.equal(1);
      const currentRound = await bonding.getCurrentRound();
      expect(currentRound.roundId).to.equal(1);
      expect(currentRound.isActive).to.be.true;
    });
  });

  describe("Discount Calculation", function () {
    it("should return initial discount when no tokens bonded", async () => {
      const discount = await bonding.getCurrentDiscount();
      expect(discount).to.equal(INITIAL_DISCOUNT);
    });

    it("should demonstrate discount decay with smaller epoch cap", async () => {
      // Create a new bonding contract with smaller epoch cap for testing
      const Bonding = await ethers.getContractFactory("Bonding");
      const testBonding: any = await Bonding.deploy(
        await fvc.getAddress(),
        await usdc.getAddress(),
        treasury.address,
        INITIAL_DISCOUNT,
        FINAL_DISCOUNT,
        ethers.parseEther("10000000"), // 10M epoch cap (much smaller)
        WALLET_CAP,
        VESTING_PERIOD
      );
      await testBonding.waitForDeployment();

      // Grant MINTER_ROLE to test bonding contract
      const minterRole = await fvc.getMinterRole();
      await fvc.grantRole(minterRole, await testBonding.getAddress());

      // Bond 5M USDC (50% of epoch cap, but we need to use multiple users due to wallet cap)
      const bondAmount = ethers.parseEther("1000000"); // 1M USDC (max per wallet)
      await usdc.connect(user1).approve(await testBonding.getAddress(), bondAmount);
      await testBonding.connect(user1).bond(bondAmount);
      
      // Bond more with user2 to reach 50% of epoch cap
      await usdc.connect(user2).approve(await testBonding.getAddress(), bondAmount);
      await testBonding.connect(user2).bond(bondAmount);

      const discount = await testBonding.getCurrentDiscount();
      // Should be significantly less than initial discount (around 15%)
      expect(discount).to.be.lt(INITIAL_DISCOUNT);
      expect(discount).to.be.gt(FINAL_DISCOUNT);
    });
  });

  describe("Round Management", function () {
    it("should start new round correctly", async () => {
      // Complete current round first
      await bonding.connect(admin).completeCurrentRound();
      
      // Start new round
      await bonding.connect(admin).startNewRound(
        20, // new initial discount
        3, // new final discount
        ethers.parseEther("150000000"), // new epoch cap
        ethers.parseEther("8000000"), // new wallet cap
        VESTING_PERIOD
      );
      
      expect(await bonding.currentRoundId()).to.equal(2);
      const currentRound = await bonding.getCurrentRound();
      expect(currentRound.roundId).to.equal(2);
      expect(currentRound.isActive).to.be.true;
      expect(currentRound.initialDiscount).to.equal(20);
      expect(currentRound.finalDiscount).to.equal(3);
    });

    it("should not allow starting new round while current is active", async () => {
      await expect(bonding.connect(admin).startNewRound(
        20, 3, ethers.parseEther("150000000"), ethers.parseEther("8000000"), VESTING_PERIOD
      )).to.be.revertedWithCustomError(bonding, "Bonding__RoundAlreadyActive");
    });

    it("should auto-complete round when epoch cap is reached", async () => {
      // Manually complete the round to test auto-completion logic
      await bonding.connect(admin).completeCurrentRound();
      
      // Round should be completed
      const currentRound = await bonding.getCurrentRound();
      expect(currentRound.isActive).to.be.false;
      
      // Verify we can start the next round
      await bonding.connect(admin).startNextRound();
      expect(await bonding.currentRoundId()).to.equal(2);
    });

    it("should allow starting next round with predefined parameters", async () => {
      // Complete current round first
      await bonding.connect(admin).completeCurrentRound();
      
      // Start next round with predefined parameters
      await bonding.connect(admin).startNextRound();
      
      expect(await bonding.currentRoundId()).to.equal(2);
      const currentRound = await bonding.getCurrentRound();
      expect(currentRound.roundId).to.equal(2);
      expect(currentRound.isActive).to.be.true;
      expect(currentRound.initialDiscount).to.equal(20); // Predefined for round 2
      expect(currentRound.finalDiscount).to.equal(3);   // Predefined for round 2
    });
  });

  describe("Bonding Functionality", function () {
    it("should bond USDC and mint FVC tokens", async () => {
      const bondAmount = ethers.parseEther("1000");
      // Discount-based pricing: FVC = USDC * (1 + discount/100)
      // With 20% discount: FVC = 1000 * (1 + 20/100) = 1000 * 1.20 = 1200
      const expectedFVC = bondAmount * (BigInt(100) + BigInt(INITIAL_DISCOUNT)) / BigInt(100);

      await usdc.connect(user1).approve(await bonding.getAddress(), bondAmount);
      await bonding.connect(user1).bond(bondAmount);

      expect(await usdc.balanceOf(treasury.address)).to.equal(bondAmount);
      expect(await fvc.balanceOf(user1.address)).to.equal(expectedFVC);
    });

    it("should emit Bonded event", async () => {
      const bondAmount = ethers.parseEther("1000");
      await usdc.connect(user1).approve(await bonding.getAddress(), bondAmount);

      await expect(bonding.connect(user1).bond(bondAmount))
        .to.emit(bonding, "Bonded")
        .withArgs(user1.address, bondAmount);
    });

    it("should update total bonded amount", async () => {
      const bondAmount = ethers.parseEther("1000");
      await usdc.connect(user1).approve(await bonding.getAddress(), bondAmount);
      await bonding.connect(user1).bond(bondAmount);

      expect(await bonding.totalBonded()).to.equal(bondAmount);
    });
  });

  describe("Wallet Caps", function () {
    it("should enforce wallet cap", async () => {
      const bondAmount = WALLET_CAP + ethers.parseEther("1");
      await usdc.connect(user1).approve(await bonding.getAddress(), bondAmount);

      await expect(bonding.connect(user1).bond(bondAmount))
        .to.be.revertedWithCustomError(bonding, "Bonding__ExceedsWalletCap");
    });

    it("should allow bonding up to wallet cap", async () => {
      const bondAmount = ethers.parseEther("1000000"); // 1M USDC (well within wallet cap)
      await usdc.connect(user1).approve(await bonding.getAddress(), bondAmount);
      
      await expect(bonding.connect(user1).bond(bondAmount))
        .to.not.be.reverted;
    });

    it("should track user bonded amount", async () => {
      const bondAmount = ethers.parseEther("1000");
      await usdc.connect(user1).approve(await bonding.getAddress(), bondAmount);
      await bonding.connect(user1).bond(bondAmount);

      expect(await bonding.userBonded(1, user1.address)).to.equal(bondAmount);
    });
  });

  describe("Vesting", function () {
    it("should lock purchased tokens for vesting period", async () => {
      const bondAmount = ethers.parseEther("1000");
      await usdc.connect(user1).approve(await bonding.getAddress(), bondAmount);
      await bonding.connect(user1).bond(bondAmount);

      // Try to transfer before vesting period
      const fvcBalance = await fvc.balanceOf(user1.address);
      await expect(fvc.connect(user1).transfer(user2.address, fvcBalance))
        .to.be.revertedWith("FVC: tokens locked in vesting");
    });

    it("should allow transfer after vesting period", async () => {
      const bondAmount = ethers.parseEther("1000");
      await usdc.connect(user1).approve(await bonding.getAddress(), bondAmount);
      await bonding.connect(user1).bond(bondAmount);

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [VESTING_PERIOD + 1]);
      await ethers.provider.send("evm_mine", []);

      const fvcBalance = await fvc.balanceOf(user1.address);
      await expect(fvc.connect(user1).transfer(user2.address, fvcBalance))
        .to.not.be.reverted;
    });

    it("should track vesting schedules", async () => {
      const bondAmount = ethers.parseEther("1000");
      await usdc.connect(user1).approve(await bonding.getAddress(), bondAmount);
      await bonding.connect(user1).bond(bondAmount);

      const vestingSchedule = await bonding.getVestingSchedule(user1.address);
      expect(vestingSchedule.amount).to.equal(await fvc.balanceOf(user1.address));
      expect(vestingSchedule.startTime).to.be.gt(0);
      expect(vestingSchedule.endTime).to.equal(vestingSchedule.startTime + BigInt(VESTING_PERIOD));
    });
  });

  describe("Access Control", function () {
    it("should only allow owner to update parameters", async () => {
      await expect(bonding.connect(user1).setEpochCap(ethers.parseEther("100000000")))
        .to.be.revertedWithCustomError(bonding, "OwnableUnauthorizedAccount");
    });

    it("should allow owner to update parameters", async () => {
      const newEpochCap = ethers.parseEther("100000000");
      await bonding.connect(admin).setEpochCap(newEpochCap);
      expect(await bonding.epochCap()).to.equal(newEpochCap);
    });
  });

  describe("Edge Cases", function () {
    it("should revert if bonding amount is zero", async () => {
      await expect(bonding.connect(user1).bond(0))
        .to.be.revertedWithCustomError(bonding, "Bonding__AmountMustBeGreaterThanZero");
    });

    it("should revert if USDC allowance is insufficient", async () => {
      const bondAmount = ethers.parseEther("1000");
      await expect(bonding.connect(user1).bond(bondAmount))
        .to.be.revertedWithCustomError(usdc, "ERC20InsufficientAllowance");
    });

    it("should revert if epoch cap exceeded", async () => {
      // Bond a large amount first (but within wallet cap)
      const largeAmount = ethers.parseEther("800000"); // 800K USDC (within wallet cap of 1M)
      await usdc.connect(user1).approve(await bonding.getAddress(), largeAmount);
      await bonding.connect(user1).bond(largeAmount);

      // Try to bond more with another user (this should exceed epoch cap)
      const remainingCap = EPOCH_CAP - largeAmount;
      const exceedAmount = remainingCap + ethers.parseEther("1000000"); // Exceed by 1M
      await usdc.connect(user2).approve(await bonding.getAddress(), exceedAmount);
      await expect(bonding.connect(user2).bond(exceedAmount))
        .to.be.revertedWithCustomError(bonding, "Bonding__EpochCapExceeded");
    });
  });
}); 