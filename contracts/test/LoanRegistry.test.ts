import { ethers } from "hardhat";
import { expect } from "chai";
import {
  Fixture,
  Status,
  MAX_FACILITY_GBP,
  MIN_RATE_BPS,
  MAX_RATE_BPS,
  MAX_PAYOUT,
  DAILY_LIMIT,
  RATE_BPS,
  MAX_FEE_BPS,
  USDC,
  gbp,
  tokenFor,
  ref,
  agreement,
  smeRef,
  missingRole,
  latestTimestamp,
  loadUnitFixture,
  resetFixtureCache,
  createLoan,
  disburse,
  repay,
  deposit,
} from "./helpers/loanRegistryFixture";
import { LoanModel } from "./helpers/loanModel";

/**
 * LoanRegistry v1: unit suite, one describe per function (spec: contracts/LOAN_REGISTRY.md section 6).
 *
 * Written first in phase S2. Every test fails with HH700 until src/loan/LoanRegistry.sol exists.
 * The Safe holds every operating role; `admin` stands in for the timelock (the security suite
 * uses the real TimelockController).
 *
 * MUTATION GUARDS (contracts/LOAN_REGISTRY.md section 10), killed here:
 *   L01 originator check            L02 zero facility             L03 pause on createLoan
 *   L04 facility bound              L05 payoutRef once            L06 drawing closed on tranche
 *   L07 token allowed on tranche    L08 settlementRef once        L09 owed bound
 *   L10 token allowed on repayment  L11 pull before credit        L12 automatic Repaid
 *   L13 recorder check              L14 to L16 lifecycle sources  L17 risk check on lifecycle
 *   L18 release status              L19 claim status              L20 claim bounded by held
 *   L21 claim bounded by outstanding L22 collateral excluded from forward
 *   L23 forward bound               L24 distributor check         L38 fee limit
 *   L40 no repayment before the first tranche   L42 no collateral claim before the first tranche
 * L25 to L37 are in LoanRegistry.security.test.ts.
 */

