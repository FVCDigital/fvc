import { partnerRef } from "./chain.ts";
import type { Config } from "./config.ts";
import { tokenByAddress } from "./config.ts";
import type { Emit } from "./deliveries.ts";
import {
  expectedTokenAmount,
  fiatValueOfTokens,
  formatRate,
  formatUnits,
  rateWithinBps,
  registryBandOk,
  withinAbs,
} from "./money.ts";
import { TRANSITIONS, type DepositRecord, type MessageRecord, type State } from "./state.ts";
import type {
  Address,
  DepositState,
  Entry,
  LoanBookEntry,
  LoanView,
  PayoutReturnMessage,
  Rate,
  SettlementMessage,
  TokenView,
  Tranche,
} from "./types.ts";

export interface RateSource {
  /** Reference rate (stablecoin per one unit of fiat) for that currency, token and day; null if none. */
  reference(currency: string, tokenSymbol: string, at: string): Rate | null;
}

/** Registry reads taken once per run. Keys: loan ID as a decimal string, refs and addresses lowercase. */
export interface Snapshot {
  loans: Map<string, LoanView | null>;
  refUsed: Map<string, boolean>;
  tokens: Map<Address, TokenView>;
  tranches: Map<string, Tranche | null>;
}

export interface DecideContext {
  config: Config;
  loanBook: Map<string, LoanBookEntry>;
  snapshot: Snapshot;
  rates: RateSource;
  now: Date;
}

interface Verdict {
  state: DepositState;
  reason: string;
  detail: Record<string, string>;
  entry?: Entry;
}

const HOUR = 3_600_000;
const FINAL_FOR_MESSAGE: readonly DepositState[] = ["matched", "underpayment", "overpayment", "duplicate", "disputed", "wrong_currency"];
const REPAYABLE = new Set([0, 2]);

function hoursSince(iso: string, now: Date): number {
  return (now.getTime() - Date.parse(iso)) / HOUR;
}

function addHours(iso: string, hours: number): string {
  return new Date(Date.parse(iso) + hours * HOUR).toISOString();
}

function setState(
  state: State,
  emit: Emit,
  d: DepositRecord,
  to: DepositState,
  reason: string,
  partnerTxId: string | null,
  detail: Record<string, string> = {}
): void {
  if (d.state === to && d.reason === reason && d.partnerTxId === (partnerTxId ?? d.partnerTxId)) return;
  if (!TRANSITIONS[String(d.state)].includes(to)) {
    throw new Error(`bug: ${d.deposit.id} cannot go from ${d.state} to ${to} (${reason})`);
  }
  emit({ type: "Classified", depositId: d.deposit.id, from: d.state, to, reason, partnerTxId, detail });
}

function pendingCredit(state: State, loanId: bigint, except?: string): bigint {
  let sum = 0n;
  for (const e of state.entries.values()) {
    if (e.entry.loanId === loanId && (e.status === "pending" || e.status === "batched") && e.entry.settlementRef !== except) {
      sum += e.entry.gbpCredit;
    }
  }
  return sum;
}

function reversalsOf(state: State, partnerTxId: string): string[] {
  const out: string[] = [];
  for (const m of state.messages.values()) {
    if (m.message.kind === "reversal" && m.message.originalPartnerTxId === partnerTxId) out.push(m.message.reason);
  }
  return out.sort();
}

function alertOnce(state: State, emit: Emit, kind: string, detail: string): void {
  if (!state.alerts.some((a) => a.kind === kind && a.detail === detail)) emit({ type: "Alert", kind, detail });
}

/** Deposits linked to a partner ID, plus those any version of its message names, linked or not yet. */
function namedDeposits(state: State, partnerTxId: string): DepositRecord[] {
  const out = new Set<DepositRecord>();
  for (const d of state.deposits.values()) if (d.partnerTxId === partnerTxId) out.add(d);
  const versions = [state.messages.get(partnerTxId)?.message, ...state.conflicts.filter((c) => c.partnerTxId === partnerTxId).map((c) => c.message)];
  for (const m of versions) {
    if (!m || m.kind === "reversal") continue;
    const { linked, ambiguous } = resolve(state, m);
    for (const d of [...linked, ...ambiguous]) out.add(d);
  }
  return [...out];
}

/**
 * Marks every deposit of a message disputed and pulls its entry out of any unsigned batch.
 * Runs every pass, so a deposit confirmed after the reversal or conflict is caught too.
 */
