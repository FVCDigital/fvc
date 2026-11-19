import { parseConfig, type Config } from "../../src/config.ts";
import { MemoryInbox } from "../../src/inbox.ts";
import { EventLog, MemoryStore } from "../../src/log.ts";
import { MockPartnerAdapter } from "../../src/partner/adapter.ts";
import { MockPartner, type Chaos, type MockPayoutReturn, type MockReversal, type MockSettlement, type WireEvent } from "../../src/partner/mock.ts";
import { runOnce, type RunResult } from "../../src/reconciler.ts";
import { StaticRateSource, parseLoanBook } from "../../src/sources.ts";
import { replay, type State } from "../../src/state.ts";
import type { PaymentMethod, RawDelivery } from "../../src/types.ts";
import { toUnits } from "../../src/money.ts";
import { FakeChain, type LoanBase } from "./fake-chain.ts";

export const SECRET = "test-webhook-secret-not-real";
export const CHAIN_ID = 11155111;
export const SAFE = "0x5afe00000000000000000000000000000000beef";
export const REGISTRY = "0x7e6157e700000000000000000000000000000001";
export const USDC = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
export const USDT = "0xdac17f958d2ee523a2206206994597c13d831ec7";
/** A contract that calls itself "USDC" but is not the configured one. */
export const FAKE_USDC = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb49";
export const PARTNER = "0x9a27000000000000000000000000000000000001";
export const STRANGER = "0x5772a00000000000000000000000000000000bad";

export const START = new Date("2026-11-20T09:00:00.000Z");

export function baseConfig(overrides: Record<string, unknown> = {}): Config {
  return parseConfig({
    chainId: CHAIN_ID,
    safe: SAFE,
    registry: REGISTRY,
    startBlock: 0,
    confirmation: { mode: "depth", blocks: 2 },
    chunkSize: 5,
    tokens: [
      { symbol: "USDC", address: USDC, decimals: 6, approveResetFirst: false, dustThreshold: "1000000" },
      { symbol: "USDT", address: USDT, decimals: 6, approveResetFirst: true, dustThreshold: "1000000" },
    ],
    partnerSenders: [PARTNER],
    currencies: { GBP: { minorDigits: 2 }, CHF: { minorDigits: 2 }, EUR: { minorDigits: 2 } },
    tolerance: { internalBps: 10, roundingUnits: "2", marketBps: 200 },
    requireReferenceRate: true,
    referenceRates: [
      { currency: "GBP", token: "USDC", date: "*", rate: "1.27" },
      { currency: "GBP", token: "USDT", date: "*", rate: "1.27" },
      { currency: "CHF", token: "USDC", date: "*", rate: "1.13" },
      { currency: "CHF", token: "USDT", date: "*", rate: "1.13" },
    ],
    creditBasis: "net",
    holdHours: { bank_transfer: 0, direct_debit: 72, card: 0 },
    messageWaitHours: 24,
    partialWaitHours: 24,
    depositWaitHours: 24,
    bouncedPayoutPolicy: "report",
    maxClockSkewSeconds: 300,
    explorerTxUrl: "https://sepolia.etherscan.io/tx/",
    paths: { data: "data", inbox: "inbox", out: "out", loanBook: "loans.json" },
    ...overrides,
  });
}

export const LOAN_BOOK = [
  { reference: "FVC-L1", loanId: "1", currency: "GBP" },
  { reference: "FVC-L2", loanId: "2", currency: "GBP" },
  { reference: "FVC-L3", loanId: "3", currency: "CHF" },
  { reference: "FVC-L4", loanId: "4", currency: "GBP" },
];

const OPEN = (disbursedGbp: bigint, feeGbp = 0n): LoanBase => ({ status: 0, disbursedGbp, feeGbp, drawingClosed: true });

export interface Pay {
  id: string;
  ref?: string;
  gbp?: string;
  currency?: string;
  fee?: string;
  asset?: "USDC" | "USDT" | string;
  rate?: string;
  method?: PaymentMethod;
  /** On-chain token; defaults to the configured contract for `asset`. */
  token?: string;
  /** Override what arrives on-chain (token units). */
  sendUnits?: bigint;
  /** Override what the message says (decimal string). */
  claim?: string;
  from?: string;
  /** Split the on-chain amount into these parts, one tx each. */
  split?: bigint[];
}

/** A chain, a partner and the reconciler, wired together, with a clock the test moves. */
export class World {
  chain: FakeChain;
  partner = new MockPartner(SECRET);
  inbox = new MemoryInbox();
  store = new MemoryStore();
  config: Config;
  now = new Date(START);
  loanBook = parseLoanBook(LOAN_BOOK);

