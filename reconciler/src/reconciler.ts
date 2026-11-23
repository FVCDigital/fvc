import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { buildBatch, selectBatch, writeBatch } from "./batch.ts";
import type { ChainSource, RegistryReader } from "./chain.ts";
import { threeWayCheck } from "./check.ts";
import type { Config } from "./config.ts";
import { decide, snapshotNeeds, type RateSource, type Snapshot } from "./decide.ts";
import { processDeliveries } from "./deliveries.ts";
import type { Event } from "./events.ts";
import type { DeliverySource } from "./inbox.ts";
import { HaltError, ingestChain } from "./ingest.ts";
import { sha256, type EventLog } from "./log.ts";
import type { PartnerAdapter } from "./partner/adapter.ts";
import { buildReport } from "./report.ts";
import { apply, replay, type State } from "./state.ts";
import type { LoanBookEntry } from "./types.ts";

export const VERSION = "0.1.0";

export interface Deps {
  config: Config;
  configHash: string;
  log: EventLog;
  chain: ChainSource;
  registry: RegistryReader;
  adapter: PartnerAdapter;
  inbox: DeliverySource;
  loanBook: Map<string, LoanBookEntry>;
  rates: RateSource;
  secret: string;
  clock: () => Date;
  /** Where batches and reports go; null keeps them in memory only (tests). */
  outDir: string | null;
}

export interface RunResult {
  state: State;
  batchId: string | null;
  batchFiles: Record<string, string>;
  report: string;
  checkOk: boolean;
  confirmedHead: number;
}

/** Checks the chain and registry agree with settings before anything is read. */
async function preflight(deps: Deps): Promise<void> {
  const { config, chain, registry } = deps;
  const problems: string[] = [];
  const chainId = await chain.chainId();
  if (chainId !== config.chainId) problems.push(`RPC is chain ${chainId}, settings say ${config.chainId}`);
  const safe = await registry.safe();
  if (safe !== config.safe) problems.push(`registry.safe() is ${safe}, settings say ${config.safe}`);
  for (const t of config.tokens) {
    const onChain = await chain.tokenDecimals(t.address);
    if (onChain !== t.decimals) problems.push(`${t.symbol} has ${onChain} decimals on-chain, settings say ${t.decimals}`);
    const tc = await registry.tokenConfig(t.address);
    if (tc.known && tc.decimals !== t.decimals) problems.push(`registry stores ${tc.decimals} decimals for ${t.symbol}, settings say ${t.decimals}`);
  }
  if (problems.length > 0) throw new HaltError(`settings do not match the chain: ${problems.join("; ")}`);
}

/**
 * Registry reads pinned to the block the cursor reached, so a repayment executed but not yet
 * confirmed is neither in `outstandingGbp` nor in the log, and is never subtracted twice.
 */
async function takeSnapshot(state: State, deps: Deps, at: number): Promise<Snapshot> {
  const { loans, refs, payoutRefs } = snapshotNeeds(state, deps.loanBook);
  const snapshot: Snapshot = { loans: new Map(), refUsed: new Map(), tokens: new Map(), tranches: new Map() };
  for (const ref of payoutRefs) {
    const tranche = await deps.registry.trancheByPayoutRef(ref, deps.config.startBlock, at);
    snapshot.tranches.set(ref, tranche);
    if (tranche) loans.add(tranche.loanId.toString());
  }
  for (const id of loans) snapshot.loans.set(id, await deps.registry.loan(BigInt(id), at));
  for (const ref of refs) snapshot.refUsed.set(ref, await deps.registry.refUsed(ref, at));
  for (const t of deps.config.tokens) snapshot.tokens.set(t.address, await deps.registry.tokenConfig(t.address, at));
  return snapshot;
}

/**
 * One full pass: deliveries, chain, decisions, batch, three-way check, report. Every input and
 * decision is appended to the log before anything depends on it. Safe to run again at any time.
 */
export async function runOnce(deps: Deps): Promise<RunResult> {
  const state = replay(deps.log.all());
  const now = deps.clock();
  const at = now.toISOString();
  const emit = (event: Event) => {
    deps.log.append(event, at);
    apply(state, event, at);
  };

  emit({ type: "RunStarted", runId: randomUUID(), configHash: deps.configHash, version: VERSION });
  try {
    await preflight(deps);
  } catch (e) {
    if (e instanceof HaltError) emit({ type: "Alert", kind: "PREFLIGHT_FAILED", detail: e.message });
    throw e;
  }

  processDeliveries(state, deps.inbox.list(), deps.adapter, deps.config, deps.secret, emit);
  const { confirmedHead } = await ingestChain(state, deps.chain, deps.registry, deps.config, emit);
  const block = state.cursor?.blockNumber ?? confirmedHead;

  decide(state, { config: deps.config, loanBook: deps.loanBook, snapshot: await takeSnapshot(state, deps, block), rates: deps.rates, now }, emit);

  let batchId: string | null = null;
  const batchFiles: Record<string, string> = {};
  const items = selectBatch(state, deps.config, await takeSnapshot(state, deps, block), now, emit);
  if (items.length > 0) {
    const built = buildBatch(items, state, deps.config, now, deps.log.head());
    batchId = built.batchId;
    batchFiles[`${built.batchId}.json`] = built.safeJson;
    batchFiles[`${built.batchId}.evidence.json`] = built.evidenceJson;
    batchFiles[`${built.batchId}.md`] = built.summaryMd;
    const written = deps.outDir
      ? writeBatch(join(deps.outDir, "batches"), built)
      : { files: Object.keys(batchFiles), sha: sha256(built.safeJson) };
    emit({ type: "BatchWritten", batchId: built.batchId, files: written.files, sha256: written.sha, refs: items.map((e) => e.settlementRef) });
  }

  const diffs = threeWayCheck(state);
  emit({ type: "CheckCompleted", ok: diffs.length === 0, diffs });

  const report = buildReport(state, deps.config, now);
  if (deps.outDir) {
    const dir = join(deps.outDir, "reports");
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `report-${report.date}.md`);
    writeFileSync(file, report.markdown);
    emit({ type: "ReportWritten", file, sha256: sha256(report.markdown) });
  }

  return { state, batchId, batchFiles, report: report.markdown, checkOk: diffs.length === 0, confirmedHead };
}
