import { test } from "node:test";
import assert from "node:assert/strict";
import { partnerRef } from "../src/chain.ts";
import { PARTNER, USDC, World, baseConfig } from "./helpers/world.ts";

test("direct-debit return inside the hold: entry cancelled before any batch", async () => {
  const w = new World();
  w.pay({ id: "tx_dd", method: "direct_debit" });
  await w.run();
  w.advance(48);
  w.deliver([w.reversal({ transactionId: "rev_1", originalTransactionId: "tx_dd", reason: "direct_debit_return" })]);
  w.advance(30);
  const r = await w.run();
  assert.equal(r.batchId, null);
  const s = w.state();
  assert.equal([...s.deposits.values()][0].state, "disputed");
  assert.equal([...s.deposits.values()][0].reason, "REVERSED_DIRECT_DEBIT_RETURN");
  assert.equal([...s.entries.values()][0].status, "cancelled");
});

test("chargeback after batching, before signing: the batch is voided and the other items return", async () => {
  const w = new World();
  w.pay({ id: "tx_1", ref: "FVC-L1" });
  w.pay({ id: "tx_2", ref: "FVC-L2" });
  const r1 = await w.run();
  assert.equal(JSON.parse(r1.batchFiles[`${r1.batchId}.evidence.json`]).items.length, 2);
  w.deliver([w.reversal({ transactionId: "rev_1", originalTransactionId: "tx_1", reason: "chargeback" })]);
  const r2 = await w.run();
  const s = w.state();
  assert.equal(s.batches.get(r1.batchId!)!.voided, "REVERSED_CHARGEBACK");
  assert.ok(r2.batchId && r2.batchId !== r1.batchId);
  const items = JSON.parse(r2.batchFiles[`${r2.batchId}.evidence.json`]).items;
  assert.deepEqual(items.map((i: { partnerTxId: string }) => i.partnerTxId), ["tx_2"]);
  assert.match(r2.report, new RegExp(`${r1.batchId}: REVERSED_CHARGEBACK`));
});

test("chargeback after recording: CORRECTION_REQUIRED, the check keeps failing, nothing auto-resolved", async () => {
  const w = new World();
  w.pay({ id: "tx_1" });
  const r1 = await w.run();
  await w.execute(r1);
  w.confirm();
  const r2 = await w.run();
  assert.ok(r2.checkOk);
  w.deliver([w.reversal({ transactionId: "rev_1", originalTransactionId: "tx_1", reason: "chargeback" })]);
  const r3 = await w.run();
  assert.equal(r3.checkOk, false);
  const s = w.state();
  assert.equal(s.alerts.filter((a) => a.kind === "CORRECTION_REQUIRED").length, 1);
  assert.equal([...s.entries.values()][0].status, "recorded");
  assert.match(r3.report, /CORRECTION_REQUIRED/);
  w.advance(24);
  const r4 = await w.run();
  assert.equal(r4.checkOk, false);
  assert.equal(w.state().alerts.filter((a) => a.kind === "CORRECTION_REQUIRED").length, 1);
});

test("clawback for a settlement never received is reported", async () => {
  const w = new World();
  w.deliver([w.reversal({ transactionId: "rev_x", originalTransactionId: "tx_unknown", reason: "clawback" })]);
  const r = await w.run();
  assert.match(r.report, /rev_x reverses tx_unknown \(clawback\)/);
});

test("bounced payout, policy report: matched but never batched, reported", async () => {
  const w = new World();
  w.chain.addTranche({ loanId: 2n, gbpAmount: 50_000n, token: USDC, tokenAmount: 635_000_000n, payoutRef: partnerRef("payout", "po_1") });
  const [hash] = w.chain.mine([{ token: USDC, from: PARTNER, amount: 635_000_000n }]).txHashes;
  w.confirm();
  w.deliver([w.payoutReturn({ transactionId: "ret_1", originalPayoutId: "po_1", asset: "USDC", cryptoAmount: "635.000000", transfers: [{ tx_hash: hash, log_index: 0 }] })]);
  const r = await w.run();
  assert.equal(r.batchId, null);
  assert.equal([...w.state().deposits.values()][0].reason, "BOUNCED_PAYOUT_REPORTED");
  assert.match(r.report, /BOUNCED_PAYOUT_REPORTED/);
});