function poisonMessage(state: State, emit: Emit, partnerTxId: string, reason: string): void {
  for (const d of namedDeposits(state, partnerTxId)) {
    if (d.state !== null && d.state !== "disputed" && d.state !== "wrong_currency") {
      setState(state, emit, d, "disputed", reason, d.partnerTxId ?? partnerTxId);
    }
  }
  for (const e of state.entries.values()) {
    if (e.entry.partnerTxId !== partnerTxId) continue;
    if (e.status === "batched" && e.batchId) {
      emit({ type: "BatchVoided", batchId: e.batchId, reason, settlementRef: e.entry.settlementRef });
    }
    if (e.status === "pending" || e.status === "batched") {
      emit({ type: "EntryCancelled", settlementRef: e.entry.settlementRef, reason });
    } else if (e.status === "recorded") {
      alertOnce(
        state,
        emit,
        "CORRECTION_REQUIRED",
        `${reason}: settlement ${partnerTxId} (ref ${e.entry.settlementRef}, loan ${e.entry.loanId}) is recorded on-chain and registry v1 cannot reverse it`
      );
    }
  }
}

function classifyNewDeposits(state: State, ctx: DecideContext, emit: Emit): void {
  for (const d of state.deposits.values()) {
    if (d.state !== null) continue;
    const accepted = tokenByAddress(ctx.config, d.deposit.token);
    if (accepted) setState(state, emit, d, "awaiting_message", "WAITING", null);
    else setState(state, emit, d, "wrong_currency", "TOKEN_NOT_ACCEPTED", null, { token: d.deposit.token });
  }
}

function applyReversalsAndConflicts(state: State, emit: Emit): void {
  for (const m of state.messages.values()) {
    if (m.message.kind === "reversal" && state.messages.has(m.message.originalPartnerTxId)) {
      poisonMessage(state, emit, m.message.originalPartnerTxId, `REVERSED_${m.message.reason.toUpperCase()}`);
    }
    if (m.conflicted) poisonMessage(state, emit, m.message.partnerTxId, "MESSAGE_CONFLICT");
  }
}

/** Resolves a message's transfer pointers to confirmed deposits. */
function resolve(state: State, m: SettlementMessage | PayoutReturnMessage) {
  const linked: DepositRecord[] = [];
  const ambiguous: DepositRecord[] = [];
  let unresolved = 0;
  for (const p of m.transfers) {
    const hits = [...state.deposits.values()].filter(
      (d) => d.deposit.txHash === p.txHash && (p.logIndex === null || d.deposit.logIndex === p.logIndex)
    );
    if (hits.length === 0) unresolved += 1;
    else if (hits.length > 1) ambiguous.push(...hits);
    else linked.push(hits[0]);
  }
  return { linked, ambiguous, unresolved };
}

function amountVerdict(
  linked: DepositRecord[],
  unresolved: number,
  expected: bigint,
  token: Address | null,
  m: MessageRecord,
  ctx: DecideContext
): Verdict | null {
  if (token === null || linked.some((d) => d.deposit.token !== token)) {
    return {
      state: "disputed",
      reason: "TOKEN_MISMATCH",
      detail: { messageToken: token ?? "unknown asset", depositTokens: [...new Set(linked.map((d) => d.deposit.token))].join(",") },
    };
  }
  const sum = linked.reduce((s, d) => s + d.deposit.amount, 0n);
  const detail = { received: sum.toString(), messageSays: expected.toString() };
  if (sum > expected) return { state: "overpayment", reason: "EXCESS_SETTLEMENT", detail };
  if (unresolved > 0) {
    const since = m.firstLinkedAt ?? ctx.now.toISOString();
    if (hoursSince(since, ctx.now) >= ctx.config.partialWaitHours) return { state: "underpayment", reason: "PARTIAL_TIMEOUT", detail };
    return { state: "partial", reason: "WAITING_FOR_TRANSFERS", detail: { ...detail, missingTransfers: String(unresolved) } };
  }
  if (sum < expected) return { state: "underpayment", reason: "SHORT_SETTLEMENT", detail };
  const senders = ctx.config.partnerSenders;
  if (senders.length > 0 && linked.some((d) => !senders.includes(d.deposit.from))) {
    return { state: "disputed", reason: "SENDER_NOT_PARTNER", detail: { senders: linked.map((d) => d.deposit.from).join(",") } };
  }
  return null;
}

