import { Interface } from "ethers";
import { ERC20_ABI, REGISTRY_ABI, type ChainSource, type RegistryReader } from "../../src/chain.ts";
import type { ConfirmationPolicy } from "../../src/config.ts";
import { sha256 } from "../../src/log.ts";
import type { Address, Deposit, LoanStatus, LoanView, RecordedRepayment, TokenView, Tranche } from "../../src/types.ts";

interface Log {
  index: number;
  token: Address;
  from: Address;
  to: Address;
  amount: bigint;
}
interface Tx {
  hash: string;
  logs: Log[];
}
interface Block {
  number: number;
  hash: string;
  txs: Tx[];
  repayments: RecordedRepayment[];
  tranches: Tranche[];
  loanPatches: { loanId: string; patch: Partial<LoanBase> }[];
}
export interface LoanBase {
  status: LoanStatus;
  disbursedGbp: bigint;
  feeGbp: bigint;
  drawingClosed: boolean;
}

const registryIface = new Interface(REGISTRY_ABI);
const erc20Iface = new Interface(ERC20_ABI);

export class BatchReverted extends Error {}

/**
 * An in-memory chain plus a Loan Registry whose `recordRepayment` copies the contract's checks.
 * Every view can be read at any block, and blocks can be reorganised.
 */
export class FakeChain implements ChainSource, RegistryReader {
  readonly id: number;
  readonly safeAddress: Address;
  readonly registryAddress: Address;
  blocks: Block[] = [];
  decimals = new Map<Address, number>();
  tokens = new Map<Address, TokenView>();
  loans = new Map<string, LoanBase>();
  finalizedLag = 64;
  private salt = 0;
  private txCounter = 0;
  calls = { transfersTo: 0 };

  constructor(chainId: number, safe: Address, registry: Address) {
    this.id = chainId;
    this.safeAddress = safe;
    this.registryAddress = registry;
    this.mine([]);
  }

  private hashOf(n: number): string {
    return "0x" + sha256(`block:${n}:${this.salt}`);
  }

  /** Adds a block holding `transfers` as one transaction each (or all in one when `oneTx`). */
  mine(transfers: { token: Address; from: Address; to?: Address; amount: bigint }[], oneTx = false): { blockNumber: number; txHashes: string[] } {
    const number = this.blocks.length;
    const groups = oneTx ? [transfers] : transfers.map((t) => [t]);
    let index = 0;
    const txs: Tx[] = groups
      .filter((g) => g.length > 0)
      .map((g) => ({
        hash: "0x" + sha256(`tx:${this.txCounter++}:${this.salt}`),
        logs: g.map((t) => ({ index: index++, token: t.token, from: t.from, to: t.to ?? this.safeAddress, amount: t.amount })),
      }));
    this.blocks.push({ number, hash: this.hashOf(number), txs, repayments: [], tranches: [], loanPatches: [] });
    return { blockNumber: number, txHashes: txs.map((t) => t.hash) };
  }

  mineEmpty(n: number): void {
    for (let i = 0; i < n; i++) this.mine([]);
  }

  /** Drops every block from `fromBlock` up; later blocks get new hashes. */
  reorg(fromBlock: number): void {
    this.salt += 1;
    this.blocks = this.blocks.slice(0, fromBlock);
  }

  addTranche(t: Omit<Tranche, "payoutRef"> & { payoutRef: string }): void {
    this.mine([]);
    this.blocks[this.blocks.length - 1].tranches.push(t);
  }

  patchLoan(loanId: bigint, patch: Partial<LoanBase>): void {
    this.mine([]);
    this.blocks[this.blocks.length - 1].loanPatches.push({ loanId: loanId.toString(), patch });
  }

  // ------------------------------------------------------------------ ChainSource

  async chainId(): Promise<number> {
    return this.id;
  }
  async head(): Promise<number> {
    return this.blocks.length - 1;
  }
  async confirmedHead(policy: ConfirmationPolicy): Promise<number> {
    const head = this.blocks.length - 1;
    return policy.mode === "finalized" ? Math.max(-1, head - this.finalizedLag) : Math.max(-1, head - policy.blocks);
  }
  async blockHash(n: number): Promise<string> {
    const b = this.blocks[n];
    if (!b) throw new Error(`no block ${n}`);
    return b.hash;
  }
  private deposit(b: Block, tx: Tx, l: Log): Deposit {
    return { id: `${this.id}:${tx.hash}:${l.index}`, chainId: this.id, txHash: tx.hash, logIndex: l.index, blockNumber: b.number, blockHash: b.hash, token: l.token, from: l.from, amount: l.amount };
  }
  async transfersTo(to: Address, fromBlock: number, toBlock: number): Promise<Deposit[]> {
    this.calls.transfersTo += 1;
    const out: Deposit[] = [];
    for (const b of this.blocks.slice(fromBlock, toBlock + 1)) {
      for (const tx of b.txs) for (const l of tx.logs) if (l.to === to) out.push(this.deposit(b, tx, l));
    }
    return out;
  }
  async transfersInTx(txHash: string, to: Address): Promise<{ deposits: Deposit[]; blockNumber: number } | null> {
    for (const b of this.blocks) {
      const tx = b.txs.find((t) => t.hash === txHash);
      if (tx) return { deposits: tx.logs.filter((l) => l.to === to).map((l) => this.deposit(b, tx, l)), blockNumber: b.number };
    }
    return null;
  }
  async tokenDecimals(token: Address): Promise<number> {
    const d = this.decimals.get(token);
    if (d === undefined) throw new Error(`no token ${token}`);
    return d;
  }

