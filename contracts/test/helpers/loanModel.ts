import { expect } from "chai";
import { Status } from "./loanRegistryFixture";

/**
 * Plain TypeScript model of the LoanRegistry ledger (contracts/LOAN_REGISTRY.md).
 *
 * It applies the same calls as the contract and throws the error name the contract must revert
 * with. Tests run each call against both and compare state after every step (`expectMatches`).
 * The structural suite in S7 drives it with long random sequences.
 */

export type StatusValue = (typeof Status)[keyof typeof Status];

export interface ModelLoan {
  facilityGbp: bigint;
  feeGbp: bigint;
  disbursedGbp: bigint;
  repaidGbp: bigint;
  status: StatusValue;
  drawingClosed: boolean;
}

export class ModelRevert extends Error {
  constructor(public readonly errorName: string) {
    super(errorName);
  }
}

const key = (loanId: bigint, token: string) => `${loanId}:${token.toLowerCase()}`;

export class LoanModel {
  loans = new Map<bigint, ModelLoan>();
  refs = new Set<string>();
  loanReceived = new Map<string, bigint>();
  collateralHeld = new Map<string, bigint>();
  totalReceived = new Map<string, bigint>();
  totalForwarded = new Map<string, bigint>();
  totalCollateralHeld = new Map<string, bigint>();
  totalRepaidGbp = 0n;
  loanCount = 0n;

  constructor(public maxFacilityGbp: bigint) {}

  private get(map: Map<string, bigint>, k: string): bigint {
    return map.get(k) ?? 0n;
  }

  private add(map: Map<string, bigint>, k: string, v: bigint): void {
    map.set(k, this.get(map, k) + v);
  }

  private loan(loanId: bigint): ModelLoan {
    const loan = this.loans.get(loanId);
    if (!loan) throw new ModelRevert("LoanRegistry__LoanNotFound");
    return loan;
  }

  private useRef(ref: string): void {
    if (BigInt(ref) === 0n) throw new ModelRevert("LoanRegistry__ZeroRef");
    if (this.refs.has(ref)) throw new ModelRevert("LoanRegistry__RefAlreadyUsed");
    this.refs.add(ref);
  }

  owedGbp(loanId: bigint): bigint {
    const loan = this.loans.get(loanId);
    return loan ? loan.disbursedGbp + loan.feeGbp : 0n;
  }

  outstandingGbp(loanId: bigint): bigint {
    const loan = this.loans.get(loanId);
    return loan ? this.owedGbp(loanId) - loan.repaidGbp : 0n;
  }

  private settleIfRepaid(loanId: bigint): void {
    const loan = this.loan(loanId);
    if (
      (loan.status === Status.Active || loan.status === Status.Defaulted) &&
      loan.drawingClosed &&
      loan.repaidGbp === this.owedGbp(loanId)
    ) {
      loan.status = Status.Repaid;
    }
  }

  createLoan(facilityGbp: bigint, feeGbp: bigint): bigint {
    if (facilityGbp === 0n) throw new ModelRevert("LoanRegistry__ZeroAmount");
    if (facilityGbp > this.maxFacilityGbp) throw new ModelRevert("LoanRegistry__MaxFacilityExceeded");
    this.loanCount += 1n;
    this.loans.set(this.loanCount, {
      facilityGbp,
      feeGbp,
      disbursedGbp: 0n,
      repaidGbp: 0n,
      status: Status.Active,
      drawingClosed: false,
    });
    return this.loanCount;
  }

  recordDisbursement(loanId: bigint, gbpAmount: bigint, ref: string): void {
    const loan = this.loan(loanId);
    if (loan.status !== Status.Active) throw new ModelRevert("LoanRegistry__InvalidStatus");
    if (loan.drawingClosed) throw new ModelRevert("LoanRegistry__DrawingClosed");
    if (gbpAmount === 0n) throw new ModelRevert("LoanRegistry__ZeroAmount");
    if (this.refs.has(ref)) throw new ModelRevert("LoanRegistry__RefAlreadyUsed");
    if (loan.disbursedGbp + gbpAmount > loan.facilityGbp) throw new ModelRevert("LoanRegistry__FacilityExceeded");
    this.useRef(ref);
    loan.disbursedGbp += gbpAmount;
    if (loan.disbursedGbp === loan.facilityGbp) loan.drawingClosed = true;
  }

  closeFacility(loanId: bigint): void {
    const loan = this.loan(loanId);
    if (loan.status !== Status.Active) throw new ModelRevert("LoanRegistry__InvalidStatus");
    if (loan.drawingClosed) throw new ModelRevert("LoanRegistry__DrawingClosed");
    loan.drawingClosed = true;
    this.settleIfRepaid(loanId);
  }

  recordRepayment(loanId: bigint, gbpAmount: bigint, token: string, tokenAmount: bigint, ref: string): void {
    const loan = this.loan(loanId);
    if (loan.status !== Status.Active && loan.status !== Status.Defaulted) {
      throw new ModelRevert("LoanRegistry__InvalidStatus");
    }
    if (gbpAmount === 0n || tokenAmount === 0n) throw new ModelRevert("LoanRegistry__ZeroAmount");
    if (this.refs.has(ref)) throw new ModelRevert("LoanRegistry__RefAlreadyUsed");
    if (loan.repaidGbp + gbpAmount > this.owedGbp(loanId)) throw new ModelRevert("LoanRegistry__OwedExceeded");
    this.useRef(ref);
    loan.repaidGbp += gbpAmount;
    this.totalRepaidGbp += gbpAmount;
    this.add(this.loanReceived, key(loanId, token), tokenAmount);
    this.add(this.totalReceived, token.toLowerCase(), tokenAmount);
    this.settleIfRepaid(loanId);
  }

