import { expect } from "chai";
import { ethers } from "hardhat";
import type { Contract } from "ethers";

/**
 * Spec, structural and mutation tests for the no-vesting (duration=0) mintOTC path.
 *
 * These tests verify the invariants that the /hamidou page relies on:
 *   1. mintOTC(recipient, amount, 0, 0) mints directly to recipient wallet — no vesting contract involved.
 *   2. The recipient's FVC balance increases by exactly fvcAmount immediately.
 *   3. The vesting contract holds zero tokens.
 *   4. No vesting schedule is created.
 *   5. raised is NOT incremented (OTC is off-chain payment).
 *   6. Only the owner can call mintOTC.
 *   7. Mutation guards: cliff > 0 with duration = 0 still mints directly (duration is the gate).
 *   8. Mutation guard: vestingThreshold=0 on buy() still vests — proving buy() is NOT the right path.
 */
describe("Sale – no-vesting mintOTC spec (hamidou invariants)", function () {
  let owner: any;
  let recipient: any;
  let attacker: any;

  let fvc: Contract;
  let sale: Contract;
  let vesting: Contract;
  let usdc: Contract;

  const RATE = 25_000; // 0.025 USDC per FVC (6 decimals)
  const CAP  = ethers.parseUnits("20000000", 6);
  const CLIFF    = 365 * 24 * 3600;
  const DURATION = 730 * 24 * 3600;

  beforeEach(async () => {
    [, owner, recipient, attacker] = await ethers.getSigners();

    const FVC = await ethers.getContractFactory("FVC");
    fvc = await FVC.deploy(owner.address);
    await fvc.waitForDeployment();

    const MockStable = await ethers.getContractFactory("MockStable");
    usdc = await MockStable.deploy("USD Coin", "USDC", 6);
    await usdc.waitForDeployment();

    const Sale = await ethers.getContractFactory("Sale");
    sale = await Sale.deploy(
      await fvc.getAddress(),
      owner.address,
      RATE,
      CAP,
      ethers.ZeroAddress
    );
    await sale.waitForDeployment();

    const MINTER_ROLE = await fvc.MINTER_ROLE();
    await fvc.connect(owner).grantRole(MINTER_ROLE, await sale.getAddress());

    const Vesting = await ethers.getContractFactory("Vesting");
    vesting = await Vesting.deploy(await fvc.getAddress());
    await vesting.waitForDeployment();
    await vesting.transferOwnership(await sale.getAddress());

    // Configure vesting with threshold=0 (every buy() gets vested)
    await sale.connect(owner).setVestingConfig(
      await vesting.getAddress(),
      0,
      CLIFF,
      DURATION
    );
    await sale.connect(owner).setAcceptedToken(await usdc.getAddress(), true, 6);
    await sale.connect(owner).setActive(true);
  });

  // ─── SPEC: direct delivery ────────────────────────────────────────

  describe("SPEC: mintOTC(recipient, amount, 0, 0) delivers immediately", () => {
    it("recipient balance increases by exact fvcAmount", async () => {
      const fvcAmount = ethers.parseEther("500000");
      const before = await fvc.balanceOf(recipient.address);
      await sale.connect(owner).mintOTC(recipient.address, fvcAmount, 0, 0);
      const after = await fvc.balanceOf(recipient.address);
      expect(after - before).to.equal(fvcAmount);
    });

    it("vesting contract holds zero tokens after mintOTC(…,0,0)", async () => {
      await sale.connect(owner).mintOTC(recipient.address, ethers.parseEther("1000000"), 0, 0);
      expect(await fvc.balanceOf(await vesting.getAddress())).to.equal(0n);
    });

    it("no vesting schedule is created", async () => {
      await sale.connect(owner).mintOTC(recipient.address, ethers.parseEther("1000000"), 0, 0);
      expect(await vesting.scheduleCount(recipient.address)).to.equal(0);
    });

    it("raised is unchanged (off-chain payment)", async () => {
      const raisedBefore = await sale.raised();
      await sale.connect(owner).mintOTC(recipient.address, ethers.parseEther("1000000"), 0, 0);
      expect(await sale.raised()).to.equal(raisedBefore);
    });

    it("emits TokensPurchased (not TokensPurchasedWithVesting)", async () => {
      const fvcAmount = ethers.parseEther("1000000");
      const tx = sale.connect(owner).mintOTC(recipient.address, fvcAmount, 0, 0);
      await expect(tx).to.emit(sale, "TokensPurchased");
      await expect(tx).not.to.emit(sale, "TokensPurchasedWithVesting");
    });

    it("tokens are immediately transferable (no lock)", async () => {
      const fvcAmount = ethers.parseEther("100000");
      await sale.connect(owner).mintOTC(recipient.address, fvcAmount, 0, 0);
      // recipient can transfer immediately — no revert
      const [, , , , other] = await ethers.getSigners();
      await expect(
        fvc.connect(recipient).transfer(other.address, fvcAmount)
      ).not.to.be.reverted;
      expect(await fvc.balanceOf(other.address)).to.equal(fvcAmount);
    });
  });

  // ─── STRUCTURAL: access control ──────────────────────────────────

  describe("STRUCTURAL: access control", () => {
    it("non-owner cannot call mintOTC", async () => {
      await expect(
        sale.connect(attacker).mintOTC(recipient.address, ethers.parseEther("1"), 0, 0)
      ).to.be.reverted;
    });

    it("recipient cannot call mintOTC on their own behalf", async () => {
      await expect(
        sale.connect(recipient).mintOTC(recipient.address, ethers.parseEther("1"), 0, 0)
      ).to.be.reverted;
    });

    it("reverts on zero address recipient", async () => {
      await expect(
        sale.connect(owner).mintOTC(ethers.ZeroAddress, ethers.parseEther("1"), 0, 0)
      ).to.be.revertedWithCustomError(sale, "Sale__ZeroAddress");
    });

    it("reverts on zero fvcAmount", async () => {
      await expect(
        sale.connect(owner).mintOTC(recipient.address, 0, 0, 0)
      ).to.be.revertedWithCustomError(sale, "Sale__ZeroAmount");
    });

    it("reverts if cliff > duration", async () => {
      await expect(
        sale.connect(owner).mintOTC(recipient.address, ethers.parseEther("1"), DURATION, CLIFF)
      ).to.be.revertedWith("Cliff > duration");
    });
  });

  // ─── MUTATION GUARDS ─────────────────────────────────────────────

  describe("MUTATION GUARDS: buy() always vests when vestingContract is set", () => {
    it("buy() with vestingThreshold=0 sends tokens to vesting, NOT to buyer", async () => {
      const usdcAmount = ethers.parseUnits("1000", 6);
      await usdc.mint(recipient.address, usdcAmount);
      await usdc.connect(recipient).approve(await sale.getAddress(), usdcAmount);
      await sale.connect(recipient).buy(await usdc.getAddress(), usdcAmount);

      // Buyer wallet has zero FVC
      expect(await fvc.balanceOf(recipient.address)).to.equal(0n);
      // Vesting contract holds the tokens
      expect(await fvc.balanceOf(await vesting.getAddress())).to.be.gt(0n);
      // A schedule was created
      expect(await vesting.scheduleCount(recipient.address)).to.equal(1);
    });

    it("mintOTC with duration>0 DOES vest (mutation: duration gate works both ways)", async () => {
      const fvcAmount = ethers.parseEther("500000");
      await sale.connect(owner).mintOTC(recipient.address, fvcAmount, CLIFF, DURATION);

      // Wallet has zero — tokens are in vesting
      expect(await fvc.balanceOf(recipient.address)).to.equal(0n);
      expect(await fvc.balanceOf(await vesting.getAddress())).to.equal(fvcAmount);
      expect(await vesting.scheduleCount(recipient.address)).to.equal(1);
    });

    it("mintOTC(…, cliff>0, duration=0) still mints directly — duration is the sole gate", async () => {
      // cliff is ignored when duration=0
      const fvcAmount = ethers.parseEther("100000");
      await sale.connect(owner).mintOTC(recipient.address, fvcAmount, CLIFF, 0);
      expect(await fvc.balanceOf(recipient.address)).to.equal(fvcAmount);
      expect(await fvc.balanceOf(await vesting.getAddress())).to.equal(0n);
    });
  });

  // ─── MULTIPLE ALLOCATIONS ────────────────────────────────────────

  describe("SPEC: multiple no-vesting allocations accumulate correctly", () => {
    it("two mintOTC(…,0,0) calls sum in recipient wallet", async () => {
      const a1 = ethers.parseEther("300000");
      const a2 = ethers.parseEther("700000");
      await sale.connect(owner).mintOTC(recipient.address, a1, 0, 0);
      await sale.connect(owner).mintOTC(recipient.address, a2, 0, 0);
      expect(await fvc.balanceOf(recipient.address)).to.equal(a1 + a2);
      expect(await vesting.scheduleCount(recipient.address)).to.equal(0);
    });
  });
});
