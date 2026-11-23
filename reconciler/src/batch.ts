import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Interface } from "ethers";
import { ERC20_ABI, REGISTRY_ABI } from "./chain.ts";
import type { Config } from "./config.ts";
import { tokenByAddress } from "./config.ts";
import type { Snapshot } from "./decide.ts";
import type { Emit } from "./deliveries.ts";
import { canonical, sha256 } from "./log.ts";
import { formatRate, formatUnits, registryBandOk } from "./money.ts";
import type { State } from "./state.ts";
import type { Entry } from "./types.ts";

const registryIface = new Interface(REGISTRY_ABI);
const erc20Iface = new Interface(ERC20_ABI);

/**
 * Picks the entries that can go in a batch now, re-checking each against fresh registry reads.
 * An entry that would revert is left out and marked blocked; it is tried again next run.
 */
export function selectBatch(state: State, config: Config, snapshot: Snapshot, now: Date, emit: Emit): Entry[] {
  const reserved = new Map<string, bigint>();
  for (const e of state.entries.values()) {
    if (e.status === "batched") reserved.set(e.entry.loanId.toString(), (reserved.get(e.entry.loanId.toString()) ?? 0n) + e.entry.gbpCredit);
  }
  const candidates = [...state.entries.values()]
    .filter((e) => e.status === "pending" && Date.parse(e.entry.eligibleAt) <= now.getTime())
    .sort((a, b) => (a.entry.eligibleAt < b.entry.eligibleAt ? -1 : a.entry.eligibleAt > b.entry.eligibleAt ? 1 : a.entry.settlementRef < b.entry.settlementRef ? -1 : 1));

  const items: Entry[] = [];
  for (const rec of candidates) {
    const e = rec.entry;
    const block = (reason: string) => {
      if (rec.blockedReason !== reason) emit({ type: "EntryBlocked", settlementRef: e.settlementRef, reason });
    };
    if (!e.depositIds.every((id) => state.deposits.get(id)?.state === "matched")) {
      block("DEPOSIT_NO_LONGER_MATCHED");
      continue;
    }
    const loanKey = e.loanId.toString();
    const view = snapshot.loans.get(loanKey);
    if (!view || (view.status !== 0 && view.status !== 2) || view.disbursedGbp === 0n) {
      block("LOAN_NOT_REPAYABLE");
      continue;
    }
    const used = reserved.get(loanKey) ?? 0n;
    if (used + e.gbpCredit > view.outstandingGbp) {
      block("EXCEEDS_OUTSTANDING_AT_BATCH_TIME");
      continue;
    }
    if (snapshot.refUsed.get(e.settlementRef) !== false) {
      block("REF_ALREADY_USED_OR_UNKNOWN");
      continue;
    }
    const tv = snapshot.tokens.get(e.token);
    if (!tv || !tv.allowed) {
      block("TOKEN_NOT_ALLOWED_IN_REGISTRY");
      continue;
    }
    if (!registryBandOk(e.gbpCredit, e.tokenAmount, tv.decimals, tv.minRateBps, tv.maxRateBps)) {
      block("RATE_OUTSIDE_REGISTRY_BAND");
      continue;
    }
    reserved.set(loanKey, used + e.gbpCredit);
    items.push(e);
  }
  return items;
}

export interface BuiltBatch {
  batchId: string;
  safeJson: string;
  evidenceJson: string;
  summaryMd: string;
}

export function batchIdOf(items: readonly Entry[]): string {
  return `B-${sha256(canonical(items.map((e) => [e.settlementRef, e.loanId, e.gbpCredit, e.token, e.tokenAmount]))).slice(0, 12)}`;
}