  depositCollateral(loanId: bigint, token: string, tokenAmount: bigint, ref: string): void {
    const loan = this.loan(loanId);
    if (loan.status !== Status.Active) throw new ModelRevert("LoanRegistry__InvalidStatus");
    if (tokenAmount === 0n) throw new ModelRevert("LoanRegistry__ZeroAmount");
    this.useRef(ref);
    this.add(this.collateralHeld, key(loanId, token), tokenAmount);
    this.add(this.totalCollateralHeld, token.toLowerCase(), tokenAmount);
  }

  setStatus(loanId: bigint, from: StatusValue, to: StatusValue): void {
    const loan = this.loan(loanId);
    if (loan.status !== from) throw new ModelRevert("LoanRegistry__InvalidStatus");
    loan.status = to;
  }

  claimCollateral(loanId: bigint, token: string, tokenAmount: bigint, gbpAmount: bigint, ref: string): void {
    const loan = this.loan(loanId);
    if (loan.status !== Status.Defaulted) throw new ModelRevert("LoanRegistry__InvalidStatus");
    if (tokenAmount === 0n || gbpAmount === 0n) throw new ModelRevert("LoanRegistry__ZeroAmount");
    const k = key(loanId, token);
    if (tokenAmount > this.get(this.collateralHeld, k)) throw new ModelRevert("LoanRegistry__CollateralExceeded");
    if (this.refs.has(ref)) throw new ModelRevert("LoanRegistry__RefAlreadyUsed");
    if (gbpAmount > this.outstandingGbp(loanId)) throw new ModelRevert("LoanRegistry__OutstandingExceeded");
    this.useRef(ref);
    this.add(this.collateralHeld, k, -tokenAmount);
    this.add(this.totalCollateralHeld, token.toLowerCase(), -tokenAmount);
    this.add(this.loanReceived, k, tokenAmount);
    this.add(this.totalReceived, token.toLowerCase(), tokenAmount);
    loan.repaidGbp += gbpAmount;
    this.totalRepaidGbp += gbpAmount;
    this.settleIfRepaid(loanId);
  }

  releaseCollateral(loanId: bigint, token: string, tokenAmount: bigint): void {
    const loan = this.loan(loanId);
    if (loan.status !== Status.Repaid && loan.status !== Status.WrittenOff) {
      throw new ModelRevert("LoanRegistry__InvalidStatus");
    }
    const k = key(loanId, token);
    if (tokenAmount > this.get(this.collateralHeld, k)) throw new ModelRevert("LoanRegistry__CollateralExceeded");
    this.add(this.collateralHeld, k, -tokenAmount);
    this.add(this.totalCollateralHeld, token.toLowerCase(), -tokenAmount);
  }

  forward(token: string, amount: bigint): void {
    const t = token.toLowerCase();
    if (this.get(this.totalForwarded, t) + amount > this.get(this.totalReceived, t)) {
      throw new ModelRevert("LoanRegistry__ForwardExceeded");
    }
    this.add(this.totalForwarded, t, amount);
  }

  /** Tokens the registry must hold for `token`: repayments not yet forwarded plus collateral (S10). */
  owedBalance(token: string): bigint {
    const t = token.toLowerCase();
    return this.get(this.totalReceived, t) - this.get(this.totalForwarded, t) + this.get(this.totalCollateralHeld, t);
  }

  /** Compares every loan, total and token balance with the deployed registry. */
  async expectMatches(registry: any, tokens: any[]): Promise<void> {
    expect(await registry.loanCount()).to.equal(this.loanCount);
    expect(await registry.totalRepaidGbp()).to.equal(this.totalRepaidGbp);
    for (const [loanId, loan] of this.loans) {
      const onChain = await registry.loans(loanId);
      expect(onChain.facilityGbp, `loan ${loanId} facility`).to.equal(loan.facilityGbp);
      expect(onChain.feeGbp, `loan ${loanId} fee`).to.equal(loan.feeGbp);
      expect(onChain.disbursedGbp, `loan ${loanId} disbursed`).to.equal(loan.disbursedGbp);
      expect(onChain.repaidGbp, `loan ${loanId} repaid`).to.equal(loan.repaidGbp);
      expect(onChain.status, `loan ${loanId} status`).to.equal(loan.status);
      expect(onChain.drawingClosed, `loan ${loanId} drawing closed`).to.equal(loan.drawingClosed);
      expect(await registry.owedGbp(loanId)).to.equal(this.owedGbp(loanId));
      expect(await registry.outstandingGbp(loanId)).to.equal(this.outstandingGbp(loanId));
      for (const token of tokens) {
        const address = await token.getAddress();
        const k = key(loanId, address);
        expect(await registry.loanReceived(loanId, address)).to.equal(this.get(this.loanReceived, k));
        expect(await registry.collateralHeld(loanId, address)).to.equal(this.get(this.collateralHeld, k));
      }
    }
    for (const token of tokens) {
      const address = await token.getAddress();
      const t = address.toLowerCase();
      expect(await registry.totalReceived(address)).to.equal(this.get(this.totalReceived, t));
      expect(await registry.totalForwarded(address)).to.equal(this.get(this.totalForwarded, t));
      expect(await registry.totalCollateralHeld(address)).to.equal(this.get(this.totalCollateralHeld, t));
      expect(await token.balanceOf(await registry.getAddress())).to.be.gte(this.owedBalance(address));
    }
  }
}