/** Steps 6 to 9 of spec section 3.2, shared by settlements and bounced payouts. */
function loanAndCreditVerdict(
  state: State,
  ctx: DecideContext,
  loanId: bigint,
  credit: bigint,
  token: Address,
  tokenAmount: bigint,
  ref: string
): Verdict | null {
  const view = ctx.snapshot.loans.get(loanId.toString());
  if (!view) return { state: "unmatched", reason: "LOAN_NOT_ON_CHAIN", detail: { loanId: loanId.toString() } };
  if (!REPAYABLE.has(view.status) || view.disbursedGbp === 0n) {
    return { state: "unmatched", reason: "LOAN_NOT_REPAYABLE", detail: { loanId: loanId.toString(), status: String(view.status) } };
  }
  if (credit === 0n) return { state: "disputed", reason: "ZERO_CREDIT", detail: {} };
  const room = view.outstandingGbp - pendingCredit(state, loanId, ref);
  if (credit > room) {
    return {
      state: "overpayment",
      reason: "EXCEEDS_OUTSTANDING",
      detail: { creditPence: credit.toString(), roomPence: (room < 0n ? 0n : room).toString(), loanId: loanId.toString() },
    };
  }
  const tv = ctx.snapshot.tokens.get(token);
  if (!tv || !tv.allowed) return { state: "disputed", reason: "TOKEN_NOT_ALLOWED_IN_REGISTRY", detail: { token } };
  if (!registryBandOk(credit, tokenAmount, tv.decimals, tv.minRateBps, tv.maxRateBps)) {
    return { state: "disputed", reason: "RATE_OUTSIDE_REGISTRY_BAND", detail: { creditPence: credit.toString(), tokenAmount: tokenAmount.toString() } };
  }
  if (ctx.snapshot.refUsed.get(ref) === true) return { state: "duplicate", reason: "ALREADY_RECORDED", detail: { settlementRef: ref } };
  return null;
}

function settlementVerdict(state: State, ctx: DecideContext, m: MessageRecord, msg: SettlementMessage, linked: DepositRecord[], unresolved: number): Verdict {
  const reversed = reversalsOf(state, msg.partnerTxId);
  if (reversed.length > 0) return { state: "disputed", reason: `REVERSED_${reversed[0].toUpperCase()}`, detail: {} };

  const amount = amountVerdict(linked, unresolved, msg.tokenAmount, msg.token, m, ctx);
  if (amount) return amount;
  const token = tokenByAddress(ctx.config, msg.token!)!;
  const cur = ctx.config.currencies[msg.fiatCurrency];

  const expected = expectedTokenAmount(msg.fiatAmountMinor - msg.feeMinor, cur.minorDigits, msg.rate, token.decimals);
  const tolerance = expected * BigInt(ctx.config.tolerance.internalBps) / 10_000n;
  const maxTol = tolerance > ctx.config.tolerance.roundingUnits ? tolerance : ctx.config.tolerance.roundingUnits;
  if (!withinAbs(msg.tokenAmount, expected, maxTol)) {
    return {
      state: "disputed",
      reason: "RATE_INTERNAL_MISMATCH",
      detail: { expectedTokens: formatUnits(expected, token.decimals), messageTokens: formatUnits(msg.tokenAmount, token.decimals), rate: formatRate(msg.rate) },
    };
  }

  const ref = ctx.rates.reference(msg.fiatCurrency, token.symbol, msg.settledAt);
  if (ref === null) {
    if (ctx.config.requireReferenceRate) return { state: "disputed", reason: "NO_REFERENCE_RATE", detail: { currency: msg.fiatCurrency } };
  } else if (!rateWithinBps(msg.rate, ref, ctx.config.tolerance.marketBps)) {
    return { state: "disputed", reason: "RATE_OFF_MARKET", detail: { partnerRate: formatRate(msg.rate), referenceRate: formatRate(ref) } };
  }

  const loan = ctx.loanBook.get(msg.reference);
  if (!loan) return { state: "unmatched", reason: "UNKNOWN_REFERENCE", detail: { reference: msg.reference } };
  if (loan.currency !== msg.fiatCurrency) {
    return { state: "disputed", reason: "LOAN_CURRENCY_MISMATCH", detail: { loanCurrency: loan.currency, paidIn: msg.fiatCurrency } };
  }
  if (loan.currency !== "GBP") {
    return { state: "matched", reason: "REGISTRY_CURRENCY_GAP", detail: { loanId: loan.loanId.toString(), currency: loan.currency } };
  }

  const credit = ctx.config.creditBasis === "net"
    ? fiatValueOfTokens(msg.tokenAmount, msg.rate, token.decimals, 2)
    : msg.fiatAmountMinor;
  const settlementRef = partnerRef("settlement", msg.partnerTxId);
  const blocked = loanAndCreditVerdict(state, ctx, loan.loanId, credit, token.address, msg.tokenAmount, settlementRef);
  if (blocked) return blocked;

  return {
    state: "matched",
    reason: "OK",
    detail: { loanId: loan.loanId.toString(), creditPence: credit.toString() },
    entry: {
      settlementRef,
      kind: "repayment",
      partnerTxId: msg.partnerTxId,
      reference: msg.reference,
      loanId: loan.loanId,
      gbpCredit: credit,
      token: token.address,
      tokenAmount: msg.tokenAmount,
      depositIds: linked.map((d) => d.deposit.id).sort(),
      fiatCurrency: msg.fiatCurrency,
      fiatAmountMinor: msg.fiatAmountMinor,
      feeMinor: msg.feeMinor,
      rate: msg.rate,
      eligibleAt: addHours(msg.settledAt, ctx.config.holdHours[msg.paymentMethod]),
    },
  };
}