  // ------------------------------------------------------------------ RegistryReader

  private upTo(blockTag?: number): Block[] {
    return this.blocks.slice(0, (blockTag ?? this.blocks.length - 1) + 1);
  }
  private loanAt(loanId: bigint, blockTag?: number): (LoanBase & { repaidGbp: bigint }) | null {
    const base = this.loans.get(loanId.toString());
    if (!base) return null;
    const l = { ...base, repaidGbp: 0n };
    for (const b of this.upTo(blockTag)) {
      for (const p of b.loanPatches) if (p.loanId === loanId.toString()) Object.assign(l, p.patch);
      for (const r of b.repayments) if (r.loanId === loanId) l.repaidGbp += r.gbpAmount;
    }
    return l;
  }
  async safe(): Promise<Address> {
    return this.safeAddress;
  }
  async loan(loanId: bigint, blockTag?: number): Promise<LoanView | null> {
    const l = this.loanAt(loanId, blockTag);
    if (!l) return null;
    const owed = l.disbursedGbp + l.feeGbp;
    return { loanId, status: l.status, disbursedGbp: l.disbursedGbp, feeGbp: l.feeGbp, repaidGbp: l.repaidGbp, outstandingGbp: owed > l.repaidGbp ? owed - l.repaidGbp : 0n };
  }
  async refUsed(ref: string, blockTag?: number): Promise<boolean> {
    return this.upTo(blockTag).some((b) => b.repayments.some((r) => r.settlementRef === ref) || b.tranches.some((t) => t.payoutRef === ref));
  }
  async tokenConfig(token: Address): Promise<TokenView> {
    return this.tokens.get(token) ?? { allowed: false, known: false, decimals: 0, minRateBps: 0n, maxRateBps: 0n };
  }
  async repayments(fromBlock: number, toBlock: number): Promise<RecordedRepayment[]> {
    return this.blocks.slice(fromBlock, toBlock + 1).flatMap((b) => b.repayments);
  }
  async trancheByPayoutRef(payoutRef: string, fromBlock: number, toBlock: number): Promise<Tranche | null> {
    const hits = this.blocks.slice(fromBlock, toBlock + 1).flatMap((b) => b.tranches.filter((t) => t.payoutRef === payoutRef));
    return hits.length === 1 ? hits[0] : null;
  }

  // ------------------------------------------------------------------ the Safe executing a batch

  /**
   * Runs a Safe Transaction Builder batch as one atomic MultiSend from the Safe, with the
   * contract's checks. Throws `BatchReverted` and changes nothing if any call would revert.
   */
  async execute(safeJson: { transactions: { to: string; value: string; data: string }[] }): Promise<number> {
    const allowance = new Map<Address, bigint>();
    const repaid = new Map<string, bigint>();
    const used = new Set<string>();
    const records: RecordedRepayment[] = [];
    const head = this.blocks.length;
    for (const t of safeJson.transactions) {
      const to = t.to.toLowerCase();
      if (to === this.registryAddress) {
        const p = registryIface.parseTransaction({ data: t.data })!;
        if (p.name !== "recordRepayment") throw new BatchReverted(`unexpected ${p.name}`);
        const [loanId, gbp, tokenRaw, amount, refRaw] = p.args as unknown as [bigint, bigint, string, bigint, string];
        const token = tokenRaw.toLowerCase();
        const ref = refRaw.toLowerCase();
        const l = this.loanAt(loanId);
        if (!l) throw new BatchReverted("LoanNotFound");
        if (l.status !== 0 && l.status !== 2) throw new BatchReverted("InvalidStatus");
        if (l.disbursedGbp === 0n) throw new BatchReverted("NothingDisbursed");
        const tc = await this.tokenConfig(token);
        if (!tc.allowed) throw new BatchReverted("TokenNotAllowed");
        if (gbp === 0n || amount === 0n) throw new BatchReverted("ZeroAmount");
        if (used.has(ref) || (await this.refUsed(ref))) throw new BatchReverted("RefAlreadyUsed");
        used.add(ref);
        const r = (repaid.get(loanId.toString()) ?? l.repaidGbp) + gbp;
        if (r > l.disbursedGbp + l.feeGbp) throw new BatchReverted("OwedExceeded");
        repaid.set(loanId.toString(), r);
        const scaledGbp = gbp * 10n ** BigInt(tc.decimals);
        if (amount * 1_000_000n < tc.minRateBps * scaledGbp || amount * 1_000_000n > tc.maxRateBps * scaledGbp) throw new BatchReverted("RateOutOfBand");
        const a = allowance.get(token) ?? 0n;
        if (a < amount) throw new BatchReverted("ERC20InsufficientAllowance");
        allowance.set(token, a - amount);
        records.push({ loanId, gbpAmount: gbp, token, tokenAmount: amount, settlementRef: ref, txHash: "", blockNumber: head, logIndex: records.length });
      } else {
        const p = erc20Iface.parseTransaction({ data: t.data })!;
        if (p.name !== "approve") throw new BatchReverted(`unexpected ${p.name}`);
        allowance.set(to, p.args[1] as bigint);
      }
    }
    this.mine(records.map((r) => ({ token: r.token, from: this.safeAddress, to: this.registryAddress, amount: r.tokenAmount })), true);
    const b = this.blocks[head];
    const txHash = b.txs[0]?.hash ?? "0x" + sha256(`exec:${head}`);
    b.repayments = records.map((r) => ({ ...r, txHash }));
    return head;
  }
}
