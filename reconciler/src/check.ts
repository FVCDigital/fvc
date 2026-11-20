import type { State } from "./state.ts";

/**
 * Three-way check: partner ledger (accepted messages), Safe transfers (confirmed deposits) and the
 * Loan Registry (`RepaymentRecorded`). Returns one line per difference; empty means all agree.
 */
export function threeWayCheck(state: State): string[] {
  const diffs: string[] = [];
  const reversed = new Set<string>();
  for (const m of state.messages.values()) {
    if (m.message.kind === "reversal") reversed.add(m.message.originalPartnerTxId);
  }

  for (const rec of state.recorded.values()) {
    const e = state.entries.get(rec.settlementRef);
    if (!e) {
      diffs.push(`UNKNOWN_RECORD: ref ${rec.settlementRef} on loan ${rec.loanId} in tx ${rec.txHash} was not written by this reconciler`);
      continue;
    }
    const x = e.entry;
    if (rec.loanId !== x.loanId || rec.token !== x.token || rec.tokenAmount !== x.tokenAmount || rec.gbpAmount !== x.gbpCredit) {
      diffs.push(
        `RECORD_MISMATCH: ref ${rec.settlementRef}: chain has loan ${rec.loanId}, ${rec.gbpAmount} pence, ${rec.tokenAmount} of ${rec.token}; ` +
          `reconciler has loan ${x.loanId}, ${x.gbpCredit} pence, ${x.tokenAmount} of ${x.token}`
      );
    }
    const deposited = x.depositIds.reduce((s, id) => s + (state.deposits.get(id)?.deposit.amount ?? 0n), 0n);
    if (deposited !== rec.tokenAmount) {
      diffs.push(`DEPOSIT_MISMATCH: ref ${rec.settlementRef}: recorded ${rec.tokenAmount}, Safe received ${deposited}`);
    }
    if (e.status === "cancelled" || reversed.has(x.partnerTxId)) {
      diffs.push(`CORRECTION_REQUIRED: ref ${rec.settlementRef} (settlement ${x.partnerTxId}) is recorded but was reversed or disputed`);
    }
  }

  const committed = new Map<string, bigint>();
  const matched = new Map<string, bigint>();
  for (const e of state.entries.values()) {
    if (e.status === "batched" || e.status === "recorded") committed.set(e.entry.token, (committed.get(e.entry.token) ?? 0n) + e.entry.tokenAmount);
  }
  for (const d of state.deposits.values()) {
    if (d.state === "matched") matched.set(d.deposit.token, (matched.get(d.deposit.token) ?? 0n) + d.deposit.amount);
  }
  for (const [token, amount] of committed) {
    const backing = matched.get(token) ?? 0n;
    if (amount > backing) diffs.push(`OVER_COMMITTED: ${token}: batched plus recorded ${amount} exceeds matched deposits ${backing}`);
  }

  for (const m of state.messages.values()) {
    if (m.message.kind !== "settlement" && m.message.kind !== "payout_return") continue;
    const deps = [...state.deposits.values()].filter((d) => d.partnerTxId === m.message.partnerTxId && d.state === "matched");
    if (deps.length === 0) continue;
    const sum = deps.reduce((s, d) => s + d.deposit.amount, 0n);
    if (sum !== m.message.tokenAmount) {
      diffs.push(`LEDGER_MISMATCH: partner ${m.message.partnerTxId} says ${m.message.tokenAmount}, matched deposits sum to ${sum}`);
    }
  }
  return diffs.sort();
}