function payoutReturnVerdict(state: State, ctx: DecideContext, m: MessageRecord, msg: PayoutReturnMessage, linked: DepositRecord[], unresolved: number): Verdict {
  const amount = amountVerdict(linked, unresolved, msg.tokenAmount, msg.token, m, ctx);
  if (amount) return amount;
  if (ctx.config.bouncedPayoutPolicy === "report") {
    return { state: "matched", reason: "BOUNCED_PAYOUT_REPORTED", detail: { originalPayoutId: msg.originalPayoutId } };
  }
  const tranche = ctx.snapshot.tranches.get(partnerRef("payout", msg.originalPayoutId));
  if (!tranche) return { state: "disputed", reason: "TRANCHE_NOT_FOUND", detail: { originalPayoutId: msg.originalPayoutId } };
  if (tranche.token !== msg.token || tranche.tokenAmount !== msg.tokenAmount) {
    return {
      state: "disputed",
      reason: "RETURN_AMOUNT_MISMATCH",
      detail: { trancheTokens: tranche.tokenAmount.toString(), returned: msg.tokenAmount.toString() },
    };
  }
  const settlementRef = partnerRef("return", msg.partnerTxId);
  const blocked = loanAndCreditVerdict(state, ctx, tranche.loanId, tranche.gbpAmount, tranche.token, msg.tokenAmount, settlementRef);
  if (blocked) return blocked;
  return {
    state: "matched",
    reason: "OK",
    detail: { loanId: tranche.loanId.toString(), creditPence: tranche.gbpAmount.toString() },
    entry: {
      settlementRef,
      kind: "payout_return",
      partnerTxId: msg.partnerTxId,
      reference: `payout:${msg.originalPayoutId}`,
      loanId: tranche.loanId,
      gbpCredit: tranche.gbpAmount,
      token: tranche.token,
      tokenAmount: msg.tokenAmount,
      depositIds: linked.map((d) => d.deposit.id).sort(),
      fiatCurrency: "GBP",
      fiatAmountMinor: tranche.gbpAmount,
      feeMinor: 0n,
      rate: null,
      eligibleAt: msg.occurredAt,
    },
  };
}