  constructor(config: Config = baseConfig()) {
    this.config = config;
    this.chain = new FakeChain(CHAIN_ID, SAFE, REGISTRY);
    for (const t of [USDC, USDT, FAKE_USDC]) this.chain.decimals.set(t, 6);
    for (const t of [USDC, USDT]) this.chain.tokens.set(t, { allowed: true, known: true, decimals: 6, minRateBps: 11_000n, maxRateBps: 15_000n });
    this.chain.loans.set("1", OPEN(500_000n, 25_000n));
    this.chain.loans.set("2", OPEN(200_000n));
    this.chain.loans.set("3", OPEN(300_000n));
    this.chain.loans.set("4", OPEN(10_000n));
  }

  log(): EventLog {
    return new EventLog(this.store);
  }

  state(): State {
    return replay(this.log().all());
  }

  advance(hours: number): void {
    this.now = new Date(this.now.getTime() + hours * 3_600_000);
  }

  async run(): Promise<RunResult> {
    return runOnce({
      config: this.config,
      configHash: "test",
      log: this.log(),
      chain: this.chain,
      registry: this.chain,
      adapter: new MockPartnerAdapter(),
      inbox: this.inbox,
      loanBook: this.loanBook,
      rates: new StaticRateSource(this.config),
      secret: SECRET,
      clock: () => this.now,
      outDir: null,
    });
  }

  /** Units the partner would send for a settlement (fiat minus fee, times rate, floored). */
  static units(gbp: string, fee: string, rate: string): bigint {
    const net = toUnits(gbp, 2) - toUnits(fee, 2);
    const r = toUnits(rate, 6);
    return (net * r) / 100n;
  }

  /** The partner pays the Safe on-chain (not yet confirmed). Returns the tx hashes. */
  sendOnChain(p: Pay): { txHashes: string[]; units: bigint } {
    const asset = p.asset ?? "USDC";
    const token = p.token ?? (asset === "USDT" ? USDT : USDC);
    const units = p.sendUnits ?? World.units(p.gbp ?? "100.00", p.fee ?? "0.00", p.rate ?? "1.27");
    const parts = p.split ?? [units];
    const hashes: string[] = [];
    for (const amount of parts) hashes.push(...this.chain.mine([{ token, from: p.from ?? PARTNER, amount }]).txHashes);
    return { txHashes: hashes, units };
  }

  confirm(): void {
    this.chain.mineEmpty(2);
  }

  settlementEvent(p: Pay, txHashes: string[], units: bigint): WireEvent {
    const s: MockSettlement = {
      transactionId: p.id,
      reference: p.ref ?? "FVC-L1",
      method: p.method ?? "bank_transfer",
      currency: p.currency ?? "GBP",
      fiatAmount: p.gbp ?? "100.00",
      fee: p.fee ?? "0.00",
      asset: p.asset ?? "USDC",
      cryptoAmount: p.claim ?? formatSix(units),
      rate: p.rate ?? "1.27",
      transfers: txHashes.map((h) => ({ tx_hash: h, log_index: 0 })),
      settledAt: this.now.toISOString(),
    };
    return this.partner.settlement(s);
  }

  deliver(events: WireEvent[], chaos: Chaos = {}): RawDelivery[] {
    const d = this.partner.deliver(events, this.now, chaos);
    // Received when sent; an outage just delays both.
    this.inbox.push(...d);
    return d;
  }

  /** Full happy path for one payment: transfer, confirmations, signed message. */
  pay(p: Pay): { txHashes: string[]; units: bigint; event: WireEvent } {
    const { txHashes, units } = this.sendOnChain(p);
    this.confirm();
    const event = this.settlementEvent(p, txHashes, units);
    this.deliver([event]);
    return { txHashes, units, event };
  }

  reversal(r: Omit<MockReversal, "occurredAt" | "currency" | "fiatAmount"> & Partial<MockReversal>): WireEvent {
    return this.partner.reversal({ currency: "GBP", fiatAmount: "100.00", occurredAt: this.now.toISOString(), ...r });
  }

  payoutReturn(p: Omit<MockPayoutReturn, "occurredAt"> & Partial<MockPayoutReturn>): WireEvent {
    return this.partner.payoutReturn({ occurredAt: this.now.toISOString(), ...p });
  }

  depositsByState(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const d of this.state().deposits.values()) out[String(d.state)] = (out[String(d.state)] ?? 0) + 1;
    return out;
  }

  /** Signers execute the batch as written (the test plays the Safe). */
  async execute(result: RunResult): Promise<number> {
    if (!result.batchId) throw new Error("no batch to execute");
    return this.chain.execute(JSON.parse(result.batchFiles[`${result.batchId}.json`]));
  }
}

export function formatSix(units: bigint): string {
  const s = units.toString().padStart(7, "0");
  return `${s.slice(0, -6)}.${s.slice(-6)}`;
}
