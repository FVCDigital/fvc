import { expect } from "chai";
import { ethers } from "hardhat";
import type { Contract } from "ethers";

/**
 * Ethereum Mainnet Presale Tests
 *
 * FVC is sold via a fixed-rate Sale contract on Ethereum.
 * Buyers pay in USDC (6 decimals) or USDT (6 decimals).
 * FVC is minted directly to the buyer's wallet on purchase.
 *
 * Because $FVC is a presale token not yet listed on any DEX/CEX,
 * wallets like MetaMask will not auto-detect it. The dApp must call
 * wallet_watchAsset (EIP-747) after purchase so the token appears.
 * These tests verify the on-chain preconditions that make that work:
 *   - correct token metadata (name, symbol, decimals)
 *   - non-zero buyer balance after purchase
 *   - correct ERC-20 Transfer event emission (MetaMask listens for these)
 */
describe("Ethereum Presale ? Sale Contract", function () {
  let deployer: any;
  let buyer: any;
  let buyer2: any;
  let beneficiary: any;

  let fvc: Contract;
  let usdc: Contract;
  let usdt: Contract;
  let sale: Contract;

  const RATE = 25_000;
  const CAP = ethers.parseUnits("20000000", 6);

  beforeEach(async () => {
    [deployer, buyer, buyer2, beneficiary] = await ethers.getSigners();

    const FVC = await ethers.getContractFactory("FVC");
    fvc = await FVC.deploy(deployer.address);
    await fvc.waitForDeployment();

    const MockStable = await ethers.getContractFactory("MockStable");
    usdc = await MockStable.deploy("USD Coin", "USDC", 6);
    await usdc.waitForDeployment();
    usdt = await MockStable.deploy("Tether USD", "USDT", 6);
    await usdt.waitForDeployment();

    await usdc.mint(buyer.address, ethers.parseUnits("500000", 6));
    await usdt.mint(buyer.address, ethers.parseUnits("500000", 6));
    await usdc.mint(buyer2.address, ethers.parseUnits("100000", 6));

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

    await sale.connect(beneficiary).setAcceptedToken(await usdc.getAddress(), true, 6);
    await sale.connect(beneficiary).setAcceptedToken(await usdt.getAddress(), true, 6);
    await sale.connect(beneficiary).setActive(true);
  });

  // ????????????????????????????????????????????????
  // TOKEN METADATA ? wallet_watchAsset preconditions
  // ????????????????????????????????????????????????

  describe("Token metadata (wallet_watchAsset preconditions)", function () {
    it("returns correct name", async () => {
      expect(await fvc.name()).to.equal("First Venture Capital");
    });

    it("returns correct symbol for wallet display", async () => {
      expect(await fvc.symbol()).to.equal("FVC");
    });

    it("returns 18 decimals for wallet display", async () => {
      expect(await fvc.decimals()).to.equal(18);
    });

    it("has a queryable contract address", async () => {
      const addr = await fvc.getAddress();
      expect(addr).to.be.properAddress;
    });

    it("supports ERC-165 interface detection", async () => {
      expect(await fvc.supportsInterface("0x01ffc9a7")).to.be.true;
    });
  });

  // ????????????????????????????????????????????????
  // BUY WITH USDC
  // ????????????????????????????????????????????????

  describe("Buy FVC with USDC", function () {
    it("mints FVC to buyer wallet", async () => {
      const usdcAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(buyer).approve(await sale.getAddress(), usdcAmount);
      await sale.connect(buyer).buy(await usdc.getAddress(), usdcAmount);

      const expectedFVC = (usdcAmount * BigInt(1e18)) / BigInt(RATE);
      expect(await fvc.balanceOf(buyer.address)).to.equal(expectedFVC);
    });

    it("$1000 USDC at $0.025 = 40,000 FVC", async () => {
      const usdcAmount = ethers.parseUnits("1000", 6);
      await usdc.connect(buyer).approve(await sale.getAddress(), usdcAmount);
      await sale.connect(buyer).buy(await usdc.getAddress(), usdcAmount);

      expect(await fvc.balanceOf(buyer.address)).to.equal(ethers.parseEther("40000"));
    });

    it("$100,000 USDC at $0.025 = 4,000,000 FVC", async () => {
      const usdcAmount = ethers.parseUnits("100000", 6);
      await usdc.connect(buyer).approve(await sale.getAddress(), usdcAmount);
      await sale.connect(buyer).buy(await usdc.getAddress(), usdcAmount);

      expect(await fvc.balanceOf(buyer.address)).to.equal(ethers.parseEther("4000000"));
    });

    it("sends USDC to beneficiary (Gnosis Safe)", async () => {
      const usdcAmount = ethers.parseUnits("5000", 6);
      await usdc.connect(buyer).approve(await sale.getAddress(), usdcAmount);
      await sale.connect(buyer).buy(await usdc.getAddress(), usdcAmount);

      expect(await usdc.balanceOf(beneficiary.address)).to.equal(usdcAmount);
    });

    it("emits TokensPurchased event", async () => {
      const usdcAmount = ethers.parseUnits("2000", 6);
      const expectedFVC = (usdcAmount * BigInt(1e18)) / BigInt(RATE);

      await usdc.connect(buyer).approve(await sale.getAddress(), usdcAmount);
      await expect(
        sale.connect(buyer).buy(await usdc.getAddress(), usdcAmount)
      )
        .to.emit(sale, "TokensPurchased")
        .withArgs(buyer.address, await usdc.getAddress(), usdcAmount, expectedFVC);
    });

    it("emits ERC-20 Transfer event from zero address (mint)", async () => {
      const usdcAmount = ethers.parseUnits("500", 6);
      const expectedFVC = (usdcAmount * BigInt(1e18)) / BigInt(RATE);

      await usdc.connect(buyer).approve(await sale.getAddress(), usdcAmount);
      await expect(
        sale.connect(buyer).buy(await usdc.getAddress(), usdcAmount)
      )
        .to.emit(fvc, "Transfer")
        .withArgs(ethers.ZeroAddress, buyer.address, expectedFVC);
    });
  });

  // ????????????????????????????????????????????????
  // BUY WITH USDT
  // ????????????????????????????????????????????????

  describe("Buy FVC with USDT", function () {
    it("mints FVC to buyer wallet", async () => {
      const usdtAmount = ethers.parseUnits("1000", 6);
      await usdt.connect(buyer).approve(await sale.getAddress(), usdtAmount);
      await sale.connect(buyer).buy(await usdt.getAddress(), usdtAmount);

      const expectedFVC = (usdtAmount * BigInt(1e18)) / BigInt(RATE);
      expect(await fvc.balanceOf(buyer.address)).to.equal(expectedFVC);
    });

    it("$1000 USDT at $0.025 = 40,000 FVC", async () => {
      const usdtAmount = ethers.parseUnits("1000", 6);
      await usdt.connect(buyer).approve(await sale.getAddress(), usdtAmount);
      await sale.connect(buyer).buy(await usdt.getAddress(), usdtAmount);

      expect(await fvc.balanceOf(buyer.address)).to.equal(ethers.parseEther("40000"));
    });

    it("sends USDT to beneficiary (Gnosis Safe)", async () => {
      const usdtAmount = ethers.parseUnits("3000", 6);
      await usdt.connect(buyer).approve(await sale.getAddress(), usdtAmount);
      await sale.connect(buyer).buy(await usdt.getAddress(), usdtAmount);

      expect(await usdt.balanceOf(beneficiary.address)).to.equal(usdtAmount);
    });

    it("emits TokensPurchased event with USDT address", async () => {
      const usdtAmount = ethers.parseUnits("750", 6);
      const expectedFVC = (usdtAmount * BigInt(1e18)) / BigInt(RATE);

      await usdt.connect(buyer).approve(await sale.getAddress(), usdtAmount);
      await expect(
        sale.connect(buyer).buy(await usdt.getAddress(), usdtAmount)
      )
        .to.emit(sale, "TokensPurchased")
        .withArgs(buyer.address, await usdt.getAddress(), usdtAmount, expectedFVC);
    });
  });

  // ????????????????????????????????????????????????
  // MIXED STABLECOIN PURCHASES
  // ????????????????????????????????????????????????

  describe("Mixed USDC + USDT purchases", function () {
    it("tracks raised across both stablecoins", async () => {
      const usdcAmount = ethers.parseUnits("10000", 6);
      const usdtAmount = ethers.parseUnits("5000", 6);

      await usdc.connect(buyer).approve(await sale.getAddress(), usdcAmount);
      await sale.connect(buyer).buy(await usdc.getAddress(), usdcAmount);

      await usdt.connect(buyer).approve(await sale.getAddress(), usdtAmount);
      await sale.connect(buyer).buy(await usdt.getAddress(), usdtAmount);

      expect(await sale.raised()).to.equal(usdcAmount + usdtAmount);
    });

    it("buyer accumulates FVC from both stablecoins", async () => {
      const usdcAmount = ethers.parseUnits("2000", 6);
      const usdtAmount = ethers.parseUnits("3000", 6);
      const totalStable = usdcAmount + usdtAmount;

      await usdc.connect(buyer).approve(await sale.getAddress(), usdcAmount);
      await sale.connect(buyer).buy(await usdc.getAddress(), usdcAmount);

      await usdt.connect(buyer).approve(await sale.getAddress(), usdtAmount);
      await sale.connect(buyer).buy(await usdt.getAddress(), usdtAmount);

      const expectedFVC = (totalStable * BigInt(1e18)) / BigInt(RATE);
      expect(await fvc.balanceOf(buyer.address)).to.equal(expectedFVC);
    });

    it("cap applies to combined USDC + USDT total", async () => {
      const smallCap = ethers.parseUnits("5000", 6);
      await sale.connect(beneficiary).setCap(smallCap);

      const usdcAmount = ethers.parseUnits("3000", 6);
      await usdc.connect(buyer).approve(await sale.getAddress(), usdcAmount);
      await sale.connect(buyer).buy(await usdc.getAddress(), usdcAmount);

      const usdtAmount = ethers.parseUnits("3000", 6);
      await usdt.connect(buyer).approve(await sale.getAddress(), usdtAmount);
      await expect(
        sale.connect(buyer).buy(await usdt.getAddress(), usdtAmount)
      ).to.be.revertedWithCustomError(sale, "Sale__CapExceeded");
    });
  });

  // ????????????????????????????????????????????????
  // POST-PURCHASE WALLET VISIBILITY
  // ????????????????????????????????????????????????

  describe("Post-purchase wallet visibility", function () {
    it("buyer has non-zero balance immediately after purchase", async () => {
      const usdcAmount = ethers.parseUnits("100", 6);
      await usdc.connect(buyer).approve(await sale.getAddress(), usdcAmount);
      await sale.connect(buyer).buy(await usdc.getAddress(), usdcAmount);

      expect(await fvc.balanceOf(buyer.address)).to.be.gt(0);
    });

    it("purchase emits Transfer from zero address (detectable by wallet indexers)", async () => {
      const usdcAmount = ethers.parseUnits("250", 6);
      const expectedFVC = (usdcAmount * BigInt(1e18)) / BigInt(RATE);

      await usdc.connect(buyer).approve(await sale.getAddress(), usdcAmount);
      await expect(
        sale.connect(buyer).buy(await usdc.getAddress(), usdcAmount)
      )
        .to.emit(fvc, "Transfer")
        .withArgs(ethers.ZeroAddress, buyer.address, expectedFVC);
    });

    it("token address is deterministic and queryable for wallet_watchAsset", async () => {
      const address = await fvc.getAddress();
      expect(address).to.match(/^0x[0-9a-fA-F]{40}$/);
    });

    it("balanceOf returns correct value for wallet display", async () => {
      const usdcAmount = ethers.parseUnits("10000", 6);
      await usdc.connect(buyer).approve(await sale.getAddress(), usdcAmount);
      await sale.connect(buyer).buy(await usdc.getAddress(), usdcAmount);

      expect(await fvc.balanceOf(buyer.address)).to.equal(ethers.parseEther("400000"));
    });

    it("multiple buyers each have independent balances", async () => {
      const amount1 = ethers.parseUnits("5000", 6);
      const amount2 = ethers.parseUnits("2000", 6);

      await usdc.connect(buyer).approve(await sale.getAddress(), amount1);
      await sale.connect(buyer).buy(await usdc.getAddress(), amount1);

      await usdc.connect(buyer2).approve(await sale.getAddress(), amount2);
      await sale.connect(buyer2).buy(await usdc.getAddress(), amount2);

      const expected1 = (amount1 * BigInt(1e18)) / BigInt(RATE);
      const expected2 = (amount2 * BigInt(1e18)) / BigInt(RATE);

      expect(await fvc.balanceOf(buyer.address)).to.equal(expected1);
      expect(await fvc.balanceOf(buyer2.address)).to.equal(expected2);
    });

    it("totalSupply reflects all minted FVC across buyers", async () => {
      const amount1 = ethers.parseUnits("1000", 6);
      const amount2 = ethers.parseUnits("500", 6);

      await usdc.connect(buyer).approve(await sale.getAddress(), amount1);
      await sale.connect(buyer).buy(await usdc.getAddress(), amount1);

      await usdc.connect(buyer2).approve(await sale.getAddress(), amount2);
      await sale.connect(buyer2).buy(await usdc.getAddress(), amount2);

      const expectedTotal = ((amount1 + amount2) * BigInt(1e18)) / BigInt(RATE);
      expect(await fvc.totalSupply()).to.equal(expectedTotal);
    });
  });

  // ????????????????????????????????????????????????
  // REVERT CONDITIONS
  // ????????????????????????????????????????????????

  describe("Revert conditions", function () {
    it("reverts when sale is inactive", async () => {
      await sale.connect(beneficiary).setActive(false);
      const amount = ethers.parseUnits("100", 6);
      await usdc.connect(buyer).approve(await sale.getAddress(), amount);

      await expect(
        sale.connect(buyer).buy(await usdc.getAddress(), amount)
      ).to.be.revertedWithCustomError(sale, "Sale__Inactive");
    });

    it("reverts with zero amount", async () => {
      await expect(
        sale.connect(buyer).buy(await usdc.getAddress(), 0)
      ).to.be.revertedWithCustomError(sale, "Sale__ZeroAmount");
    });

    it("reverts with unaccepted token", async () => {
      const MockStable = await ethers.getContractFactory("MockStable");
      const dai = await MockStable.deploy("Dai Stablecoin", "DAI", 18);
      await dai.waitForDeployment();
      await dai.mint(buyer.address, ethers.parseEther("1000"));
      await dai.connect(buyer).approve(await sale.getAddress(), ethers.parseEther("1000"));

      await expect(
        sale.connect(buyer).buy(await dai.getAddress(), ethers.parseEther("1000"))
      ).to.be.revertedWithCustomError(sale, "Sale__TokenNotAccepted");
    });

    it("reverts when cap is exceeded", async () => {
      const tightCap = ethers.parseUnits("1000", 6);
      await sale.connect(beneficiary).setCap(tightCap);

      const amount = ethers.parseUnits("1001", 6);
      await usdc.connect(buyer).approve(await sale.getAddress(), amount);

      await expect(
        sale.connect(buyer).buy(await usdc.getAddress(), amount)
      ).to.be.revertedWithCustomError(sale, "Sale__CapExceeded");
    });

    it("reverts without approval", async () => {
      const amount = ethers.parseUnits("100", 6);
      await expect(
        sale.connect(buyer).buy(await usdc.getAddress(), amount)
      ).to.be.reverted;
    });
  });

  // ????????????????????????????????????????????????
  // OWNER CONTROLS (Gnosis Safe)
  // ????????????????????????????????????????????????

  describe("Owner controls (Gnosis Safe)", function () {
    it("owner can update rate between tranches", async () => {
      const newRate = 50_000;
      await sale.connect(beneficiary).setRate(newRate);
      expect(await sale.rate()).to.equal(newRate);
    });

    it("rate change affects subsequent purchases", async () => {
      const amount = ethers.parseUnits("1000", 6);
      await usdc.connect(buyer).approve(await sale.getAddress(), amount * 2n);
      await sale.connect(buyer).buy(await usdc.getAddress(), amount);
      const balAt025 = await fvc.balanceOf(buyer.address);

      await sale.connect(beneficiary).setRate(50_000);
      await sale.connect(buyer).buy(await usdc.getAddress(), amount);
      const balAfter = await fvc.balanceOf(buyer.address);

      const secondPurchaseFVC = balAfter - balAt025;
      expect(secondPurchaseFVC).to.equal(balAt025 / 2n);
    });

    it("owner can pause and resume sale", async () => {
      await sale.connect(beneficiary).setActive(false);
      const amount = ethers.parseUnits("100", 6);
      await usdc.connect(buyer).approve(await sale.getAddress(), amount);

      await expect(
        sale.connect(buyer).buy(await usdc.getAddress(), amount)
      ).to.be.revertedWithCustomError(sale, "Sale__Inactive");

      await sale.connect(beneficiary).setActive(true);
      await sale.connect(buyer).buy(await usdc.getAddress(), amount);
      expect(await fvc.balanceOf(buyer.address)).to.be.gt(0);
    });

    it("owner can update cap", async () => {
      const newCap = ethers.parseUnits("50000000", 6);
      await sale.connect(beneficiary).setCap(newCap);
      expect(await sale.cap()).to.equal(newCap);
    });

    it("non-owner cannot set rate", async () => {
      await expect(sale.connect(buyer).setRate(50_000)).to.be.reverted;
    });

    it("non-owner cannot toggle active", async () => {
      await expect(sale.connect(buyer).setActive(false)).to.be.reverted;
    });

    it("non-owner cannot add accepted tokens", async () => {
      const MockStable = await ethers.getContractFactory("MockStable");
      const fake = await MockStable.deploy("Fake", "FAKE", 6);
      await fake.waitForDeployment();
      await expect(
        sale.connect(buyer).setAcceptedToken(await fake.getAddress(), true, 6)
      ).to.be.reverted;
    });
  });

  // ????????????????????????????????????????????????
  // VESTING (large purchases)
  // ????????????????????????????????????????????????

  describe("Vesting integration (large purchases)", function () {
    let vesting: Contract;

    beforeEach(async () => {
      const Vesting = await ethers.getContractFactory("Vesting");
      vesting = await Vesting.deploy(await fvc.getAddress());
      await vesting.waitForDeployment();

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

    it("purchase below threshold mints directly to buyer", async () => {
      const amount = ethers.parseUnits("10000", 6);
      await usdc.connect(buyer).approve(await sale.getAddress(), amount);

      await expect(
        sale.connect(buyer).buy(await usdc.getAddress(), amount)
      ).to.emit(sale, "TokensPurchased");

      expect(await fvc.balanceOf(buyer.address)).to.be.gt(0);
    });

    it("purchase at threshold creates vesting schedule", async () => {
      const amount = ethers.parseUnits("50000", 6);
      await usdc.connect(buyer).approve(await sale.getAddress(), amount);

      await expect(
        sale.connect(buyer).buy(await usdc.getAddress(), amount)
      ).to.emit(sale, "TokensPurchasedWithVesting");

      expect(await fvc.balanceOf(buyer.address)).to.equal(0);
    });

    it("purchase above threshold creates vesting schedule", async () => {
      await usdc.mint(buyer.address, ethers.parseUnits("200000", 6));
      const amount = ethers.parseUnits("100000", 6);
      await usdc.connect(buyer).approve(await sale.getAddress(), amount);

      await expect(
        sale.connect(buyer).buy(await usdc.getAddress(), amount)
      ).to.emit(sale, "TokensPurchasedWithVesting");

      expect(await fvc.balanceOf(buyer.address)).to.equal(0);
      const expectedFVC = (amount * BigInt(1e18)) / BigInt(RATE);
      expect(await fvc.balanceOf(await vesting.getAddress())).to.equal(expectedFVC);
    });

    it("USDT large purchase also triggers vesting", async () => {
      await usdt.mint(buyer.address, ethers.parseUnits("200000", 6));
      const amount = ethers.parseUnits("60000", 6);
      await usdt.connect(buyer).approve(await sale.getAddress(), amount);

      await expect(
        sale.connect(buyer).buy(await usdt.getAddress(), amount)
      ).to.emit(sale, "TokensPurchasedWithVesting");

      expect(await fvc.balanceOf(buyer.address)).to.equal(0);
    });
  });
});