function evaluateMessage(state: State, ctx: DecideContext, emit: Emit, m: MessageRecord): void {
  const msg = m.message;
  if (msg.kind === "reversal" || m.conflicted) return;
  const { linked, ambiguous, unresolved } = resolve(state, msg);

  if (ambiguous.length > 0) {
    for (const d of ambiguous) {
      if (d.state !== "disputed" && d.state !== "wrong_currency") setState(state, emit, d, "disputed", "AMBIGUOUS_TRANSFER_POINTER", d.partnerTxId ?? msg.partnerTxId);
    }
    return;
  }
  if (linked.length === 0) return;

  const claimedByOther = linked.filter((d) => {
    const owner = state.claims.get(d.deposit.id);
    return owner !== undefined && owner !== msg.partnerTxId;
  });
  if (claimedByOther.length > 0) {
    for (const d of claimedByOther) poisonMessage(state, emit, state.claims.get(d.deposit.id)!, "DEPOSIT_CLAIMED_TWICE");
    for (const d of linked) {
      if (d.state !== "disputed" && d.state !== "wrong_currency") setState(state, emit, d, "disputed", "DEPOSIT_CLAIMED_TWICE", d.partnerTxId ?? msg.partnerTxId);
    }
    poisonMessage(state, emit, msg.partnerTxId, "DEPOSIT_CLAIMED_TWICE");
    return;
  }

  const open = linked.filter((d) => !FINAL_FOR_MESSAGE.includes(d.state as DepositState));
  if (open.length === 0) return;

  const verdict = msg.kind === "settlement"
    ? settlementVerdict(state, ctx, m, msg, linked, unresolved)
    : payoutReturnVerdict(state, ctx, m, msg, linked, unresolved);

  // The entry is logged before the deposits turn `matched`: a crash in between leaves deposits still
  // open, so the next run classifies them again and finds the entry, instead of a matched deposit with none.
  const existing = state.entries.get(msg.kind === "settlement" ? partnerRef("settlement", msg.partnerTxId) : partnerRef("return", msg.partnerTxId));
  const live = existing && existing.status !== "cancelled" ? existing : undefined;
  if (verdict.entry && open.length === linked.length && !live) emit({ type: "EntryCreated", entry: verdict.entry });
  if (!verdict.entry && live?.status === "pending") emit({ type: "EntryCancelled", settlementRef: live.entry.settlementRef, reason: verdict.reason });
  for (const d of open) setState(state, emit, d, verdict.state, verdict.reason, msg.partnerTxId, verdict.detail);
}

function expireWaits(state: State, ctx: DecideContext, emit: Emit): void {
  for (const d of state.deposits.values()) {
    if (d.state !== "awaiting_message") continue;
    if (hoursSince(d.confirmedAt, ctx.now) < ctx.config.messageWaitHours) continue;
    const token = tokenByAddress(ctx.config, d.deposit.token);
    const senders = ctx.config.partnerSenders;
    const reason = token && d.deposit.amount < token.dustThreshold
      ? "DUST"
      : senders.length > 0 && !senders.includes(d.deposit.from)
        ? "UNKNOWN_SENDER_NO_MESSAGE"
        : "NO_MESSAGE";
    setState(state, emit, d, "unmatched", reason, null);
  }
  const linkedMessages = new Set(state.claims.values());
  for (const m of state.messages.values()) {
    if (m.message.kind === "reversal" || m.expired || linkedMessages.has(m.message.partnerTxId)) continue;
    if (hoursSince(m.receivedAt, ctx.now) >= ctx.config.depositWaitHours) emit({ type: "MessageExpired", partnerTxId: m.message.partnerTxId });
  }
}

/** Takes every decision this run can make. Emits events; never reads the chain. */
export function decide(state: State, ctx: DecideContext, emit: Emit): void {
  classifyNewDeposits(state, ctx, emit);
  applyReversalsAndConflicts(state, emit);
  const messages = [...state.messages.values()].sort((a, b) => {
    const ta = a.message.kind === "settlement" ? a.message.settledAt : "occurredAt" in a.message ? a.message.occurredAt : "";
    const tb = b.message.kind === "settlement" ? b.message.settledAt : "occurredAt" in b.message ? b.message.occurredAt : "";
    return ta < tb ? -1 : ta > tb ? 1 : a.message.partnerTxId < b.message.partnerTxId ? -1 : 1;
  });
  for (const m of messages) evaluateMessage(state, ctx, emit, m);
  expireWaits(state, ctx, emit);
}

/** Loan IDs, refs and payout refs the decision step will ask about. */
export function snapshotNeeds(state: State, loanBook: Map<string, LoanBookEntry>) {
  const loans = new Set<string>();
  const refs = new Set<string>();
  const payoutRefs = new Set<string>();
  for (const m of state.messages.values()) {
    if (m.message.kind === "settlement") {
      const loan = loanBook.get(m.message.reference);
      if (loan) loans.add(loan.loanId.toString());
      refs.add(partnerRef("settlement", m.message.partnerTxId));
    } else if (m.message.kind === "payout_return") {
      payoutRefs.add(partnerRef("payout", m.message.originalPayoutId));
      refs.add(partnerRef("return", m.message.partnerTxId));
    }
  }
  for (const e of state.entries.values()) {
    loans.add(e.entry.loanId.toString());
    refs.add(e.entry.settlementRef);
  }
  return { loans, refs, payoutRefs };
}