describe("LoanRegistry", function () {
  before(resetFixtureCache);

  let fx: Fixture;
  let usdcAddr: string;
  let usdtAddr: string;
  let registryAddr: string;

  async function setup() {
    fx = await loadUnitFixture();
    usdcAddr = await fx.usdc.getAddress();
    usdtAddr = await fx.usdt.getAddress();
    registryAddr = await fx.registry.getAddress();
    return fx;
  }

  // ------------------------------------------------------------------ constructor

  describe("constructor", () => {
    it("grants DEFAULT_ADMIN_ROLE to the timelock argument only", async () => {
      await setup();
      expect(await fx.registry.hasRole(fx.roles.admin, fx.admin.address)).to.equal(true);
      expect(await fx.registry.hasRole(fx.roles.admin, fx.safe.address)).to.equal(false);
    });

    it("grants every operating role and the guardian role to the Safe", async () => {
      await setup();
      for (const role of [fx.roles.originator, fx.roles.recorder, fx.roles.risk, fx.roles.distributor, fx.roles.guardian]) {
        expect(await fx.registry.hasRole(role, fx.safe.address)).to.equal(true);
        expect(await fx.registry.hasRole(role, fx.admin.address)).to.equal(false);
      }
    });

    it("stores the Safe and approves it as a destination", async () => {
      await setup();
      expect(await fx.registry.safe()).to.equal(fx.safe.address);
      expect(await fx.registry.approvedDestination(fx.safe.address)).to.equal(true);
    });

    it("stores the per-loan facility limit and starts with no loans", async () => {
      await setup();
      expect(await fx.registry.maxFacilityGbp()).to.equal(MAX_FACILITY_GBP);
      expect(await fx.registry.loanCount()).to.equal(0n);
    });

    it("starts with the fee limit at half the facility", async () => {
      await setup();
      expect(await fx.registry.maxFeeBps()).to.equal(MAX_FEE_BPS);
    });

    it("allows no token until allowToken is called", async () => {
      const [admin, safe] = await ethers.getSigners();
      const LoanRegistry = await ethers.getContractFactory("LoanRegistry");
      const fresh: any = await LoanRegistry.deploy(admin.address, safe.address, MAX_FACILITY_GBP);
      const MockStable = await ethers.getContractFactory("MockStable");
      const token = await MockStable.deploy("USD Coin", "USDC", 6);
      const config = await fresh.tokenConfig(await token.getAddress());
      expect(config.allowed).to.equal(false);
      expect(config.known).to.equal(false);
    });

    it("reverts on a zero timelock, a zero Safe or a zero facility limit", async () => {
      const [admin, safe] = await ethers.getSigners();
      const LoanRegistry = await ethers.getContractFactory("LoanRegistry");
      await expect(LoanRegistry.deploy(ethers.ZeroAddress, safe.address, MAX_FACILITY_GBP)).to.be.revertedWithCustomError(
        LoanRegistry,
        "LoanRegistry__ZeroAddress"
      );
      await expect(LoanRegistry.deploy(admin.address, ethers.ZeroAddress, MAX_FACILITY_GBP)).to.be.revertedWithCustomError(
        LoanRegistry,
        "LoanRegistry__ZeroAddress"
      );
      await expect(LoanRegistry.deploy(admin.address, safe.address, 0n)).to.be.revertedWithCustomError(
        LoanRegistry,
        "LoanRegistry__ZeroAmount"
      );
    });
  });

  // ------------------------------------------------------------------ createLoan

  describe("createLoan", () => {
    it("creates an Active loan with the agreed terms and emits LoanCreated", async () => {
      await setup();
      const hash = agreement("a");
      const sme = smeRef("sme-a", "salt-a");
      await expect(fx.registry.connect(fx.safe).createLoan(hash, sme, gbp(40_000n), gbp(500n)))
        .to.emit(fx.registry, "LoanCreated")
        .withArgs(1n, hash, sme, gbp(40_000n), gbp(500n));

      const loan = await fx.registry.loans(1n);
      expect(loan.agreementHash).to.equal(hash);
      expect(loan.smeRef).to.equal(sme);
      expect(loan.facilityGbp).to.equal(gbp(40_000n));
      expect(loan.feeGbp).to.equal(gbp(500n));
      expect(loan.disbursedGbp).to.equal(0n);
      expect(loan.repaidGbp).to.equal(0n);
      expect(loan.createdAt).to.equal(BigInt(await latestTimestamp()));
      expect(loan.status).to.equal(Status.Active);
      expect(loan.drawingClosed).to.equal(false);
    });

    it("numbers loans from 1 upward", async () => {
      await setup();
      expect(await createLoan(fx, gbp(10_000n), 0n, "1")).to.equal(1n);
      expect(await createLoan(fx, gbp(10_000n), 0n, "2")).to.equal(2n);
      expect(await fx.registry.loanCount()).to.equal(2n);
    });

    it("accepts a facility exactly at the per-loan limit", async () => {
      await setup();
      await expect(fx.registry.connect(fx.safe).createLoan(agreement(), smeRef(), MAX_FACILITY_GBP, 0n)).to.emit(
        fx.registry,
        "LoanCreated"
      );
    });

    it("reverts above the per-loan limit", async () => {
      await setup();
      await expect(
        fx.registry.connect(fx.safe).createLoan(agreement(), smeRef(), MAX_FACILITY_GBP + 1n, 0n)
      ).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__MaxFacilityExceeded");
    });

    it("accepts a fee exactly at the fee limit", async () => {
      await setup();
      const facility = gbp(40_000n);
      await expect(
        fx.registry.connect(fx.safe).createLoan(agreement(), smeRef(), facility, (facility * MAX_FEE_BPS) / 10_000n)
      ).to.emit(fx.registry, "LoanCreated");
    });

    it("reverts one penny over the fee limit (kills L38)", async () => {
      await setup();
      const facility = gbp(40_000n);
      await expect(
        fx.registry.connect(fx.safe).createLoan(agreement(), smeRef(), facility, (facility * MAX_FEE_BPS) / 10_000n + 1n)
      ).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__FeeExceeded");
    });

    it("reverts on a zero facility (kills L02)", async () => {
      await setup();
      await expect(fx.registry.connect(fx.safe).createLoan(agreement(), smeRef(), 0n, 0n)).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__ZeroAmount"
      );
    });

    it("reverts on a zero agreement hash or a zero SME reference", async () => {
      await setup();
      await expect(
        fx.registry.connect(fx.safe).createLoan(ethers.ZeroHash, smeRef(), gbp(1_000n), 0n)
      ).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__ZeroHash");
      await expect(
        fx.registry.connect(fx.safe).createLoan(agreement(), ethers.ZeroHash, gbp(1_000n), 0n)
      ).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__ZeroHash");
    });

    it("reverts for a non-originator (kills L01)", async () => {
      await setup();
      await expect(
        fx.registry.connect(fx.outsider).createLoan(agreement(), smeRef(), gbp(1_000n), 0n)
      ).to.be.revertedWith(missingRole(fx.outsider.address, fx.roles.originator));
    });

    it("reverts while paused (kills L03)", async () => {
      await setup();
      await fx.registry.connect(fx.safe).pause();
      await expect(fx.registry.connect(fx.safe).createLoan(agreement(), smeRef(), gbp(1_000n), 0n)).to.be.revertedWith(
        "Pausable: paused"
      );
    });
  });

  // ------------------------------------------------------------------ recordDisbursement

  describe("recordDisbursement", () => {
    it("moves tokens from the Safe through the registry to the destination and records the tranche", async () => {
      await setup();
      const id = await createLoan(fx);
      const pence = gbp(20_000n);
      const amount = tokenFor(pence);
      const safeBefore = await fx.usdc.balanceOf(fx.safe.address);
      const partnerBefore = await fx.usdc.balanceOf(fx.partner.address);

      await expect(
        fx.registry.connect(fx.safe).recordDisbursement(id, pence, usdcAddr, amount, ref("payout:1"), fx.partner.address)
      )
        .to.emit(fx.registry, "TrancheDisbursed")
        .withArgs(id, pence, usdcAddr, amount, ref("payout:1"), fx.partner.address);

      expect(await fx.usdc.balanceOf(fx.safe.address)).to.equal(safeBefore - amount);
      expect(await fx.usdc.balanceOf(fx.partner.address)).to.equal(partnerBefore + amount);
      expect(await fx.usdc.balanceOf(registryAddr)).to.equal(0n);
      expect((await fx.registry.loans(id)).disbursedGbp).to.equal(pence);
      expect(await fx.registry.refUsed(ref("payout:1"))).to.equal(true);
    });

    it("adds up several tranches", async () => {
      await setup();
      const id = await createLoan(fx);
      await disburse(fx, id, gbp(10_000n), "1");
      await disburse(fx, id, gbp(15_000n), "2");
      expect((await fx.registry.loans(id)).disbursedGbp).to.equal(gbp(25_000n));
      expect(await fx.registry.owedGbp(id)).to.equal(gbp(25_000n));
    });

    it("closes drawing automatically when the facility is fully drawn", async () => {
      await setup();
      const id = await createLoan(fx, gbp(20_000n));
      await disburse(fx, id, gbp(5_000n), "1");
      await expect(disburse(fx, id, gbp(15_000n), "2"))
        .to.emit(fx.registry, "FacilityClosed")
        .withArgs(id, gbp(20_000n));
      expect((await fx.registry.loans(id)).drawingClosed).to.equal(true);
    });

    it("reverts one penny over the facility (kills L04)", async () => {
      await setup();
      const id = await createLoan(fx, gbp(20_000n));
      await disburse(fx, id, gbp(19_000n), "1");
      await expect(disburse(fx, id, gbp(1_000n) + 1n, "2")).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__FacilityExceeded"
      );
    });

    it("reverts on a reused payout ref (kills L05)", async () => {
      await setup();
      const id = await createLoan(fx);
      await disburse(fx, id, gbp(1_000n), "same");
      await expect(disburse(fx, id, gbp(1_000n), "same")).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__RefAlreadyUsed"
      );
    });

    it("reverts on a ref already used as a settlement ref (one shared set)", async () => {
      await setup();
      const id = await createLoan(fx);
      await disburse(fx, id, gbp(5_000n), "1");
      await repay(fx, id, gbp(1_000n), "shared");
      await expect(
        fx.registry
          .connect(fx.safe)
          .recordDisbursement(id, gbp(1_000n), usdcAddr, tokenFor(gbp(1_000n)), ref("settlement:shared"), fx.partner.address)
      ).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__RefAlreadyUsed");
    });

    it("reverts after closeFacility (kills L06)", async () => {
      await setup();
      const id = await createLoan(fx);
      await disburse(fx, id, gbp(1_000n), "1");
      await fx.registry.connect(fx.safe).closeFacility(id);
      await expect(disburse(fx, id, gbp(1_000n), "2")).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__DrawingClosed"
      );
    });

    it("reverts for a disallowed token (kills L07)", async () => {
      await setup();
      const id = await createLoan(fx);
      await fx.registry.connect(fx.safe).disallowToken(usdtAddr);
      await expect(disburse(fx, id, gbp(1_000n), "1", fx.usdt)).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__TokenNotAllowed"
      );
    });

    it("reverts on a zero GBP amount, a zero token amount or a zero ref", async () => {
      await setup();
      const id = await createLoan(fx);
      const send = (pence: bigint, amount: bigint, r: string) =>
        fx.registry.connect(fx.safe).recordDisbursement(id, pence, usdcAddr, amount, r, fx.partner.address);
      await expect(send(0n, USDC(1n), ref("a"))).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__ZeroAmount");
      await expect(send(gbp(1n), 0n, ref("b"))).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__ZeroAmount");
      await expect(send(gbp(1_000n), tokenFor(gbp(1_000n)), ethers.ZeroHash)).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__ZeroRef"
      );
    });

    it("reverts on an unknown loan", async () => {
      await setup();
      await expect(disburse(fx, 99n, gbp(1_000n), "1")).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__LoanNotFound"
      );
      await expect(disburse(fx, 0n, gbp(1_000n), "2")).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__LoanNotFound"
      );
    });

    it("reverts on a Defaulted loan", async () => {
      await setup();
      const id = await createLoan(fx);
      await fx.registry.connect(fx.safe).markDefault(id);
      await expect(disburse(fx, id, gbp(1_000n), "1"))
        .to.be.revertedWithCustomError(fx.registry, "LoanRegistry__InvalidStatus")
        .withArgs(Status.Defaulted);
    });

    it("reverts for a non-originator", async () => {
      await setup();
      const id = await createLoan(fx);
      await expect(
        fx.registry
          .connect(fx.outsider)
          .recordDisbursement(id, gbp(1_000n), usdcAddr, tokenFor(gbp(1_000n)), ref("p"), fx.partner.address)
      ).to.be.revertedWith(missingRole(fx.outsider.address, fx.roles.originator));
    });

    it("reverts while paused", async () => {
      await setup();
      const id = await createLoan(fx);
      await fx.registry.connect(fx.safe).pause();
      await expect(disburse(fx, id, gbp(1_000n), "1")).to.be.revertedWith("Pausable: paused");
    });

    it("reverts when the implied rate is outside the band", async () => {
      await setup();
      const id = await createLoan(fx);
      await expect(
        fx.registry
          .connect(fx.safe)
          .recordDisbursement(id, gbp(200n), usdcAddr, tokenFor(gbp(20_000n)), ref("typo"), fx.partner.address)
      ).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__RateOutOfBand");
    });
  });

  // ------------------------------------------------------------------ closeFacility

  describe("closeFacility", () => {
    it("closes drawing and emits FacilityClosed", async () => {
      await setup();
      const id = await createLoan(fx);
      await disburse(fx, id, gbp(10_000n), "1");
      await expect(fx.registry.connect(fx.safe).closeFacility(id))
        .to.emit(fx.registry, "FacilityClosed")
        .withArgs(id, gbp(10_000n));
      expect((await fx.registry.loans(id)).drawingClosed).to.equal(true);
      expect((await fx.registry.loans(id)).status).to.equal(Status.Active);
    });

    it("moves a loan already repaid in full to Repaid", async () => {
      await setup();
      const id = await createLoan(fx);
      await disburse(fx, id, gbp(10_000n), "1");
      await repay(fx, id, gbp(10_000n), "1");
      expect((await fx.registry.loans(id)).status).to.equal(Status.Active);
      await expect(fx.registry.connect(fx.safe).closeFacility(id))
        .to.emit(fx.registry, "LoanRepaid")
        .withArgs(id, gbp(10_000n));
      expect((await fx.registry.loans(id)).status).to.equal(Status.Repaid);
    });

    it("reverts when drawing is already closed", async () => {
      await setup();
      const id = await createLoan(fx);
      await disburse(fx, id, gbp(1_000n), "1");
      await fx.registry.connect(fx.safe).closeFacility(id);
      await expect(fx.registry.connect(fx.safe).closeFacility(id)).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__DrawingClosed"
      );
    });

    it("marks a loan with nothing paid out and no fee Repaid (invariant 14)", async () => {
      await setup();
      const id = await createLoan(fx);
      await expect(fx.registry.connect(fx.safe).closeFacility(id))
        .to.emit(fx.registry, "LoanStatusChanged")
        .withArgs(id, Status.Active, Status.Repaid);
      expect((await fx.registry.loans(id)).status).to.equal(Status.Repaid);
    });

    it("reverts on a loan that is not Active", async () => {
      await setup();
      const id = await createLoan(fx);
      await fx.registry.connect(fx.safe).markDefault(id);
      await expect(fx.registry.connect(fx.safe).closeFacility(id))
        .to.be.revertedWithCustomError(fx.registry, "LoanRegistry__InvalidStatus")
        .withArgs(Status.Defaulted);
    });

    it("reverts for a non-originator and while paused", async () => {
      await setup();
      const id = await createLoan(fx);
      await expect(fx.registry.connect(fx.outsider).closeFacility(id)).to.be.revertedWith(
        missingRole(fx.outsider.address, fx.roles.originator)
      );
      await fx.registry.connect(fx.safe).pause();
      await expect(fx.registry.connect(fx.safe).closeFacility(id)).to.be.revertedWith("Pausable: paused");
    });
  });

  // ------------------------------------------------------------------ recordRepayment

  describe("recordRepayment", () => {
    it("pulls the tokens into the registry and credits the loan (kills L11)", async () => {
      await setup();
      const id = await createLoan(fx);
      await disburse(fx, id, gbp(20_000n), "1");
      const pence = gbp(2_000n);
      const amount = tokenFor(pence);
      const safeBefore = await fx.usdc.balanceOf(fx.safe.address);

      await expect(fx.registry.connect(fx.safe).recordRepayment(id, pence, usdcAddr, amount, ref("s1")))
        .to.emit(fx.registry, "RepaymentRecorded")
        .withArgs(id, pence, usdcAddr, amount, ref("s1"));

      expect(await fx.usdc.balanceOf(registryAddr)).to.equal(amount);
      expect(await fx.usdc.balanceOf(fx.safe.address)).to.equal(safeBefore - amount);
      expect((await fx.registry.loans(id)).repaidGbp).to.equal(pence);
      expect(await fx.registry.loanReceived(id, usdcAddr)).to.equal(amount);
      expect(await fx.registry.totalReceived(usdcAddr)).to.equal(amount);
      expect(await fx.registry.totalRepaidGbp()).to.equal(pence);
      expect(await fx.registry.outstandingGbp(id)).to.equal(gbp(18_000n));
    });

    it("accumulates partial repayments in USDC and USDT on one loan", async () => {
      await setup();
      const id = await createLoan(fx);
      await disburse(fx, id, gbp(20_000n), "1");
      await repay(fx, id, gbp(2_000n), "1", fx.usdc);
      await repay(fx, id, gbp(3_000n), "2", fx.usdt);
      expect((await fx.registry.loans(id)).repaidGbp).to.equal(gbp(5_000n));
      expect(await fx.registry.loanReceived(id, usdcAddr)).to.equal(tokenFor(gbp(2_000n)));
      expect(await fx.registry.loanReceived(id, usdtAddr)).to.equal(tokenFor(gbp(3_000n)));
    });

    it("marks the loan Repaid on the final repayment once drawing is closed (kills L12)", async () => {
      await setup();
      const id = await createLoan(fx, gbp(10_000n));
      await disburse(fx, id, gbp(10_000n), "1");
      await repay(fx, id, gbp(4_000n), "1");
      const tx = repay(fx, id, gbp(6_000n), "2");
      await expect(tx).to.emit(fx.registry, "LoanRepaid").withArgs(id, gbp(10_000n));
      await expect(tx).to.emit(fx.registry, "LoanStatusChanged").withArgs(id, Status.Active, Status.Repaid);
      expect((await fx.registry.loans(id)).status).to.equal(Status.Repaid);
      expect(await fx.registry.outstandingGbp(id)).to.equal(0n);
    });

    it("keeps a loan Active when repaid in full while drawing is still open", async () => {
      await setup();
      const id = await createLoan(fx);
      await disburse(fx, id, gbp(10_000n), "1");
      await repay(fx, id, gbp(10_000n), "1");
      expect((await fx.registry.loans(id)).status).to.equal(Status.Active);
    });

    it("counts the fixed fee in what is owed", async () => {
      await setup();
      const id = await createLoan(fx, gbp(10_000n), gbp(500n));
      await disburse(fx, id, gbp(10_000n), "1");
      expect(await fx.registry.owedGbp(id)).to.equal(gbp(10_500n));
      await repay(fx, id, gbp(10_000n), "1");
      expect((await fx.registry.loans(id)).status).to.equal(Status.Active);
      await repay(fx, id, gbp(500n), "2");
      expect((await fx.registry.loans(id)).status).to.equal(Status.Repaid);
    });

    it("reverts before the first tranche is paid out, even when a fee is owed (kills L40)", async () => {
      await setup();
      const id = await createLoan(fx, gbp(10_000n), gbp(500n));
      await expect(repay(fx, id, gbp(100n), "early")).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__NothingDisbursed"
      );
      await disburse(fx, id, gbp(1_000n), "1");
      await repay(fx, id, gbp(1_500n), "1");
      expect(await fx.registry.outstandingGbp(id)).to.equal(0n);
    });

    it("reverts one penny over what is owed (kills L09)", async () => {
      await setup();
      const id = await createLoan(fx);
      await disburse(fx, id, gbp(10_000n), "1");
      await repay(fx, id, gbp(9_000n), "1");
      await expect(repay(fx, id, gbp(1_000n) + 1n, "2")).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__OwedExceeded"
      );
    });

    it("reverts on a reused settlement ref (kills L08)", async () => {
      await setup();
      const id = await createLoan(fx);
      await disburse(fx, id, gbp(10_000n), "1");
      await repay(fx, id, gbp(1_000n), "dup");
      await expect(repay(fx, id, gbp(1_000n), "dup")).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__RefAlreadyUsed"
      );
    });

    it("reverts for a disallowed token (kills L10)", async () => {
      await setup();
      const id = await createLoan(fx);
      await disburse(fx, id, gbp(10_000n), "1");
      await fx.registry.connect(fx.safe).disallowToken(usdtAddr);
      await expect(repay(fx, id, gbp(1_000n), "1", fx.usdt)).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__TokenNotAllowed"
      );
    });

    it("reverts on zero amounts and a zero ref", async () => {
      await setup();
      const id = await createLoan(fx);
      await disburse(fx, id, gbp(10_000n), "1");
      const send = (pence: bigint, amount: bigint, r: string) =>
        fx.registry.connect(fx.safe).recordRepayment(id, pence, usdcAddr, amount, r);
      await expect(send(0n, USDC(1n), ref("a"))).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__ZeroAmount");
      await expect(send(gbp(1n), 0n, ref("b"))).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__ZeroAmount");
      await expect(send(gbp(1_000n), tokenFor(gbp(1_000n)), ethers.ZeroHash)).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__ZeroRef"
      );
    });

    it("reverts for a non-recorder (kills L13)", async () => {
      await setup();
      const id = await createLoan(fx);
      await disburse(fx, id, gbp(10_000n), "1");
      await expect(
        fx.registry.connect(fx.outsider).recordRepayment(id, gbp(1_000n), usdcAddr, tokenFor(gbp(1_000n)), ref("s"))
      ).to.be.revertedWith(missingRole(fx.outsider.address, fx.roles.recorder));
    });

    it("reverts while paused", async () => {
      await setup();
      const id = await createLoan(fx);
      await disburse(fx, id, gbp(10_000n), "1");
      await fx.registry.connect(fx.safe).pause();
      await expect(repay(fx, id, gbp(1_000n), "1")).to.be.revertedWith("Pausable: paused");
    });

    it("accepts repayments on a Defaulted loan", async () => {
      await setup();
      const id = await createLoan(fx);
      await disburse(fx, id, gbp(10_000n), "1");
      await fx.registry.connect(fx.safe).markDefault(id);
      await repay(fx, id, gbp(1_000n), "1");
      expect((await fx.registry.loans(id)).repaidGbp).to.equal(gbp(1_000n));
      expect((await fx.registry.loans(id)).status).to.equal(Status.Defaulted);
    });

    it("moves a Defaulted loan to Repaid when it is repaid in full", async () => {
      await setup();
      const id = await createLoan(fx, gbp(10_000n));
      await disburse(fx, id, gbp(10_000n), "1");
      await fx.registry.connect(fx.safe).markDefault(id);
      await expect(repay(fx, id, gbp(10_000n), "1"))
        .to.emit(fx.registry, "LoanStatusChanged")
        .withArgs(id, Status.Defaulted, Status.Repaid);
    });

    it("rejects repayments on Repaid and WrittenOff loans", async () => {
      await setup();
      const repaid = await createLoan(fx, gbp(10_000n), 0n, "r");
      await disburse(fx, repaid, gbp(10_000n), "r");
      await repay(fx, repaid, gbp(10_000n), "r");
      await expect(repay(fx, repaid, gbp(1n), "r2"))
        .to.be.revertedWithCustomError(fx.registry, "LoanRegistry__InvalidStatus")
        .withArgs(Status.Repaid);

      const written = await createLoan(fx, gbp(10_000n), 0n, "w");
      await disburse(fx, written, gbp(5_000n), "w");
      await fx.registry.connect(fx.safe).markDefault(written);
      await fx.registry.connect(fx.safe).writeOff(written);
      await expect(repay(fx, written, gbp(1_000n), "w"))
        .to.be.revertedWithCustomError(fx.registry, "LoanRegistry__InvalidStatus")
        .withArgs(Status.WrittenOff);
    });

    it("reverts on an unknown loan", async () => {
      await setup();
      await expect(repay(fx, 7n, gbp(1_000n), "1")).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__LoanNotFound"
      );
    });

    it("reverts when the implied rate is outside the band", async () => {
      await setup();
      const id = await createLoan(fx);
      await disburse(fx, id, gbp(10_000n), "1");
      await expect(
        fx.registry.connect(fx.safe).recordRepayment(id, gbp(10n), usdcAddr, tokenFor(gbp(1_000n)), ref("typo"))
      ).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__RateOutOfBand");
    });
  });

  // ------------------------------------------------------------------ depositCollateral

  describe("depositCollateral", () => {
    it("pulls collateral in and records it separately from repayments", async () => {
      await setup();
      const id = await createLoan(fx);
      const pence = gbp(5_000n);
      const amount = tokenFor(pence);
      await expect(fx.registry.connect(fx.safe).depositCollateral(id, usdcAddr, amount, pence, ref("c1")))
        .to.emit(fx.registry, "CollateralDeposited")
        .withArgs(id, usdcAddr, amount, pence, ref("c1"));
      expect(await fx.registry.collateralHeld(id, usdcAddr)).to.equal(amount);
      expect(await fx.registry.totalCollateralHeld(usdcAddr)).to.equal(amount);
      expect(await fx.registry.totalReceived(usdcAddr)).to.equal(0n);
      expect(await fx.usdc.balanceOf(registryAddr)).to.equal(amount);
    });

    it("reverts on a loan that is not Active", async () => {
      await setup();
      const id = await createLoan(fx);
      await fx.registry.connect(fx.safe).markDefault(id);
      await expect(deposit(fx, id, gbp(1_000n), "1"))
        .to.be.revertedWithCustomError(fx.registry, "LoanRegistry__InvalidStatus")
        .withArgs(Status.Defaulted);
    });

    it("reverts for a disallowed token, zero amounts and a reused ref", async () => {
      await setup();
      const id = await createLoan(fx);
      await fx.registry.connect(fx.safe).disallowToken(usdtAddr);
      await expect(deposit(fx, id, gbp(1_000n), "t", fx.usdt)).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__TokenNotAllowed"
      );
      await expect(
        fx.registry.connect(fx.safe).depositCollateral(id, usdcAddr, 0n, gbp(1n), ref("z1"))
      ).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__ZeroAmount");
      await expect(
        fx.registry.connect(fx.safe).depositCollateral(id, usdcAddr, USDC(1n), 0n, ref("z2"))
      ).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__ZeroAmount");
      await deposit(fx, id, gbp(1_000n), "same");
      await expect(deposit(fx, id, gbp(1_000n), "same")).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__RefAlreadyUsed"
      );
    });

    it("reverts for a non-recorder and while paused", async () => {
      await setup();
      const id = await createLoan(fx);
      await expect(
        fx.registry.connect(fx.outsider).depositCollateral(id, usdcAddr, tokenFor(gbp(1_000n)), gbp(1_000n), ref("c"))
      ).to.be.revertedWith(missingRole(fx.outsider.address, fx.roles.recorder));
      await fx.registry.connect(fx.safe).pause();
      await expect(deposit(fx, id, gbp(1_000n), "1")).to.be.revertedWith("Pausable: paused");
    });

    it("reverts when the implied rate is outside the band", async () => {
      await setup();
      const id = await createLoan(fx);
      await expect(
        fx.registry.connect(fx.safe).depositCollateral(id, usdcAddr, tokenFor(gbp(5_000n)), gbp(50n), ref("typo"))
      ).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__RateOutOfBand");
    });
  });

  // ------------------------------------------------------------------ lifecycle

  describe("lifecycle", () => {
    type Action = "markDefault" | "cure" | "writeOff";
    const allowed: Record<Action, [bigint, bigint]> = {
      markDefault: [Status.Active, Status.Defaulted],
      cure: [Status.Defaulted, Status.Active],
      writeOff: [Status.Defaulted, Status.WrittenOff],
    };

    /** Creates a loan and walks it to `status`. */
    async function loanIn(status: bigint): Promise<bigint> {
      const id = await createLoan(fx, gbp(10_000n), 0n, `s${status}-${Math.random()}`);
      if (status === Status.Active) return id;
      if (status === Status.Repaid) {
        await disburse(fx, id, gbp(10_000n), `r${id}`);
        await repay(fx, id, gbp(10_000n), `r${id}`);
        return id;
      }
      await fx.registry.connect(fx.safe).markDefault(id);
      if (status === Status.WrittenOff) await fx.registry.connect(fx.safe).writeOff(id);
      return id;
    }

    for (const action of Object.keys(allowed) as Action[]) {
      const [from, to] = allowed[action];
      it(`${action} moves ${from} to ${to} and emits LoanStatusChanged`, async () => {
        await setup();
        const id = await loanIn(from);
        await expect((fx.registry.connect(fx.safe) as any)[action](id))
          .to.emit(fx.registry, "LoanStatusChanged")
          .withArgs(id, from, to);
        expect((await fx.registry.loans(id)).status).to.equal(to);
      });
    }

    it("every disallowed transition reverts with the current status (kills L14, L15, L16)", async () => {
      await setup();
      for (const action of Object.keys(allowed) as Action[]) {
        for (const status of [Status.Active, Status.Repaid, Status.Defaulted, Status.WrittenOff]) {
          if (status === allowed[action][0]) continue;
          const id = await loanIn(status);
          await expect((fx.registry.connect(fx.safe) as any)[action](id), `${action} from ${status}`)
            .to.be.revertedWithCustomError(fx.registry, "LoanRegistry__InvalidStatus")
            .withArgs(status);
        }
      }
    });

    it("reverts for a non-risk caller (kills L17)", async () => {
      await setup();
      const id = await createLoan(fx);
      for (const action of ["markDefault", "cure", "writeOff"]) {
        await expect((fx.registry.connect(fx.outsider) as any)[action](id)).to.be.revertedWith(
          missingRole(fx.outsider.address, fx.roles.risk)
        );
      }
    });

    it("reverts while paused", async () => {
      await setup();
      const id = await createLoan(fx);
      await fx.registry.connect(fx.safe).pause();
      await expect(fx.registry.connect(fx.safe).markDefault(id)).to.be.revertedWith("Pausable: paused");
    });

    it("reverts on an unknown loan", async () => {
      await setup();
      await expect(fx.registry.connect(fx.safe).markDefault(42n)).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__LoanNotFound"
      );
    });
  });

  // ------------------------------------------------------------------ claimCollateral

  describe("claimCollateral", () => {
    async function defaultedWithCollateral(collateralPence = gbp(5_000n)) {
      const id = await createLoan(fx, gbp(10_000n));
      await disburse(fx, id, gbp(10_000n), `d${id}`);
      await deposit(fx, id, collateralPence, `c${id}`);
      await fx.registry.connect(fx.safe).markDefault(id);
      return id;
    }

    it("moves collateral into repayment accounting without moving tokens", async () => {
      await setup();
      const id = await defaultedWithCollateral();
      const pence = gbp(3_000n);
      const amount = tokenFor(pence);
      const balanceBefore = await fx.usdc.balanceOf(registryAddr);

      await expect(fx.registry.connect(fx.safe).claimCollateral(id, usdcAddr, amount, pence, ref("claim")))
        .to.emit(fx.registry, "CollateralClaimed")
        .withArgs(id, usdcAddr, amount, pence, ref("claim"));

      expect(await fx.usdc.balanceOf(registryAddr)).to.equal(balanceBefore);
      expect(await fx.registry.collateralHeld(id, usdcAddr)).to.equal(tokenFor(gbp(5_000n)) - amount);
      expect(await fx.registry.totalCollateralHeld(usdcAddr)).to.equal(tokenFor(gbp(5_000n)) - amount);
      expect(await fx.registry.loanReceived(id, usdcAddr)).to.equal(amount);
      expect(await fx.registry.totalReceived(usdcAddr)).to.equal(amount);
      expect((await fx.registry.loans(id)).repaidGbp).to.equal(pence);
      expect(await fx.registry.totalRepaidGbp()).to.equal(pence);
    });

    it("reverts before the first tranche is paid out, even when a fee is owed (kills L42)", async () => {
      await setup();
      const id = await createLoan(fx, gbp(10_000n), gbp(500n));
      await deposit(fx, id, gbp(1_000n), "c");
      await fx.registry.connect(fx.safe).markDefault(id);
      await expect(
        fx.registry.connect(fx.safe).claimCollateral(id, usdcAddr, tokenFor(gbp(500n)), gbp(500n), ref("cl"))
      ).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__NothingDisbursed");
    });

    it("reverts on a loan that is not Defaulted (kills L19)", async () => {
      await setup();
      const id = await createLoan(fx);
      await disburse(fx, id, gbp(10_000n), "1");
      await deposit(fx, id, gbp(5_000n), "1");
      await expect(
        fx.registry.connect(fx.safe).claimCollateral(id, usdcAddr, tokenFor(gbp(1_000n)), gbp(1_000n), ref("cl"))
      )
        .to.be.revertedWithCustomError(fx.registry, "LoanRegistry__InvalidStatus")
        .withArgs(Status.Active);
    });

    it("reverts above the collateral held (kills L20)", async () => {
      await setup();
      const id = await defaultedWithCollateral(gbp(2_000n));
      await expect(
        fx.registry
          .connect(fx.safe)
          .claimCollateral(id, usdcAddr, tokenFor(gbp(2_000n)) + 1n, gbp(2_000n), ref("cl"))
      ).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__CollateralExceeded");
    });

    it("reverts when crediting more GBP than is outstanding (kills L21)", async () => {
      await setup();
      const id = await defaultedWithCollateral(gbp(5_000n));
      await repay(fx, id, gbp(8_000n), "r");
      await expect(
        fx.registry.connect(fx.safe).claimCollateral(id, usdcAddr, tokenFor(gbp(2_000n) + 1n), gbp(2_000n) + 1n, ref("cl"))
      ).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__OutstandingExceeded");
    });

    it("a claim that clears the balance marks the loan Repaid, then the excess is released", async () => {
      await setup();
      const id = await defaultedWithCollateral(gbp(5_000n));
      await repay(fx, id, gbp(7_000n), "r");
      await fx.registry
        .connect(fx.safe)
        .claimCollateral(id, usdcAddr, tokenFor(gbp(3_000n)), gbp(3_000n), ref("cl"));
      expect((await fx.registry.loans(id)).status).to.equal(Status.Repaid);

      const excess = tokenFor(gbp(2_000n));
      expect(await fx.registry.collateralHeld(id, usdcAddr)).to.equal(excess);
      await fx.registry.connect(fx.safe).releaseCollateral(id, usdcAddr, excess, fx.partner.address);
      expect(await fx.registry.collateralHeld(id, usdcAddr)).to.equal(0n);
    });

    it("reverts on a token never allowed, zero amounts and a reused ref", async () => {
      await setup();
      const id = await defaultedWithCollateral();
      const MockStable = await ethers.getContractFactory("MockStable");
      const stranger = await MockStable.deploy("Other", "OTH", 6);
      await expect(
        fx.registry
          .connect(fx.safe)
          .claimCollateral(id, await stranger.getAddress(), USDC(1n), gbp(1n), ref("u"))
      ).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__TokenUnknown");
      await expect(
        fx.registry.connect(fx.safe).claimCollateral(id, usdcAddr, 0n, gbp(1n), ref("z"))
      ).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__ZeroAmount");
      await expect(
        fx.registry.connect(fx.safe).claimCollateral(id, usdcAddr, tokenFor(gbp(1_000n)), gbp(1_000n), ref(`collateral:c${id}`))
      ).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__RefAlreadyUsed");
    });

    it("works for a token disallowed after the deposit", async () => {
      await setup();
      const id = await defaultedWithCollateral();
      await fx.registry.connect(fx.safe).disallowToken(usdcAddr);
      await fx.registry
        .connect(fx.safe)
        .claimCollateral(id, usdcAddr, tokenFor(gbp(1_000n)), gbp(1_000n), ref("after"));
      expect((await fx.registry.loans(id)).repaidGbp).to.equal(gbp(1_000n));
    });

    it("reverts for a non-risk caller and while paused", async () => {
      await setup();
      const id = await defaultedWithCollateral();
      await expect(
        fx.registry.connect(fx.outsider).claimCollateral(id, usdcAddr, tokenFor(gbp(1_000n)), gbp(1_000n), ref("x"))
      ).to.be.revertedWith(missingRole(fx.outsider.address, fx.roles.risk));
      await fx.registry.connect(fx.safe).pause();
      await expect(
        fx.registry.connect(fx.safe).claimCollateral(id, usdcAddr, tokenFor(gbp(1_000n)), gbp(1_000n), ref("y"))
      ).to.be.revertedWith("Pausable: paused");
    });
  });

  // ------------------------------------------------------------------ releaseCollateral

  describe("releaseCollateral", () => {
    async function repaidWithCollateral() {
      const id = await createLoan(fx, gbp(10_000n));
      await disburse(fx, id, gbp(10_000n), `d${id}`);
      await deposit(fx, id, gbp(5_000n), `c${id}`);
      await repay(fx, id, gbp(10_000n), `r${id}`);
      return id;
    }

    it("sends collateral to an approved destination on a Repaid loan", async () => {
      await setup();
      const id = await repaidWithCollateral();
      const amount = tokenFor(gbp(5_000n));
      const before = await fx.usdc.balanceOf(fx.partner.address);
      await expect(fx.registry.connect(fx.safe).releaseCollateral(id, usdcAddr, amount, fx.partner.address))
        .to.emit(fx.registry, "CollateralReleased")
        .withArgs(id, usdcAddr, amount, fx.partner.address);
      expect(await fx.usdc.balanceOf(fx.partner.address)).to.equal(before + amount);
      expect(await fx.registry.collateralHeld(id, usdcAddr)).to.equal(0n);
      expect(await fx.registry.totalCollateralHeld(usdcAddr)).to.equal(0n);
    });

    it("releases on a WrittenOff loan", async () => {
      await setup();
      const id = await createLoan(fx);
      await deposit(fx, id, gbp(1_000n), "1");
      await fx.registry.connect(fx.safe).markDefault(id);
      await fx.registry.connect(fx.safe).writeOff(id);
      await fx.registry.connect(fx.safe).releaseCollateral(id, usdcAddr, tokenFor(gbp(1_000n)), fx.safe.address);
      expect(await fx.registry.collateralHeld(id, usdcAddr)).to.equal(0n);
    });

    it("reverts on Active and Defaulted loans (kills L18)", async () => {
      await setup();
      const id = await createLoan(fx);
      await deposit(fx, id, gbp(1_000n), "1");
      await expect(fx.registry.connect(fx.safe).releaseCollateral(id, usdcAddr, USDC(1n), fx.partner.address))
        .to.be.revertedWithCustomError(fx.registry, "LoanRegistry__InvalidStatus")
        .withArgs(Status.Active);
      await fx.registry.connect(fx.safe).markDefault(id);
      await expect(fx.registry.connect(fx.safe).releaseCollateral(id, usdcAddr, USDC(1n), fx.partner.address))
        .to.be.revertedWithCustomError(fx.registry, "LoanRegistry__InvalidStatus")
        .withArgs(Status.Defaulted);
    });

    it("reverts above the collateral held and on a zero amount", async () => {
      await setup();
      const id = await repaidWithCollateral();
      await expect(
        fx.registry.connect(fx.safe).releaseCollateral(id, usdcAddr, tokenFor(gbp(5_000n)) + 1n, fx.partner.address)
      ).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__CollateralExceeded");
      await expect(
        fx.registry.connect(fx.safe).releaseCollateral(id, usdcAddr, 0n, fx.partner.address)
      ).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__ZeroAmount");
    });

    it("works for a token disallowed after the deposit", async () => {
      await setup();
      const id = await repaidWithCollateral();
      await fx.registry.connect(fx.safe).disallowToken(usdcAddr);
      await fx.registry.connect(fx.safe).releaseCollateral(id, usdcAddr, tokenFor(gbp(5_000n)), fx.safe.address);
      expect(await fx.registry.collateralHeld(id, usdcAddr)).to.equal(0n);
    });

    it("reverts for a non-risk caller and while paused", async () => {
      await setup();
      const id = await repaidWithCollateral();
      await expect(
        fx.registry.connect(fx.outsider).releaseCollateral(id, usdcAddr, USDC(1n), fx.partner.address)
      ).to.be.revertedWith(missingRole(fx.outsider.address, fx.roles.risk));
      await fx.registry.connect(fx.safe).pause();
      await expect(
        fx.registry.connect(fx.safe).releaseCollateral(id, usdcAddr, USDC(1n), fx.partner.address)
      ).to.be.revertedWith("Pausable: paused");
    });
  });

  // ------------------------------------------------------------------ forward

  describe("forward", () => {
    it("sends repaid tokens to the Safe and counts them as forwarded", async () => {
      await setup();
      const id = await createLoan(fx);
      await disburse(fx, id, gbp(10_000n), "1");
      await repay(fx, id, gbp(4_000n), "1");
      const amount = tokenFor(gbp(4_000n));
      const before = await fx.usdc.balanceOf(fx.safe.address);
      await expect(fx.registry.connect(fx.safe).forward(usdcAddr, amount, fx.safe.address))
        .to.emit(fx.registry, "Forwarded")
        .withArgs(usdcAddr, amount, fx.safe.address);
      expect(await fx.usdc.balanceOf(fx.safe.address)).to.equal(before + amount);
      expect(await fx.registry.totalForwarded(usdcAddr)).to.equal(amount);
    });

    it("reverts above repayments received minus forwarded (kills L23)", async () => {
      await setup();
      const id = await createLoan(fx);
      await disburse(fx, id, gbp(10_000n), "1");
      await repay(fx, id, gbp(4_000n), "1");
      const amount = tokenFor(gbp(4_000n));
      await fx.registry.connect(fx.safe).forward(usdcAddr, amount - 1n, fx.safe.address);
      await expect(fx.registry.connect(fx.safe).forward(usdcAddr, 2n, fx.safe.address)).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__ForwardExceeded"
      );
    });

    it("cannot move collateral (kills L22)", async () => {
      await setup();
      const id = await createLoan(fx);
      await deposit(fx, id, gbp(5_000n), "1");
      expect(await fx.usdc.balanceOf(registryAddr)).to.equal(tokenFor(gbp(5_000n)));
      await expect(fx.registry.connect(fx.safe).forward(usdcAddr, 1n, fx.safe.address)).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__ForwardExceeded"
      );
    });

    it("reverts on a zero amount", async () => {
      await setup();
      await expect(fx.registry.connect(fx.safe).forward(usdcAddr, 0n, fx.safe.address)).to.be.revertedWithCustomError(
        fx.registry,
        "LoanRegistry__ZeroAmount"
      );
    });

    it("reverts for a non-distributor (kills L24) and while paused", async () => {
      await setup();
      const id = await createLoan(fx);
      await disburse(fx, id, gbp(10_000n), "1");
      await repay(fx, id, gbp(1_000n), "1");
      await expect(fx.registry.connect(fx.outsider).forward(usdcAddr, 1n, fx.safe.address)).to.be.revertedWith(
        missingRole(fx.outsider.address, fx.roles.distributor)
      );
      await fx.registry.connect(fx.safe).pause();
      await expect(fx.registry.connect(fx.safe).forward(usdcAddr, 1n, fx.safe.address)).to.be.revertedWith(
        "Pausable: paused"
      );
    });
  });

  // ------------------------------------------------------------------ views

  describe("views", () => {
    it("return zeros for unknown loans instead of reverting", async () => {
      await setup();
      const loan = await fx.registry.loans(123n);
      expect(loan.facilityGbp).to.equal(0n);
      expect(await fx.registry.owedGbp(123n)).to.equal(0n);
      expect(await fx.registry.outstandingGbp(123n)).to.equal(0n);
      expect(await fx.registry.collateralHeld(123n, usdcAddr)).to.equal(0n);
    });

    it("keep working while paused", async () => {
      await setup();
      const id = await createLoan(fx);
      await disburse(fx, id, gbp(10_000n), "1");
      await fx.registry.connect(fx.safe).pause();
      expect(await fx.registry.paused()).to.equal(true);
      expect(await fx.registry.owedGbp(id)).to.equal(gbp(10_000n));
      expect(await fx.registry.outstandingGbp(id)).to.equal(gbp(10_000n));
      expect(await fx.registry.outflowUsedToday(usdcAddr)).to.equal(tokenFor(gbp(10_000n)));
      expect(await fx.registry.surplus(usdcAddr)).to.equal(0n);
    });

    it("expose the token configuration set by allowToken", async () => {
      await setup();
      const config = await fx.registry.tokenConfig(usdcAddr);
      expect(config.allowed).to.equal(true);
      expect(config.known).to.equal(true);
      expect(config.decimals).to.equal(6n);
      expect(config.minRateBps).to.equal(MIN_RATE_BPS);
      expect(config.maxRateBps).to.equal(MAX_RATE_BPS);
      expect(config.maxPayout).to.equal(MAX_PAYOUT);
      expect(config.dailyLimit).to.equal(DAILY_LIMIT);
    });
  });

  // ------------------------------------------------------------------ worked example (spec section 4)

  describe("worked example", () => {
    it("follows the spec's £50,000 facility step by step, matching the model after every call", async () => {
      await setup();
      const model = new LoanModel(MAX_FACILITY_GBP);
      const tokens = [fx.usdc, fx.usdt];

      await fx.registry.connect(fx.safe).createLoan(agreement("w"), smeRef("w"), gbp(50_000n), 0n);
      const id = model.createLoan(gbp(50_000n), 0n);
      await model.expectMatches(fx.registry, tokens);

      await fx.registry
        .connect(fx.safe)
        .recordDisbursement(id, gbp(20_000n), usdcAddr, USDC(25_400n), ref("p1"), fx.partner.address);
      model.recordDisbursement(id, gbp(20_000n), ref("p1"));
      await model.expectMatches(fx.registry, tokens);

      await fx.registry.connect(fx.safe).recordRepayment(id, gbp(2_000n), usdcAddr, USDC(2_540n), ref("s1"));
      model.recordRepayment(id, gbp(2_000n), usdcAddr, USDC(2_540n), ref("s1"));
      await model.expectMatches(fx.registry, tokens);

      await expect(
        fx.registry.connect(fx.safe).recordRepayment(id, gbp(20_000n), usdcAddr, USDC(25_400n), ref("s-over"))
      ).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__OwedExceeded");
      expect(() => model.recordRepayment(id, gbp(20_000n), usdcAddr, USDC(25_400n), ref("s-over"))).to.throw(
        "LoanRegistry__OwedExceeded"
      );

      await fx.registry.connect(fx.safe).closeFacility(id);
      model.closeFacility(id);
      await model.expectMatches(fx.registry, tokens);

      await fx.registry.connect(fx.safe).recordRepayment(id, gbp(18_000n), usdcAddr, USDC(22_860n), ref("s2"));
      model.recordRepayment(id, gbp(18_000n), usdcAddr, USDC(22_860n), ref("s2"));
      await model.expectMatches(fx.registry, tokens);
      expect((await fx.registry.loans(id)).status).to.equal(Status.Repaid);
    });

    it("rejects pounds typed as pence for the same token amount", async () => {
      await setup();
      const id = await createLoan(fx);
      expect(tokenFor(gbp(20_000n), RATE_BPS)).to.equal(USDC(25_400n));
      await expect(
        fx.registry
          .connect(fx.safe)
          .recordDisbursement(id, 20_000n, usdcAddr, USDC(25_400n), ref("typo"), fx.partner.address)
      ).to.be.revertedWithCustomError(fx.registry, "LoanRegistry__RateOutOfBand");
    });
  });
});
