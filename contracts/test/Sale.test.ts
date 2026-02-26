import { expect } from "chai";
import { ethers } from "hardhat";
import type { Contract } from "ethers";

describe("Sale", function () {
  let deployer: any;
  let buyer: any;
  let beneficiary: any;

  let fvc: Contract;
  let usdc: Contract;
  let sale: Contract;

  const RATE = 25_000; // $0.025 per FVC (6 decimals)
  const CAP = ethers.parseUnits("1000000", 6); // 1M USDC cap

  beforeEach(async () => {
    [deployer, buyer, beneficiary] = await ethers.getSigners();

    const FVC = await ethers.getContractFactory("FVC");
    fvc = await FVC.deploy(deployer.address);
    await fvc.waitForDeployment();

    const MockStable = await ethers.getContractFactory("MockStable");
    usdc = await MockStable.deploy("USD Coin", "USDC", 6);
    await usdc.waitForDeployment();

    await usdc.mint(buyer.address, ethers.parseUnits("100000", 6));

    const Sale = await ethers.getContractFactory("Sale");
    sale = await Sale.deploy(
      await fvc.getAddress(),
      beneficiary.address,
      RATE,
      CAP
    );
    await sale.waitForDeployment();

    const MINTER_ROLE = await fvc.MINTER_ROLE();
    await fvc.grantRole(MINTER_ROLE, await sale.getAddress());

    // Sale ownership transfers to beneficiary in constructor
    await sale.connect(beneficiary).setAcceptedToken(await usdc.getAddress(), true, 6);
    await sale.connect(beneficiary).setActive(true);
  });

  // ──────────────────────────────────────────────
  // Token metadata (wallet_watchAsset preconditions)
  // ──────────────────────────────────────────────

  describe("Token metadata for wallet_watchAsset", function () {
    it("FVC has correct name", async () => {
      expect(await fvc.name()).to.equal("First Venture Capital");
    });

    it("FVC has correct symbol", async () => {
      expect(await fvc.symbol()).to.equal("FVC");
    });

    it("FVC has 18 decimals", async () => {
      expect(await fvc.decimals()).to.equal(18);
    });
  });

  // ──────────────────────────────────────────────
  // Purchase flow
  // ──────────────────────────────────────────────

  describe("Buy", function () {
    it("mints FVC to buyer on purchase", async () => {
      const usdcAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(buyer).approve(await sale.getAddress(), usdcAmount);
      await sale.connect(buyer).buy(await usdc.getAddress(), usdcAmount);

      const expectedFVC = (usdcAmount * BigInt(1e18)) / BigInt(RATE);
      expect(await fvc.balanceOf(buyer.address)).to.equal(expectedFVC);
    });

    it("emits TokensPurchased with correct args", async () => {
      const usdcAmount = ethers.parseUnits("500", 6);
      const expectedFVC = (usdcAmount * BigInt(1e18)) / BigInt(RATE);

      await usdc.connect(buyer).approve(await sale.getAddress(), usdcAmount);
      await expect(
        sale.connect(buyer).buy(await usdc.getAddress(), usdcAmount)
      )
        .to.emit(sale, "TokensPurchased")
        .withArgs(buyer.address, await usdc.getAddress(), usdcAmount, expectedFVC);
    });

    it("transfers stablecoin to beneficiary", async () => {
      const usdcAmount = ethers.parseUnits("2000", 6);
      await usdc.connect(buyer).approve(await sale.getAddress(), usdcAmount);
      await sale.connect(buyer).buy(await usdc.getAddress(), usdcAmount);

      expect(await usdc.balanceOf(beneficiary.address)).to.equal(usdcAmount);
    });

    it("tracks raised amount", async () => {
      const usdcAmount = ethers.parseUnits("5000", 6);
      await usdc.connect(buyer).approve(await sale.getAddress(), usdcAmount);
      await sale.connect(buyer).buy(await usdc.getAddress(), usdcAmount);

      expect(await sale.raised()).to.equal(usdcAmount);
    });

    it("reverts when sale is inactive", async () => {
      await sale.connect(beneficiary).setActive(false);
      const usdcAmount = ethers.parseUnits("100", 6);
      await usdc.connect(buyer).approve(await sale.getAddress(), usdcAmount);

      await expect(
        sale.connect(buyer).buy(await usdc.getAddress(), usdcAmount)
      ).to.be.revertedWithCustomError(sale, "Sale__Inactive");
    });

    it("reverts when cap exceeded", async () => {
      const smallCap = ethers.parseUnits("100", 6);
      await sale.connect(beneficiary).setCap(smallCap);

      const usdcAmount = ethers.parseUnits("101", 6);
      await usdc.connect(buyer).approve(await sale.getAddress(), usdcAmount);

      await expect(
        sale.connect(buyer).buy(await usdc.getAddress(), usdcAmount)
      ).to.be.revertedWithCustomError(sale, "Sale__CapExceeded");
    });

    it("reverts with unaccepted token", async () => {
      const MockStable = await ethers.getContractFactory("MockStable");
      const fake = await MockStable.deploy("Fake", "FAKE", 6);
      await fake.waitForDeployment();
      await fake.mint(buyer.address, ethers.parseUnits("1000", 6));
      await fake.connect(buyer).approve(await sale.getAddress(), ethers.parseUnits("1000", 6));

      await expect(
        sale.connect(buyer).buy(await fake.getAddress(), ethers.parseUnits("1000", 6))
      ).to.be.revertedWithCustomError(sale, "Sale__TokenNotAccepted");
    });

    it("reverts with zero amount", async () => {
      await expect(
        sale.connect(buyer).buy(await usdc.getAddress(), 0)
      ).to.be.revertedWithCustomError(sale, "Sale__ZeroAmount");
    });
  });

  // ──────────────────────────────────────────────
  // Buyer balance after purchase (what MetaMask displays)
  // ──────────────────────────────────────────────

  describe("Post-purchase balance (wallet display)", function () {
    it("buyer holds non-zero FVC after purchase", async () => {
      const usdcAmount = ethers.parseUnits("100", 6);
      await usdc.connect(buyer).approve(await sale.getAddress(), usdcAmount);
      await sale.connect(buyer).buy(await usdc.getAddress(), usdcAmount);

      expect(await fvc.balanceOf(buyer.address)).to.be.gt(0);
    });

    it("multiple purchases accumulate in buyer balance", async () => {
      const amount1 = ethers.parseUnits("500", 6);
      const amount2 = ethers.parseUnits("300", 6);
      const totalUSDC = amount1 + amount2;

      await usdc.connect(buyer).approve(await sale.getAddress(), totalUSDC);

      await sale.connect(buyer).buy(await usdc.getAddress(), amount1);
      const balAfterFirst = await fvc.balanceOf(buyer.address);

      await sale.connect(buyer).buy(await usdc.getAddress(), amount2);
      const balAfterSecond = await fvc.balanceOf(buyer.address);

      expect(balAfterSecond).to.be.gt(balAfterFirst);

      const expectedTotal = (totalUSDC * BigInt(1e18)) / BigInt(RATE);
      expect(balAfterSecond).to.equal(expectedTotal);
    });

    it("FVC amount calculation is correct at $0.025 rate", async () => {
      // $1000 USDC at $0.025/FVC = 40,000 FVC
      const usdcAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(buyer).approve(await sale.getAddress(), usdcAmount);
      await sale.connect(buyer).buy(await usdc.getAddress(), usdcAmount);

      const expectedFVC = ethers.parseEther("40000");
      expect(await fvc.balanceOf(buyer.address)).to.equal(expectedFVC);
    });
  });

  // ──────────────────────────────────────────────
  // Owner controls
  // ──────────────────────────────────────────────

  describe("Owner controls", function () {
    it("owner can update rate", async () => {
      const newRate = 50_000; // $0.05
      await sale.connect(beneficiary).setRate(newRate);
      expect(await sale.rate()).to.equal(newRate);
    });

    it("owner can update cap", async () => {
      const newCap = ethers.parseUnits("5000000", 6);
      await sale.connect(beneficiary).setCap(newCap);
      expect(await sale.cap()).to.equal(newCap);
    });

    it("non-owner cannot set rate", async () => {
      await expect(
        sale.connect(buyer).setRate(50_000)
      ).to.be.reverted;
    });

    it("non-owner cannot toggle active", async () => {
      await expect(
        sale.connect(buyer).setActive(false)
      ).to.be.reverted;
    });
  });

  // ──────────────────────────────────────────────
  // Vesting threshold
  // ──────────────────────────────────────────────

  describe("Vesting integration", function () {
    let vesting: Contract;

    beforeEach(async () => {
      const Vesting = await ethers.getContractFactory("Vesting");
      vesting = await Vesting.deploy(await fvc.getAddress());
      await vesting.waitForDeployment();

      // Sale needs MINTER_ROLE on FVC (already granted in outer beforeEach)
      // Sale also calls vestingContract.createVestingSchedule which requires onlyOwner
      await vesting.transferOwnership(await sale.getAddress());

      const threshold = ethers.parseUnits("50000", 6);
      const cliff = 180 * 24 * 60 * 60;
      const duration = 730 * 24 * 60 * 60;

      await sale.connect(beneficiary).setVestingConfig(
        await vesting.getAddress(),
        threshold,
        cliff,
        duration
      );
    });

    it("small purchase mints directly to buyer (no vesting)", async () => {
      const usdcAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(buyer).approve(await sale.getAddress(), usdcAmount);

      await expect(
        sale.connect(buyer).buy(await usdc.getAddress(), usdcAmount)
      ).to.emit(sale, "TokensPurchased");

      expect(await fvc.balanceOf(buyer.address)).to.be.gt(0);
    });

    it("large purchase creates vesting schedule", async () => {
      await usdc.mint(buyer.address, ethers.parseUnits("100000", 6));
      const usdcAmount = ethers.parseUnits("60000", 6);
      await usdc.connect(buyer).approve(await sale.getAddress(), usdcAmount);

      await expect(
        sale.connect(buyer).buy(await usdc.getAddress(), usdcAmount)
      ).to.emit(sale, "TokensPurchasedWithVesting");

      // Buyer should NOT hold FVC directly — it's in the vesting contract
      expect(await fvc.balanceOf(buyer.address)).to.equal(0);
    });
  });
});