/** Builds the Safe Transaction Builder file, the evidence file and the signer summary. Pure. */
export function buildBatch(items: readonly Entry[], state: State, config: Config, now: Date, logHead: string): BuiltBatch {
  if (items.length === 0) throw new Error("empty batch");
  const batchId = batchIdOf(items);
  const tokens = [...new Set(items.map((e) => e.token))].sort();
  const transactions: { to: string; value: string; data: string }[] = [];
  for (const token of tokens) {
    const setting = tokenByAddress(config, token)!;
    const total = items.filter((e) => e.token === token).reduce((s, e) => s + e.tokenAmount, 0n);
    if (setting.approveResetFirst) {
      transactions.push({ to: token, value: "0", data: erc20Iface.encodeFunctionData("approve", [config.registry, 0n]) });
    }
    transactions.push({ to: token, value: "0", data: erc20Iface.encodeFunctionData("approve", [config.registry, total]) });
  }
  for (const e of items) {
    transactions.push({
      to: config.registry,
      value: "0",
      data: registryIface.encodeFunctionData("recordRepayment", [e.loanId, e.gbpCredit, e.token, e.tokenAmount, e.settlementRef]),
    });
  }

  const safe = {
    version: "1.0",
    chainId: String(config.chainId),
    createdAt: now.getTime(),
    meta: {
      name: `Loan Registry repayments ${batchId}`,
      description: `${items.length} repayment(s). Check every line against ${batchId}.md and run verify-batch before signing.`,
      txBuilderVersion: "1.16.5",
      createdFromSafeAddress: config.safe,
    },
    transactions,
  };

  const evidence = {
    batchId,
    chainId: config.chainId,
    safe: config.safe,
    registry: config.registry,
    eventLogHead: logHead,
    writtenAt: now.toISOString(),
    items: items.map((e) => ({
      settlementRef: e.settlementRef,
      kind: e.kind,
      partnerTxId: e.partnerTxId,
      reference: e.reference,
      loanId: e.loanId.toString(),
      gbpCreditPence: e.gbpCredit.toString(),
      token: e.token,
      tokenSymbol: tokenByAddress(config, e.token)!.symbol,
      tokenAmount: e.tokenAmount.toString(),
      fiatCurrency: e.fiatCurrency,
      fiatAmountMinor: e.fiatAmountMinor.toString(),
      feeMinor: e.feeMinor.toString(),
      rate: e.rate ? formatRate(e.rate) : null,
      deposits: e.depositIds.map((id) => {
        const d = state.deposits.get(id)!.deposit;
        return { txHash: d.txHash, logIndex: d.logIndex, blockNumber: d.blockNumber, from: d.from, amount: d.amount.toString() };
      }),
    })),
  };

  const lines = [
    `# Batch ${batchId}`,
    "",
    `Chain ${config.chainId}. Safe \`${config.safe}\`. Loan Registry \`${config.registry}\`. Written ${now.toISOString()}.`,
    "",
    "Written by the reconciler, which holds no key. Nobody has proposed this. Before signing, check every",
    "row below against the partner's dashboard, then run this with your own RPC in `VERIFY_RPC_URL`.",
    "Type the chain, Safe and registry from your own records; do not copy them from this file.",
    "",
    "```",
    `npm run reconcile -- verify-batch ${batchId}.json --chain-id <chain> --safe <your Safe> --registry <registry> ${config.confirmation.mode === "finalized" ? "--finalized" : `--depth ${config.confirmation.blocks}`}`,
    "```",
    "",
    "| # | Loan | Reference | Credit (GBP) | Paid | Rate | Tokens | Deposit |",
    "|---|---|---|---|---|---|---|---|",
    ...items.map((e, i) => {
      const t = tokenByAddress(config, e.token)!;
      const deps = e.depositIds
        .map((id) => state.deposits.get(id)!.deposit)
        .map((d) => `[${d.txHash.slice(0, 10)}...:${d.logIndex}](${config.explorerTxUrl}${d.txHash})`)
        .join(" ");
      const paid = `${formatUnits(e.fiatAmountMinor, config.currencies[e.fiatCurrency]?.minorDigits ?? 2)} ${e.fiatCurrency} (fee ${formatUnits(e.feeMinor, config.currencies[e.fiatCurrency]?.minorDigits ?? 2)})`;
      return `| ${i + 1} | ${e.loanId} | ${e.reference} | ${formatUnits(e.gbpCredit, 2)} | ${paid} | ${e.rate ? formatRate(e.rate) : "n/a"} | ${formatUnits(e.tokenAmount, t.decimals)} ${t.symbol} | ${deps} |`;
    }),
    "",
    "Transactions in the batch, in order:",
    "",
    ...tokens.flatMap((token) => {
      const t = tokenByAddress(config, token)!;
      const total = items.filter((e) => e.token === token).reduce((s, e) => s + e.tokenAmount, 0n);
      return [
        ...(t.approveResetFirst ? [`- ${t.symbol}.approve(registry, 0)`] : []),
        `- ${t.symbol}.approve(registry, ${formatUnits(total, t.decimals)})`,
      ];
    }),
    ...items.map((e) => `- recordRepayment(loan ${e.loanId}, ${e.gbpCredit} pence, ${tokenByAddress(config, e.token)!.symbol}, ${e.tokenAmount}, ${e.settlementRef})`),
    "",
  ];

  return {
    batchId,
    safeJson: JSON.stringify(safe, null, 2) + "\n",
    evidenceJson: JSON.stringify(evidence, null, 2) + "\n",
    summaryMd: lines.join("\n"),
  };
}

/** Writes the three files. Content is fixed by the items, so a rerun after a crash writes the same thing. */
export function writeBatch(dir: string, built: BuiltBatch): { files: string[]; sha: string } {
  mkdirSync(dir, { recursive: true });
  const files = [
    [`${built.batchId}.json`, built.safeJson],
    [`${built.batchId}.evidence.json`, built.evidenceJson],
    [`${built.batchId}.md`, built.summaryMd],
  ] as const;
  for (const [name, content] of files) {
    const path = join(dir, name);
    if (existsSync(path) && name.endsWith(".evidence.json")) {
      const old = JSON.parse(readFileSync(path, "utf8"));
      if (JSON.stringify(old.items) !== JSON.stringify(JSON.parse(content).items)) throw new Error(`${path} exists with different items`);
    }
    writeFileSync(path, content);
  }
  return { files: files.map(([n]) => n), sha: sha256(built.safeJson) };
}