test("bounced payout, policy record: recorded against the tranche's loan with the return ref", async () => {
  const w = new World(baseConfig({ bouncedPayoutPolicy: "record_as_repayment" }));
  w.chain.addTranche({ loanId: 2n, gbpAmount: 50_000n, token: USDC, tokenAmount: 635_000_000n, payoutRef: partnerRef("payout", "po_1") });
  const [hash] = w.chain.mine([{ token: USDC, from: PARTNER, amount: 635_000_000n }]).txHashes;
  w.confirm();
  w.deliver([w.payoutReturn({ transactionId: "ret_1", originalPayoutId: "po_1", asset: "USDC", cryptoAmount: "635.000000", transfers: [{ tx_hash: hash, log_index: 0 }] })]);
  const r = await w.run();
  const [item] = JSON.parse(r.batchFiles[`${r.batchId}.evidence.json`]).items;
  assert.equal(item.settlementRef, partnerRef("return", "ret_1"));
  assert.equal(item.loanId, "2");
  assert.equal(item.gbpCreditPence, "50000");
});

test("bounced payout returning a different amount is disputed", async () => {
  const w = new World(baseConfig({ bouncedPayoutPolicy: "record_as_repayment" }));
  w.chain.addTranche({ loanId: 2n, gbpAmount: 50_000n, token: USDC, tokenAmount: 635_000_000n, payoutRef: partnerRef("payout", "po_1") });
  const [hash] = w.chain.mine([{ token: USDC, from: PARTNER, amount: 630_000_000n }]).txHashes;
  w.confirm();
  w.deliver([w.payoutReturn({ transactionId: "ret_1", originalPayoutId: "po_1", asset: "USDC", cryptoAmount: "630.000000", transfers: [{ tx_hash: hash, log_index: 0 }] })]);
  await w.run();
  assert.equal([...w.state().deposits.values()][0].reason, "RETURN_AMOUNT_MISMATCH");
});

test("a second message claiming a deposit already used disputes both, never two entries", async () => {
  const w = new World();
  const { txHashes, units } = w.pay({ id: "tx_1" });
  const r1 = await w.run();
  w.deliver([w.settlementEvent({ id: "tx_other", ref: "FVC-L2" }, txHashes, units)]);
  await w.run();
  const s = w.state();
  assert.equal([...s.deposits.values()][0].state, "disputed");
  assert.equal([...s.deposits.values()][0].reason, "DEPOSIT_CLAIMED_TWICE");
  assert.equal(s.batches.get(r1.batchId!)!.voided, "DEPOSIT_CLAIMED_TWICE");
  assert.equal([...s.entries.values()].filter((e) => e.status !== "cancelled").length, 0);
});

test("settlement already recorded on-chain outside the reconciler is a duplicate", async () => {
  const w = new World();
  const ref = partnerRef("settlement", "tx_1");
  w.chain.mine([]);
  w.chain.blocks.at(-1)!.repayments.push({ loanId: 1n, gbpAmount: 10_000n, token: USDC, tokenAmount: 127_000_000n, settlementRef: ref, txHash: "0x" + "ee".repeat(32), blockNumber: w.chain.blocks.length - 1, logIndex: 0 });
  w.pay({ id: "tx_1" });
  const r = await w.run();
  const d = [...w.state().deposits.values()][0];
  assert.equal(d.state, "duplicate");
  assert.equal(d.reason, "ALREADY_RECORDED");
  assert.equal(r.checkOk, false);
  assert.match(r.report, /UNKNOWN_RECORD/);
});
