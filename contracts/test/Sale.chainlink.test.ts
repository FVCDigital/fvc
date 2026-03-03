import { expect } from "chai";
import { ethers } from "hardhat";
import type { Contract } from "ethers";

/**
 * Chainlink oracle integration tests for Sale.buyWithETH().
 *
 * Cases covered:
 *   - Live oracle price used when fresh and positive
 *   - Stale oracle falls back to manual ethUsdRate
 *   - Zero/negative oracle answer falls back to manual ethUsdRate
 *   - No oracle + no manual rate → revert Sale__EthNotEnabled
 *   - No oracle + manual rate → manual rate used
 *   - Oracle present + manual rate set → oracle takes priority
 *   - Oracle removed (setPriceFeed(0)) → falls back to manual rate
 *   - Staleness threshold configurable by owner
 *   - getEthUsdPrice() view reflects correct source
 *   - Owner can update price feed address
 *   - Non-owner cannot update price feed or staleness threshold
 *   - FVC amount calculation is correct from oracle price
 */
describe("Sale – Chainlink oracle integration", function () {
  let deployer: any;
  let owner: any;
  let buyer: any;

  let fvc: Contract;
  let sale: Contract;
  let oracle: Contract;
  let usdc: Contract;

  const RATE = 25_000;                              // $0.025 per FVC
  const CAP = ethers.parseUnits("20000000", 6);
  const ETH_PRICE_8DEC = 250_000_000_000n;          // $2,500 with 8 decimals (Chainlink standard)
  const ETH_PRICE_6DEC = 2_500_000_000n;            // $2,500 with 6 decimals (internal format)
  const STALENESS = 3600;                           // 1 hour default

  beforeEach(async () => {
    [deployer, owner, buyer] = await ethers.getSigners();

    const FVC = await ethers.getContractFactory("FVC");
    fvc = await FVC.deploy(deployer.address);
    await fvc.waitForDeployment();

    const MockStable = await ethers.getContractFactory("MockStable");
    usdc = await MockStable.deploy("USD Coin", "USDC", 6);
    await usdc.waitForDeployment();

    const MockAggregator = await ethers.getContractFactory("MockAggregator");
    oracle = await MockAggregator.deploy(ETH_PRICE_8DEC, 8);
    await oracle.waitForDeployment();

    const Sale = await ethers.getContractFactory("Sale");
    sale = await Sale.deploy(
      await fvc.getAddress(),
      owner.address,
      RATE,
      CAP,
      await oracle.getAddress()
    );
    await sale.waitForDeployment();

    const MINTER_ROLE = await fvc.MINTER_ROLE();
    await fvc.grantRole(MINTER_ROLE, await sale.getAddress());

    await sale.connect(owner).setAcceptedToken(await usdc.getAddress(), true, 6);
    await sale.connect(owner).setActive(true);
  });

  // ── Price sourcing ──────────────────────────────────────────────────────────

  describe("Price sourcing", function () {
    it("uses oracle price when fresh and positive", async () => {
      const [price, fromOracle] = await sale.getEthUsdPrice();
      expect(fromOracle).to.be.true;
      expect(price).to.equal(ETH_PRICE_6DEC);
    });

    it("falls back to manual rate when oracle is stale", async () => {
      const manualRate = ethers.parseUnits("3000", 6);
      await sale.connect(owner).setEthUsdRate(manualRate);

      await oracle.setStale(STALENESS + 1);

      const [price, fromOracle] = await sale.getEthUsdPrice();
      expect(fromOracle).to.be.false;
      expect(price).to.equal(manualRate);
    });

    it("falls back to manual rate when oracle returns zero price", async () => {
      const manualRate = ethers.parseUnits("2800", 6);
      await sale.connect(owner).setEthUsdRate(manualRate);
      await oracle.setPrice(0);

      const [price, fromOracle] = await sale.getEthUsdPrice();
      expect(fromOracle).to.be.false;
      expect(price).to.equal(manualRate);
    });

    it("falls back to manual rate when oracle returns negative price", async () => {
      const manualRate = ethers.parseUnits("2800", 6);
      await sale.connect(owner).setEthUsdRate(manualRate);
      await oracle.setPrice(-1);

      const [price, fromOracle] = await sale.getEthUsdPrice();
      expect(fromOracle).to.be.false;
      expect(price).to.equal(manualRate);
    });

    it("oracle takes priority over manual rate when both are set", async () => {
      await sale.connect(owner).setEthUsdRate(ethers.parseUnits("9999", 6));

      const [price, fromOracle] = await sale.getEthUsdPrice();
      expect(fromOracle).to.be.true;
      expect(price).to.equal(ETH_PRICE_6DEC);
    });

    it("returns manual rate when no oracle is set", async () => {
      const Sale = await ethers.getContractFactory("Sale");
      const saleNoOracle = await Sale.deploy(
        await fvc.getAddress(), owner.address, RATE, CAP, ethers.ZeroAddress
      );
      await saleNoOracle.waitForDeployment();
      await saleNoOracle.connect(owner).setEthUsdRate(ethers.parseUnits("2500", 6));

      const [price, fromOracle] = await saleNoOracle.getEthUsdPrice();
      expect(fromOracle).to.be.false;
      expect(price).to.equal(ethers.parseUnits("2500", 6));
    });

    it("returns 0 when no oracle and no manual rate (ETH disabled)", async () => {
      const Sale = await ethers.getContractFactory("Sale");
      const saleNoOracle = await Sale.deploy(
        await fvc.getAddress(), owner.address, RATE, CAP, ethers.ZeroAddress
      );
      await saleNoOracle.waitForDeployment();

      const [price] = await saleNoOracle.getEthUsdPrice();
      expect(price).to.equal(0);
    });
  });

  // ── buyWithETH behaviour ────────────────────────────────────────────────────

  describe("buyWithETH with oracle", function () {
    it("mints correct FVC amount using oracle price", async () => {
      const ethAmount = ethers.parseEther("1");
      // $2,500 / $0.025 = 100,000 FVC
      await sale.connect(buyer).buyWithETH({ value: ethAmount });
      expect(await fvc.balanceOf(buyer.address)).to.equal(ethers.parseEther("100000"));
    });

    it("uses updated oracle price after price change", async () => {
      await oracle.setPrice(500_000_000_000n); // $5,000 with 8 decimals

      const ethAmount = ethers.parseEther("1");
      await sale.connect(buyer).buyWithETH({ value: ethAmount });
      // $5,000 / $0.025 = 200,000 FVC
      expect(await fvc.balanceOf(buyer.address)).to.equal(ethers.parseEther("200000"));
    });

    it("uses manual fallback rate when oracle is stale", async () => {
      await oracle.setStale(STALENESS + 1);
      await sale.connect(owner).setEthUsdRate(ethers.parseUnits("1000", 6));

      const ethAmount = ethers.parseEther("1");
      await sale.connect(buyer).buyWithETH({ value: ethAmount });
      // $1,000 / $0.025 = 40,000 FVC
      expect(await fvc.balanceOf(buyer.address)).to.equal(ethers.parseEther("40000"));
    });

    it("reverts when oracle is stale and no manual fallback set", async () => {
      await oracle.setStale(STALENESS + 1);
      // ethUsdRate defaults to 0

      await expect(
        sale.connect(buyer).buyWithETH({ value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(sale, "Sale__EthNotEnabled");
    });

    it("reverts when oracle removed and no manual rate", async () => {
      await sale.connect(owner).setPriceFeed(ethers.ZeroAddress);

      await expect(
        sale.connect(buyer).buyWithETH({ value: ethers.parseEther("1") })
      ).to.be.revertedWithCustomError(sale, "Sale__EthNotEnabled");
    });

    it("uses manual rate after oracle is removed via setPriceFeed(0)", async () => {
      await sale.connect(owner).setPriceFeed(ethers.ZeroAddress);
      await sale.connect(owner).setEthUsdRate(ethers.parseUnits("2000", 6));

      await sale.connect(buyer).buyWithETH({ value: ethers.parseEther("1") });
      // $2,000 / $0.025 = 80,000 FVC
      expect(await fvc.balanceOf(buyer.address)).to.equal(ethers.parseEther("80000"));
    });

    it("emits TokensPurchasedWithETH with correct USD equivalent", async () => {
      const ethAmount = ethers.parseEther("2");
      const expectedUsd = (ethAmount * ETH_PRICE_6DEC) / ethers.parseEther("1");
      const expectedFVC = (expectedUsd * ethers.parseEther("1")) / BigInt(RATE);

      await expect(
        sale.connect(buyer).buyWithETH({ value: ethAmount })
      ).to.emit(sale, "TokensPurchasedWithETH")
        .withArgs(buyer.address, ethAmount, expectedUsd, expectedFVC);
    });

    it("forwards ETH to beneficiary regardless of price source", async () => {
      const ethAmount = ethers.parseEther("1");
      const balBefore = await ethers.provider.getBalance(owner.address);
      await sale.connect(buyer).buyWithETH({ value: ethAmount });
      const balAfter = await ethers.provider.getBalance(owner.address);
      expect(balAfter - balBefore).to.equal(ethAmount);
    });
  });

  // ── Staleness threshold ─────────────────────────────────────────────────────

  describe("Staleness threshold", function () {
    it("defaults to 1 hour", async () => {
      expect(await sale.stalenessThreshold()).to.equal(3600);
    });

    it("oracle accepted when age equals threshold exactly", async () => {
      await oracle.setStale(STALENESS); // age == threshold: still fresh
      const [, fromOracle] = await sale.getEthUsdPrice();
      expect(fromOracle).to.be.true;
    });

    it("oracle rejected when age exceeds threshold by 1 second", async () => {
      await oracle.setStale(STALENESS + 1);
      const [, fromOracle] = await sale.getEthUsdPrice();
      expect(fromOracle).to.be.false;
    });

    it("owner can tighten staleness threshold to 5 minutes", async () => {
      await sale.connect(owner).setStalenessThreshold(300);
      expect(await sale.stalenessThreshold()).to.equal(300);

      await oracle.setStale(301);
      const [, fromOracle] = await sale.getEthUsdPrice();
      expect(fromOracle).to.be.false;
    });

    it("owner can loosen staleness threshold to 24 hours", async () => {
      await sale.connect(owner).setStalenessThreshold(86400);
      await oracle.setStale(3601); // stale under old threshold, fresh under new

      const [, fromOracle] = await sale.getEthUsdPrice();
      expect(fromOracle).to.be.true;
    });

    it("emits StalenessThresholdUpdated event", async () => {
      await expect(
        sale.connect(owner).setStalenessThreshold(600)
      ).to.emit(sale, "StalenessThresholdUpdated").withArgs(600);
    });

    it("non-owner cannot set staleness threshold", async () => {
      await expect(
        sale.connect(buyer).setStalenessThreshold(60)
      ).to.be.reverted;
    });
  });

  // ── setPriceFeed ────────────────────────────────────────────────────────────

  describe("setPriceFeed", function () {
    it("owner can swap to a new oracle", async () => {
      const MockAggregator = await ethers.getContractFactory("MockAggregator");
      const oracle2 = await MockAggregator.deploy(300_000_000_000n, 8); // $3,000 with 8 decimals
      await oracle2.waitForDeployment();

      await sale.connect(owner).setPriceFeed(await oracle2.getAddress());

      const [price, fromOracle] = await sale.getEthUsdPrice();
      expect(fromOracle).to.be.true;
      expect(price).to.equal(ethers.parseUnits("3000", 6));
    });

    it("emits PriceFeedUpdated event", async () => {
      await expect(
        sale.connect(owner).setPriceFeed(ethers.ZeroAddress)
      ).to.emit(sale, "PriceFeedUpdated").withArgs(ethers.ZeroAddress);
    });

    it("non-owner cannot set price feed", async () => {
      await expect(
        sale.connect(buyer).setPriceFeed(ethers.ZeroAddress)
      ).to.be.reverted;
    });
  });

  // ── Oracle decimal normalisation ────────────────────────────────────────────

  describe("Oracle decimal normalisation", function () {
    it("correctly normalises 8-decimal feed to 6-decimal internal price", async () => {
      // $2,500 with 8 decimals = 250000000000
      // Expected internal: 2500000000 (6 decimals)
      const [price] = await sale.getEthUsdPrice();
      expect(price).to.equal(2_500_000_000n);
    });

    it("correctly normalises a 6-decimal feed (no scaling needed)", async () => {
      const MockAggregator = await ethers.getContractFactory("MockAggregator");
      const oracle6 = await MockAggregator.deploy(2_500_000_000n, 6); // $2,500 with 6 decimals
      await oracle6.waitForDeployment();
      await sale.connect(owner).setPriceFeed(await oracle6.getAddress());

      const [price] = await sale.getEthUsdPrice();
      expect(price).to.equal(2_500_000_000n);
    });

    it("correctly normalises a 18-decimal feed (scale down)", async () => {
      const MockAggregator = await ethers.getContractFactory("MockAggregator");
      const oracle18 = await MockAggregator.deploy(2500n * 1_000_000_000_000_000_000n, 18); // $2,500 with 18 decimals
      await oracle18.waitForDeployment();
      await sale.connect(owner).setPriceFeed(await oracle18.getAddress());

      const [price] = await sale.getEthUsdPrice();
      expect(price).to.equal(2_500_000_000n);
    });
  });
});
