import type { Config } from "./config.ts";
import { tokenByAddress } from "./config.ts";
import { formatUnits } from "./money.ts";
import { liveBatches, type State } from "./state.ts";
import type { DepositState } from "./types.ts";

const REPORTABLE: readonly DepositState[] = ["underpayment", "overpayment", "unmatched", "duplicate", "wrong_currency", "disputed"];
const COLLAPSED_REASONS = new Set(["DUST", "TOKEN_NOT_ACCEPTED"]);

export interface Report {
  date: string;
  markdown: string;
  needsPerson: number;
  alerts: number;
}

function amount(config: Config, token: string, value: bigint): string {
  const t = tokenByAddress(config, token);
  return t ? `${formatUnits(value, t.decimals)} ${t.symbol}` : `${value} units of ${token}`;
}

/** Every open item with its reason. Nothing here is resolved automatically. */
export function buildReport(state: State, config: Config, now: Date): Report {
  const date = now.toISOString().slice(0, 10);
  const out: string[] = [`# Reconciliation report ${date}`, "", `Generated ${now.toISOString()}. Chain ${config.chainId}, Safe \`${config.safe}\`.`, ""];

  const check = state.lastCheck;
  const alerts = state.alerts.filter((a) => a.at.slice(0, 10) === date);
  out.push("## Alerts", "");
  if (check && !check.ok) out.push(...check.diffs.map((d) => `- **THREE-WAY CHECK**: ${d}`));
  out.push(...alerts.map((a) => `- **${a.kind}** (${a.at}): ${a.detail}`));
  if ((!check || check.ok) && alerts.length === 0) out.push("None.");
  out.push("");

  out.push("## Batches awaiting signature", "");
  const live = liveBatches(state);
  out.push(...(live.length ? live.map((b) => `- ${b.batchId}, written ${b.writtenAt}, ${b.refs.length} item(s): ${b.files.join(", ")}`) : ["None."]), "");

  const voided = [...state.batches.values()].filter((b) => b.voided !== null);
  out.push("## Voided batches: do not sign", "");
  out.push(...(voided.length ? voided.map((b) => `- ${b.batchId}: ${b.voided}. Its other items return to the next batch.`) : ["None."]), "");

  const needs = [...state.deposits.values()].filter((d) => d.state !== null && REPORTABLE.includes(d.state) && !COLLAPSED_REASONS.has(d.reason));
  const gaps = [...state.deposits.values()].filter((d) => d.state === "matched" && d.reason !== "OK");
  out.push("## Needs a person", "");
  if (needs.length + gaps.length === 0) out.push("None.");
  for (const d of [...needs, ...gaps].sort((a, b) => a.deposit.blockNumber - b.deposit.blockNumber || a.deposit.logIndex - b.deposit.logIndex)) {
    const facts = Object.entries(d.detail).map(([k, v]) => `${k}=${v}`).join(", ");
    out.push(
      `- **${d.state} / ${d.reason}**: ${amount(config, d.deposit.token, d.deposit.amount)} from \`${d.deposit.from}\`, ` +
        `[tx](${config.explorerTxUrl}${d.deposit.txHash}) log ${d.deposit.logIndex}, block ${d.deposit.blockNumber}` +
        (d.partnerTxId ? `, partner ${d.partnerTxId}` : "") + (facts ? `. ${facts}` : "")
    );
  }
  out.push("");

  const blocked = [...state.entries.values()].filter((e) => e.status === "pending" && e.blockedReason);
  out.push("## Matched but held back from the batch", "");
  out.push(...(blocked.length ? blocked.map((e) => `- partner ${e.entry.partnerTxId}, loan ${e.entry.loanId}: ${e.blockedReason}`) : ["None."]), "");

  const linked = new Set([...state.deposits.values()].map((d) => d.partnerTxId).filter((x) => x !== null));
  const noDeposit = [...state.messages.values()].filter((m) => m.expired && !linked.has(m.message.partnerTxId));
  out.push("## Partner messages with no deposit", "");
  out.push(...(noDeposit.length ? noDeposit.map((m) => `- ${m.message.kind} ${m.message.partnerTxId}, received ${m.receivedAt}`) : ["None."]), "");

  const orphanReversals = [...state.messages.values()].filter((m) => m.message.kind === "reversal" && !state.messages.has(m.message.originalPartnerTxId));
  out.push("## Reversals for settlements we never received", "");
  out.push(...(orphanReversals.length ? orphanReversals.map((m) => m.message.kind === "reversal" ? `- ${m.message.partnerTxId} reverses ${m.message.originalPartnerTxId} (${m.message.reason})` : "") : ["None."]), "");

  out.push("## Conflicting partner messages", "");
  out.push(...(state.conflicts.length ? state.conflicts.map((c) => `- ${c.partnerTxId}: delivery ${c.deliveryId} at ${c.at} differs from the first message with that ID`) : ["None."]), "");

  const rejected = state.rejected.filter((r) => r.at.slice(0, 10) === date);
  out.push("## Rejected deliveries today", "");
  out.push(...(rejected.length ? rejected.map((r) => `- ${r.deliveryId ?? "(no delivery ID)"}: ${r.reason}`) : ["None."]), "");

  const collapsed = new Map<string, { count: number; total: bigint; senders: Set<string>; reason: string }>();
  for (const d of state.deposits.values()) {
    if (!COLLAPSED_REASONS.has(d.reason)) continue;
    const key = `${d.reason}|${d.deposit.token}`;
    const c = collapsed.get(key) ?? { count: 0, total: 0n, senders: new Set<string>(), reason: d.reason };
    c.count += 1;
    c.total += d.deposit.amount;
    c.senders.add(d.deposit.from);
    collapsed.set(key, c);
  }
  out.push("## Dust and unaccepted tokens (collapsed)", "");
  if (collapsed.size === 0) out.push("None.");
  for (const [key, c] of collapsed) {
    out.push(`- ${c.reason}: ${c.count} transfer(s), ${amount(config, key.split("|")[1], c.total)} in total, from ${c.senders.size} sender(s). Never batched.`);
  }
  out.push("");

  return { date, markdown: out.join("\n"), needsPerson: needs.length + gaps.length, alerts: alerts.length + (check && !check.ok ? check.diffs.length : 0) };
}
