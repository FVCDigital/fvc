import { test } from "node:test";
import assert from "node:assert/strict";
import { Interface } from "ethers";
import { REGISTRY_ABI } from "../src/chain.ts";
import { verifyBatch } from "../src/verify.ts";
import { CHAIN_ID, REGISTRY, SAFE, USDC, World } from "./helpers/world.ts";

const iface = new Interface(REGISTRY_ABI);
const expected = { chainId: CHAIN_ID, safe: SAFE, registry: REGISTRY, confirmation: { mode: "depth" as const, blocks: 2 } };

async function threeItemBatch() {
  const w = new World();
  w.pay({ id: "tx_1", ref: "FVC-L1", gbp: "100.00" });
  w.pay({ id: "tx_2", ref: "FVC-L2", gbp: "40.00", asset: "USDT" });
  w.pay({ id: "tx_3", ref: "FVC-L4", gbp: "20.00" });
  const r = await w.run();
  return { w, r, safe: JSON.parse(r.batchFiles[`${r.batchId}.json`]), evidence: JSON.parse(r.batchFiles[`${r.batchId}.evidence.json`]) };
}

test("batch layout: approvals per token, then one recordRepayment per item, all value 0", async () => {
  const { safe, evidence } = await threeItemBatch();
  assert.equal(evidence.items.length, 3);
  const names = safe.transactions.map((t: { to: string; data: string }) =>
    t.to === REGISTRY ? iface.parseTransaction({ data: t.data })!.name : `approve@${t.to.slice(0, 6)}`
  );
  assert.deepEqual(names, ["approve@0xa0b8", "approve@0xdac1", "approve@0xdac1", "recordRepayment", "recordRepayment", "recordRepayment"]);
  assert.ok(safe.transactions.every((t: { value: string }) => t.value === "0"));
  assert.equal(safe.meta.createdFromSafeAddress, SAFE);
});

test("batch executes on the fake registry and the three-way check agrees afterwards", async () => {
  const { w, r } = await threeItemBatch();
  await w.execute(r);
  w.confirm();
  const r2 = await w.run();
  assert.ok(r2.checkOk, r2.report);
  assert.equal(r2.batchId, null);
  assert.ok([...w.state().entries.values()].every((e) => e.status === "recorded"));
  assert.equal((await w.chain.loan(4n))!.outstandingGbp, 8_000n);
});

test("a batch with one bad item: the item is left out and reported, the rest batched", async () => {
  const w = new World();
  w.pay({ id: "tx_1", ref: "FVC-L1", method: "direct_debit" });
  w.pay({ id: "tx_2", ref: "FVC-L2", method: "direct_debit" });
  await w.run();
  // During the hold, loan 2 is written off on-chain.
  w.chain.patchLoan(2n, { status: 3 });
  w.advance(73);
  w.confirm();
  const r = await w.run();
  const items = JSON.parse(r.batchFiles[`${r.batchId}.evidence.json`]).items;
  assert.deepEqual(items.map((i: { partnerTxId: string }) => i.partnerTxId), ["tx_1"]);
  assert.match(r.report, /loan 2: LOAN_NOT_REPAYABLE/);
  await w.execute(r);
});

test("batch ID depends only on its items, so a rerun after a crash writes the same batch", async () => {
  const a = await threeItemBatch();
  const b = await threeItemBatch();
  assert.equal(a.r.batchId, b.r.batchId);
});

test("an executed batch is not proposed again; ref reuse would revert on-chain anyway", async () => {
  const { w, r } = await threeItemBatch();
  await w.execute(r);
  await assert.rejects(w.execute(r), /RefAlreadyUsed/);
});

test("pinned snapshot: a batch executed but not yet confirmed does not cause a false overpayment", async () => {
  const w = new World();
  // Loan 4 owes 100.00. Pay 60 now and 40 later.
  w.pay({ id: "tx_1", ref: "FVC-L4", gbp: "60.00" });
  const r1 = await w.run();
  // tx_2 is confirmed; the Safe then executes batch 1 in a block that is not confirmed yet.
  w.pay({ id: "tx_2", ref: "FVC-L4", gbp: "40.00" });
  await w.execute(r1);
  assert.equal((await w.chain.loan(4n))!.outstandingGbp, 4_000n);
  const r2 = await w.run();
  const d = [...w.state().deposits.values()].find((x) => x.partnerTxId === "tx_2")!;
  assert.equal(d.state, "matched", r2.report);
});

test("verify-batch passes on an honest batch", async () => {
  const { w, safe, evidence } = await threeItemBatch();
  const v = await verifyBatch({ safeJson: safe, evidenceJson: evidence, expected }, w.chain, w.chain);
  assert.ok(v.ok, v.lines.join("\n"));
});

test("verify-batch catches tampering: amount, loan, recipient, ETH value, approval, wrong Safe", async () => {
  const { w, safe, evidence } = await threeItemBatch();
  const run = async (s: unknown, e: unknown = evidence, x = expected) => verifyBatch({ safeJson: s, evidenceJson: e, expected: x }, w.chain, w.chain);
  const clone = () => JSON.parse(JSON.stringify(safe));

  const amount = clone();
  const call = iface.parseTransaction({ data: amount.transactions[3].data })!;
  amount.transactions[3].data = iface.encodeFunctionData("recordRepayment", [call.args[0], call.args[1] + 1n, call.args[2], call.args[3], call.args[4]]);
  assert.equal((await run(amount)).ok, false);

  const loan = clone();
  loan.transactions[3].data = iface.encodeFunctionData("recordRepayment", [2n, call.args[1], call.args[2], call.args[3], call.args[4]]);
  assert.equal((await run(loan)).ok, false);

  const value = clone();
  value.transactions[0].value = "1";
  assert.equal((await run(value)).ok, false);

  const approve = clone();
  approve.transactions[0].data = approve.transactions[0].data.slice(0, -2) + "ff";
  assert.equal((await run(approve)).ok, false);

  const stranger = clone();
  stranger.transactions.push({ to: "0x000000000000000000000000000000000000dead", value: "0", data: "0x" });
  assert.equal((await run(stranger)).ok, false);

  assert.equal((await run(safe, evidence, { ...expected, safe: USDC })).ok, false);

  const ev = JSON.parse(JSON.stringify(evidence));
  ev.items[0].deposits[0].txHash = "0x" + "99".repeat(32);
  assert.equal((await run(safe, ev)).ok, false);
});

test("verify-batch fails a deposit that is not yet confirmed on the signer's RPC", async () => {
  const w = new World();
  const { txHashes, units } = w.sendOnChain({ id: "tx_1" });
  w.confirm();
  w.deliver([w.settlementEvent({ id: "tx_1" }, txHashes, units)]);
  const r = await w.run();
  const v = await verifyBatch(
    { safeJson: JSON.parse(r.batchFiles[`${r.batchId}.json`]), evidenceJson: JSON.parse(r.batchFiles[`${r.batchId}.evidence.json`]), expected: { ...expected, confirmation: { mode: "depth", blocks: 10 } } },
    w.chain,
    w.chain
  );
  assert.equal(v.ok, false);
  assert.ok(v.lines.some((l) => /not yet confirmed/.test(l)));
});
