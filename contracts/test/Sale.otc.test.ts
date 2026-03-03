import { expect } from "chai";
import { ethers } from "hardhat";
import type { Contract } from "ethers";

/**
 * OTC minting and cliff/vesting curve tests.
 *
 * Cliff: 12 months (365 days)
 * Duration: 24 months (730 days)
 * Vesting curve: 0% at cliff, linear 0→100% over the 12-month window after cliff.
 */
describe("Sale – OTC minting & vesting curve", function () {
  let deployer: any;
  let owner: any;
  let otcRecipient: any;
  let buyer: any;

  let fvc: Contract;
  let sale: Contract;
  let vesting: Contract;
  let usdc: Contract;

  const RATE = 25_000;
  const CAP = ethers.parseUnits("20000000", 6);

  const CLIFF = 365 * 24 * 60 * 60;    // 12 months
  const DURATION = 730 * 24 * 60 * 60; // 24 months

  beforeEach(async () => {
    [deployer, owner, otcRecipient, buyer] = await ethers.getSigners();

    const FVC = await ethers.getContractFactory("FVC");
    fvc = await FVC.deploy(deployer.address);
    await fvc.waitForDeployment();

    const MockStable = await ethers.getContractFactory("MockStable");
    usdc = await MockStable.deploy("USD Coin", "USDC", 6);
    await usdc.waitForDeployment();
    await usdc.mint(buyer.address, ethers.parseUnits("500000", 6));

    const Sale = await ethers.getContractFactory("Sale");
    sale = await Sale.deploy(await fvc.getAddress(), owner.address, RATE, CAP);
    await sale.waitForDeployment();

    const MINTER_ROLE = await fvc.MINTER_ROLE();
    await fvc.grantRole(MINTER_ROLE, await sale.getAddress());

    await sale.connect(owner).setAcceptedToken(await usdc.getAddress(), true, 6);
    await sale.connect(owner).setActive(true);

    const Vesting = await ethers.getContractFactory("Vesting");
    vesting = await Vesting.deploy(await fvc.getAddress());
    await vesting.waitForDeployment();
    await vesting.transferOwnership(await sale.getAddress());

    await sale.connect(owner).setVestingConfig(
      await vesting.getAddress(),
      ethers.parseUnits("50000", 6),
      CLIFF,
      DURATION
    );
  });

  // ----------------------------------------------------------------
  // OTC – direct mint (no vesting)
  // ----------------------------------------------------------------

  describe("mintOTC – direct (duration = 0)", function () {
    it("mints FVC directly to recipient wallet", async () => {
      const amount = ethers.parseEther("1000000");
      await sale.connect(owner).mintOTC(otcRecipient.address, amount, 0, 0);
      expect(await fvc.balanceOf(otcRecipient.address)).to.equal(amount);
    });

    it("emits TokensPurchased event", async () => {
      const amount = ethers.parseEther("500000");
      await expect(
        sale.connect(owner).mintOTC(otcRecipient.address, amount, 0, 0)
      ).to.emit(sale, "TokensPurchased");
    });

    it("non-owner cannot call mintOTC", async () => {
      await expect(
        sale.connect(buyer).mintOTC(otcRecipient.address, ethers.parseEther("1000"), 0, 0)
      ).to.be.reverted;
    });

    it("reverts on zero address recipient", async () => {
      await expect(
        sale.connect(owner).mintOTC(ethers.ZeroAddress, ethers.parseEther("1000"), 0, 0)
      ).to.be.revertedWithCustomError(sale, "Sale__ZeroAddress");
    });

    it("reverts on zero amount", async () => {
      await expect(
        sale.connect(owner).mintOTC(otcRecipient.address, 0, 0, 0)
      ).to.be.revertedWithCustomError(sale, "Sale__ZeroAmount");
    });

    it("does not increment raised", async () => {
      const raisedBefore = await sale.raised();
      await sale.connect(owner).mintOTC(otcRecipient.address, ethers.parseEther("1000000"), 0, 0);
      expect(await sale.raised()).to.equal(raisedBefore);
    });
  });

  // ----------------------------------------------------------------
  // OTC – vested mint (12-month cliff, 24-month duration)
  // ----------------------------------------------------------------

  describe("mintOTC – vested (cliff=12mo, duration=24mo)", function () {
    const OTC_AMOUNT = ethers.parseEther("4000000");

    beforeEach(async () => {
      await sale.connect(owner).mintOTC(otcRecipient.address, OTC_AMOUNT, CLIFF, DURATION);
    });

    it("tokens held in vesting contract, not recipient wallet", async () => {
      expect(await fvc.balanceOf(otcRecipient.address)).to.equal(0);
      expect(await fvc.balanceOf(await vesting.getAddress())).to.equal(OTC_AMOUNT);
    });

    it("emits TokensPurchasedWithVesting event", async () => {
      const [, , , , recipient2] = await ethers.getSigners();
      const amount2 = ethers.parseEther("1000000");
      await expect(
        sale.connect(owner).mintOTC(recipient2.address, amount2, CLIFF, DURATION)
      ).to.emit(sale, "TokensPurchasedWithVesting")
        .withArgs(recipient2.address, amount2, CLIFF, DURATION);
    });

    it("0% releasable before cliff", async () => {
      expect(await vesting.releasableAmount(otcRecipient.address, 0)).to.equal(0);
    });

    it("0% releasable at exactly cliff boundary", async () => {
      await ethers.provider.send("evm_increaseTime", [CLIFF]);
      await ethers.provider.send("evm_mine", []);
      expect(await vesting.releasableAmount(otcRecipient.address, 0)).to.equal(0);
    });

    it("~50% releasable at cliff + 6 months (midpoint of vesting window)", async () => {
      const SIX_MONTHS = 182 * 24 * 60 * 60;
      await ethers.provider.send("evm_increaseTime", [CLIFF + SIX_MONTHS]);
      await ethers.provider.send("evm_mine", []);

      const releasable = await vesting.releasableAmount(otcRecipient.address, 0);
      const vestingWindow = DURATION - CLIFF;
      const expected = (OTC_AMOUNT * BigInt(SIX_MONTHS)) / BigInt(vestingWindow);
      const tolerance = OTC_AMOUNT / 1000n;
      expect(releasable).to.be.closeTo(expected, tolerance);
    });

    it("100% releasable at full duration", async () => {
      await ethers.provider.send("evm_increaseTime", [DURATION + 1]);
      await ethers.provider.send("evm_mine", []);
      expect(await vesting.releasableAmount(otcRecipient.address, 0)).to.equal(OTC_AMOUNT);
    });

    it("recipient can release tokens after full duration", async () => {
      await ethers.provider.send("evm_increaseTime", [DURATION + 1]);
      await ethers.provider.send("evm_mine", []);
      await vesting.connect(otcRecipient).release(0);
      expect(await fvc.balanceOf(otcRecipient.address)).to.equal(OTC_AMOUNT);
    });

    it("same investor can receive a second OTC allocation with different terms", async () => {
      // Top-up with a 6-month cliff, 12-month duration
      const CLIFF2 = 180 * 24 * 60 * 60;
      const DURATION2 = 365 * 24 * 60 * 60;
      const AMOUNT2 = ethers.parseEther("500000");

      await sale.connect(owner).mintOTC(otcRecipient.address, AMOUNT2, CLIFF2, DURATION2);

      expect(await vesting.scheduleCount(otcRecipient.address)).to.equal(2);

      // Schedule 0: 12-month cliff still locked
      expect(await vesting.releasableAmount(otcRecipient.address, 0)).to.equal(0);

      // Schedule 1: 6-month cliff — advance past it
      await ethers.provider.send("evm_increaseTime", [DURATION2 + 1]);
      await ethers.provider.send("evm_mine", []);
      expect(await vesting.releasableAmount(otcRecipient.address, 1)).to.equal(AMOUNT2);
    });
  });

  // ----------------------------------------------------------------
  // buy() vesting curve — same 12/24 config
  // ----------------------------------------------------------------

  describe("buy() vesting curve – 12-month cliff, 24-month linear", function () {
    it("large purchase: 0% at cliff, 100% at duration", async () => {
      const amount = ethers.parseUnits("100000", 6);
      await usdc.mint(buyer.address, amount);
      await usdc.connect(buyer).approve(await sale.getAddress(), amount);
      await sale.connect(buyer).buy(await usdc.getAddress(), amount);

      const fvcAmount = (amount * BigInt(1e18)) / BigInt(RATE);

      expect(await vesting.releasableAmount(buyer.address, 0)).to.equal(0);

      await ethers.provider.send("evm_increaseTime", [CLIFF]);
      await ethers.provider.send("evm_mine", []);
      expect(await vesting.releasableAmount(buyer.address, 0)).to.equal(0);

      await ethers.provider.send("evm_increaseTime", [DURATION - CLIFF + 1]);
      await ethers.provider.send("evm_mine", []);
      expect(await vesting.releasableAmount(buyer.address, 0)).to.equal(fvcAmount);
    });
  });
});
