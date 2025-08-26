import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";
import { FVC } from "../typechain-types";

describe("Bonding Contract", function () {
  let bonding: any;
  let fvc: FVC;
  let usdc: any;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  let treasury: Signer;
  let ownerAddress: string;
  let user1Address: string;
  let user2Address: string;
  let treasuryAddress: string;

  const TOTAL_FVC_ALLOCATION = ethers.parseEther("225000000"); // 225M FVC
  const MAX_WALLET_CAP = ethers.parseUnits("2000000", 6); // 2M USDC
  const TOTAL_SALE_TARGET = ethers.parseUnits("20000000", 6); // 20M USDC

  beforeEach(async function () {
    [owner, user1, user2, treasury] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    user1Address = await user1.getAddress();
    user2Address = await user2.getAddress();
    treasuryAddress = await treasury.getAddress();

    // Deploy FVC token
    const FVC = await ethers.getContractFactory("FVC");
    fvc = await FVC.deploy(ownerAddress as any);

    // Deploy Mock USDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();

    // Deploy Bonding contract
    const Bonding = await ethers.getContractFactory("Bonding");
    bonding = await Bonding.deploy();

    // Initialize bonding contract
    await bonding.initialize(await fvc.getAddress(), await usdc.getAddress(), treasuryAddress);

    // Mint FVC tokens to bonding contract
    await fvc.mint(await bonding.getAddress(), TOTAL_FVC_ALLOCATION);

    // Mint USDC to users for testing
    await usdc.mint(user1Address, ethers.parseUnits("1000000", 6)); // 1M USDC
    await usdc.mint(user2Address, ethers.parseUnits("1000000", 6)); // 1M USDC

    // Start private sale
    await bonding.startPrivateSale(30 * 24 * 60 * 60); // 30 days
  });

  describe("Initialization", function () {
    it("Should initialize with correct parameters", async function () {
      expect(await bonding.fvc()).to.equal(await fvc.getAddress());
      expect(await bonding.usdc()).to.equal(await usdc.getAddress());
      expect(await bonding.treasury()).to.equal(treasuryAddress);
      expect(await bonding.privateSaleActive()).to.be.true;
      expect(await bonding.currentMilestone()).to.equal(0);
    });

    it("Should have 4 milestones initialized", async function () {
      const milestones = await bonding.getAllMilestones();
      expect(milestones.length).to.equal(4);
      
      // Check Early Bird milestone
      expect(milestones[0].name).to.equal("Early Bird");
      expect(milestones[0].price).to.equal(25); // $0.025
      expect(milestones[0].usdcThreshold).to.equal(ethers.parseUnits("416667", 6));
      expect(milestones[0].fvcAllocation).to.equal(ethers.parseEther("16666667"));
      
      // Check Final milestone
      expect(milestones[3].name).to.equal("Final");
      expect(milestones[3].price).to.equal(100); // $0.10
      expect(milestones[3].usdcThreshold).to.equal(ethers.parseUnits("20000000", 6));
      expect(milestones[3].fvcAllocation).to.equal(ethers.parseEther("175000000"));
    });
  });

  describe("Bonding Functionality", function () {
    it("Should allow user to bond USDC for FVC tokens", async function () {
      const usdcAmount = ethers.parseUnits("10000", 6); // 10K USDC
      const expectedFVC = (usdcAmount * ethers.parseEther("1")) / BigInt(25); // Price is 25 (0.025 * 1000)
      
      // Approve USDC spending
      await usdc.connect(user1).approve(await bonding.getAddress(), usdcAmount);
      
      // Bond USDC
      await bonding.connect(user1).bond(usdcAmount);
      
      // Check state updates
      expect(await bonding.totalBonded()).to.equal(usdcAmount);
      expect(await bonding.totalFVCSold()).to.equal(expectedFVC);
      expect(await bonding.userBonded(user1Address)).to.equal(usdcAmount);
      
      // Check vesting schedule
      const vestingSchedule = await bonding.getVestingSchedule(user1Address);
      expect(vestingSchedule.amount).to.equal(expectedFVC);
      expect(vestingSchedule.startTime).to.be.gt(0);
      expect(vestingSchedule.endTime).to.be.gt(vestingSchedule.startTime);
    });

    it("Should enforce wallet cap", async function () {
      const usdcAmount = ethers.parseUnits("2100000", 6); // 2.1M USDC (exceeds 2M cap)
      
      await usdc.connect(user1).approve(await bonding.getAddress(), usdcAmount);
      
      await expect(
        bonding.connect(user1).bond(usdcAmount)
      ).to.be.revertedWithCustomError(bonding, "Bonding__ExceedsWalletCap");
    });

    it("Should enforce milestone caps", async function () {
      // Try to bond more than the first milestone threshold
      const usdcAmount = ethers.parseUnits("500000", 6); // 500K USDC (exceeds 416,667 threshold)
      
      await usdc.connect(user1).approve(await bonding.getAddress(), usdcAmount);
      
      await expect(
        bonding.connect(user1).bond(usdcAmount)
      ).to.be.revertedWithCustomError(bonding, "Bonding__MilestoneCapExceeded");
    });

    it("Should advance milestone when threshold is reached", async function () {
      const usdcAmount = ethers.parseUnits("416667", 6); // Exactly at first milestone threshold
      
      await usdc.connect(user1).approve(await bonding.getAddress(), usdcAmount);
      await bonding.connect(user1).bond(usdcAmount);
      
      // Should advance to next milestone
      expect(await bonding.currentMilestone()).to.equal(1);
    });
  });

  describe("Vesting Functionality", function () {
    it("Should create vesting schedule with correct parameters", async function () {
      const usdcAmount = ethers.parseUnits("10000", 6);
      await usdc.connect(user1).approve(await bonding.getAddress(), usdcAmount);
      await bonding.connect(user1).bond(usdcAmount);
      
      const vestingSchedule = await bonding.getVestingSchedule(user1Address);
      const currentTime = Math.floor(Date.now() / 1000);
      
      expect(vestingSchedule.startTime).to.be.closeTo(currentTime, 10);
      expect(vestingSchedule.endTime).to.equal(vestingSchedule.startTime + 365 + 730); // 12 months + 24 months
    });

    it("Should lock tokens during cliff period", async function () {
      const usdcAmount = ethers.parseUnits("10000", 6);
      await usdc.connect(user1).approve(await bonding.getAddress(), usdcAmount);
      await bonding.connect(user1).bond(usdcAmount);
      
      // Check if tokens are locked
      expect(await bonding.isLocked(user1Address)).to.be.true;
    });

    it("Should calculate vested amount correctly", async function () {
      const usdcAmount = ethers.parseUnits("10000", 6);
      await usdc.connect(user1).approve(await bonding.getAddress(), usdcAmount);
      await bonding.connect(user1).bond(usdcAmount);
      
      const [vestedAmount, totalAmount] = await bonding.getVestedAmount(user1Address);
      expect(vestedAmount).to.equal(0); // During cliff period
      expect(totalAmount).to.be.gt(0);
    });
  });

  describe("Price Calculations", function () {
    it("Should calculate FVC amount correctly for current price", async function () {
      const usdcAmount = ethers.parseUnits("10000", 6);
      const expectedFVC = (usdcAmount * ethers.parseEther("1")) / BigInt(25); // Price is 25
      
      const calculatedFVC = await bonding.calculateFVCAmount(usdcAmount);
      expect(calculatedFVC).to.equal(expectedFVC);
    });

    it("Should return correct current price", async function () {
      const currentPrice = await bonding.getCurrentPrice();
      expect(currentPrice).to.equal(25); // $0.025 for first milestone
    });
  });

  describe("Milestone Management", function () {
    it("Should return correct current milestone", async function () {
      const currentMilestone = await bonding.getCurrentMilestone();
      expect(currentMilestone.name).to.equal("Early Bird");
      expect(currentMilestone.price).to.equal(25);
    });

    it("Should return next milestone correctly", async function () {
      const nextMilestone = await bonding.getNextMilestone();
      expect(nextMilestone.name).to.equal("Early Adopters");
      expect(nextMilestone.price).to.equal(50);
    });

    it("Should return remaining FVC for current milestone", async function () {
      const remainingFVC = await bonding.getRemainingFVC();
      expect(remainingFVC).to.equal(ethers.parseEther("16666667")); // 16,666,667 FVC
    });
  });

  describe("Sale Progress", function () {
    it("Should return correct sale progress", async function () {
      const usdcAmount = ethers.parseUnits("10000000", 6); // 10M USDC
      await usdc.connect(user1).approve(await bonding.getAddress(), usdcAmount);
      await bonding.connect(user1).bond(usdcAmount);
      
      const [progress, currentMilestoneIndex, totalBondedAmount, totalFVCSoldAmount] = 
        await bonding.getSaleProgress();
      
      // Progress should be 50% (10M / 20M * 10000)
      expect(progress).to.equal(5000);
      expect(totalBondedAmount).to.equal(usdcAmount);
      expect(totalFVCSoldAmount).to.be.gt(0);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow bonding manager to end private sale", async function () {
      await bonding.endPrivateSale();
      expect(await bonding.privateSaleActive()).to.be.false;
    });

    it("Should not allow non-manager to end private sale", async function () {
      await expect(
        bonding.connect(user1).endPrivateSale()
      ).to.be.reverted;
    });

    it("Should allow bonding manager to allocate FVC to milestones", async function () {
      const milestoneIndex = 0;
      const amount = ethers.parseEther("1000000");
      
      await bonding.allocateFVCToMilestone(milestoneIndex, amount);
      
      const milestone = await bonding.getCurrentMilestone();
      expect(milestone.fvcAllocation).to.equal(amount);
    });
  });

  describe("Access Control", function () {
    it("Should grant correct roles to owner", async function () {
      const bondingManagerRole = await bonding.BONDING_MANAGER_ROLE();
      const upgraderRole = await bonding.UPGRADER_ROLE();
      
      expect(await bonding.hasRole(bondingManagerRole, ownerAddress)).to.be.true;
      expect(await bonding.hasRole(upgraderRole, ownerAddress)).to.be.true;
    });

    it("Should not allow non-manager to start private sale", async function () {
      await bonding.endPrivateSale();
      
      await expect(
        bonding.connect(user1).startPrivateSale(30 * 24 * 60 * 60)
      ).to.be.reverted;
    });
  });

  describe("Edge Cases", function () {
    it("Should not allow bonding when sale is not active", async function () {
      await bonding.endPrivateSale();
      
      const usdcAmount = ethers.parseUnits("10000", 6);
      await usdc.connect(user1).approve(await bonding.getAddress(), usdcAmount);
      
      await expect(
        bonding.connect(user1).bond(usdcAmount)
      ).to.be.revertedWithCustomError(bonding, "Bonding__PrivateSaleNotActive");
    });

    it("Should not allow bonding with zero amount", async function () {
      await expect(
        bonding.connect(user1).bond(0)
      ).to.be.revertedWithCustomError(bonding, "Bonding__AmountMustBeGreaterThanZero");
    });

    it("Should not allow bonding after sale end time", async function () {
      // Fast forward time past sale end
      const saleEndTime = await bonding.saleEndTime();
      await ethers.provider.send("evm_setNextBlockTimestamp", [saleEndTime + 1]);
      await ethers.provider.send("evm_mine", []);
      
      const usdcAmount = ethers.parseUnits("10000", 6);
      await usdc.connect(user1).approve(await bonding.getAddress(), usdcAmount);
      
      await expect(
        bonding.connect(user1).bond(usdcAmount)
      ).to.be.revertedWithCustomError(bonding, "Bonding__PrivateSaleEnded");
    });
  });
