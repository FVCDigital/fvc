import { Interface, getAddress } from "ethers";
import { ERC20_ABI, REGISTRY_ABI, partnerRef, type ChainSource, type RegistryReader } from "./chain.ts";
import { batchIdOf } from "./batch.ts";
import type { ConfirmationPolicy } from "./config.ts";
import { registryBandOk } from "./money.ts";
import type { Entry } from "./types.ts";

const registryIface = new Interface(REGISTRY_ABI);
const erc20Iface = new Interface(ERC20_ABI);

export interface VerifyInput {
  safeJson: unknown;
  evidenceJson: unknown;
  /** What the signer expects, typed in by them, not read from the batch. */
  expected: { chainId: number; safe: string; registry: string; confirmation: ConfirmationPolicy };
}

export interface VerifyResult {
  ok: boolean;
  lines: string[];
}

const lower = (a: string) => getAddress(a).toLowerCase();

/**
 * Checks a batch from its own files and the chain only. Run it with an RPC the signer trusts,
 * not the reconciler's. Every line says what was checked; any FAIL means do not sign.
 */
export async function verifyBatch(input: VerifyInput, chain: ChainSource, registry: RegistryReader): Promise<VerifyResult> {
  const lines: string[] = [];
  let ok = true;
  const pass = (msg: string) => lines.push(`PASS ${msg}`);
  const fail = (msg: string) => {
    ok = false;
    lines.push(`FAIL ${msg}`);
  };

  const safe = input.safeJson as any;
  const ev = input.evidenceJson as any;
  const exp = { ...input.expected, safe: lower(input.expected.safe), registry: lower(input.expected.registry) };

  const chainId = await chain.chainId();
  chainId === exp.chainId ? pass(`RPC chain is ${chainId}`) : fail(`RPC chain is ${chainId}, expected ${exp.chainId}`);
  String(safe?.chainId) === String(exp.chainId) ? pass(`batch chainId ${safe?.chainId}`) : fail(`batch chainId ${safe?.chainId}, expected ${exp.chainId}`);
  lower(safe?.meta?.createdFromSafeAddress ?? "0x0000000000000000000000000000000000000000") === exp.safe
    ? pass(`batch is for Safe ${exp.safe}`)
    : fail(`batch is for Safe ${safe?.meta?.createdFromSafeAddress}, expected ${exp.safe}`);
  const regSafe = await registry.safe();
  regSafe === exp.safe ? pass(`registry.safe() is the Safe`) : fail(`registry.safe() is ${regSafe}`);

  const items: Entry[] = (ev?.items ?? []).map((i: any) => ({
    settlementRef: String(i.settlementRef).toLowerCase(),
    kind: i.kind,
    partnerTxId: String(i.partnerTxId),
    reference: String(i.reference),
    loanId: BigInt(i.loanId),
    gbpCredit: BigInt(i.gbpCreditPence),
    token: lower(i.token),
    tokenAmount: BigInt(i.tokenAmount),
    depositIds: [],
    fiatCurrency: String(i.fiatCurrency),
    fiatAmountMinor: BigInt(i.fiatAmountMinor),
    feeMinor: BigInt(i.feeMinor),
    rate: null,
    eligibleAt: "",
  }));
  if (items.length === 0) fail("evidence has no items");
  batchIdOf(items) === ev?.batchId ? pass(`batch ID ${ev?.batchId} matches its items`) : fail(`batch ID ${ev?.batchId} does not match its items`);

  const txs: { to: string; value: string; data: string }[] = Array.isArray(safe?.transactions) ? safe.transactions : [];
  if (txs.some((t) => String(t.value) !== "0")) fail("a transaction sends ETH");
  const approvals = new Map<string, bigint>();
  const records: Entry[] = [];
  for (const [n, t] of txs.entries()) {
    const to = lower(t.to);
    if (to === exp.registry) {
      const p = registryIface.parseTransaction({ data: t.data });
      if (p?.name !== "recordRepayment") {
        fail(`tx ${n + 1} calls ${p?.name ?? "unknown"} on the registry`);
        continue;
      }
      records.push({ ...items[0], loanId: p.args[0], gbpCredit: p.args[1], token: lower(p.args[2]), tokenAmount: p.args[3], settlementRef: String(p.args[4]).toLowerCase() });
      continue;
    }
    let p;
    try {
      p = erc20Iface.parseTransaction({ data: t.data });
    } catch {
      p = null;
    }
    if (p?.name !== "approve" || lower(p.args[0]) !== exp.registry) {
      fail(`tx ${n + 1} to ${to} is not approve(registry, x)`);
      continue;
    }
    if (p.args[1] !== 0n) {
      if (approvals.has(to)) fail(`two non-zero approvals for ${to}`);
      approvals.set(to, p.args[1]);
    }
  }

  records.length === items.length ? pass(`${records.length} recordRepayment call(s), same as evidence`) : fail(`${records.length} recordRepayment calls, evidence has ${items.length}`);
  for (const [i, r] of records.entries()) {
    const e = items[i];
    if (!e) break;
    const same = r.loanId === e.loanId && r.gbpCredit === e.gbpCredit && r.token === e.token && r.tokenAmount === e.tokenAmount && r.settlementRef === e.settlementRef;
    same ? pass(`call ${i + 1} matches evidence item ${i + 1}`) : fail(`call ${i + 1} differs from evidence item ${i + 1}`);
  }
  const sums = new Map<string, bigint>();
  for (const r of records) sums.set(r.token, (sums.get(r.token) ?? 0n) + r.tokenAmount);
  for (const [token, sum] of sums) {
    approvals.get(token) === sum ? pass(`approval for ${token} equals the sum of its repayments`) : fail(`approval for ${token} is ${approvals.get(token) ?? 0n}, repayments sum to ${sum}`);
  }
  for (const token of approvals.keys()) if (!sums.has(token)) fail(`approval for ${token} with no repayment`);

  const confirmed = await chain.confirmedHead(exp.confirmation);
  const usedDeposits = new Set<string>();
  const reserved = new Map<string, bigint>();
  for (const [i, raw] of (ev?.items ?? []).entries()) {
    const e = items[i];
    const label = `item ${i + 1} (loan ${e.loanId}, partner ${e.partnerTxId})`;
    const expectedRef = partnerRef(e.kind === "payout_return" ? "return" : "settlement", e.partnerTxId);
    expectedRef === e.settlementRef ? pass(`${label}: ref is derived from the partner ID`) : fail(`${label}: ref is not derived from partner ID ${e.partnerTxId}`);
    (await registry.refUsed(e.settlementRef)) ? fail(`${label}: ref already used on-chain`) : pass(`${label}: ref not used yet`);

    let deposited = 0n;
    for (const d of raw.deposits ?? []) {
      const key = `${String(d.txHash).toLowerCase()}:${d.logIndex}`;
      if (usedDeposits.has(key)) fail(`${label}: deposit ${key} used twice in this batch`);
      usedDeposits.add(key);
      const found = await chain.transfersInTx(d.txHash, exp.safe);
      const log = found?.deposits.find((x) => x.logIndex === Number(d.logIndex));
      if (!found || !log) {
        fail(`${label}: no transfer to the Safe at ${key}`);
        continue;
      }
      if (found.blockNumber > confirmed) fail(`${label}: deposit ${key} is in block ${found.blockNumber}, not yet confirmed (${confirmed})`);
      if (log.token !== e.token) fail(`${label}: deposit ${key} is token ${log.token}, item says ${e.token}`);
      if (log.amount !== BigInt(d.amount)) fail(`${label}: deposit ${key} is ${log.amount}, evidence says ${d.amount}`);
      deposited += log.amount;
    }
    deposited === e.tokenAmount ? pass(`${label}: deposits on-chain sum to ${deposited}`) : fail(`${label}: deposits sum to ${deposited}, item records ${e.tokenAmount}`);

    const loan = await registry.loan(e.loanId);
    const used = reserved.get(e.loanId.toString()) ?? 0n;
    if (!loan) fail(`${label}: loan does not exist`);
    else if ((loan.status !== 0 && loan.status !== 2) || loan.disbursedGbp === 0n) fail(`${label}: loan status ${loan.status} cannot take repayments`);
    else if (used + e.gbpCredit > loan.outstandingGbp) fail(`${label}: credit ${e.gbpCredit} exceeds outstanding ${loan.outstandingGbp - used}`);
    else pass(`${label}: loan open, outstanding ${loan.outstandingGbp - used} pence covers ${e.gbpCredit}`);
    reserved.set(e.loanId.toString(), used + e.gbpCredit);

    const tc = await registry.tokenConfig(e.token);
    if (!tc.allowed) fail(`${label}: token not allowed in registry`);
    else if (!registryBandOk(e.gbpCredit, e.tokenAmount, tc.decimals, tc.minRateBps, tc.maxRateBps)) fail(`${label}: rate outside the registry band`);
    else pass(`${label}: token allowed, rate inside the registry band`);
  }
  return { ok, lines };
}
