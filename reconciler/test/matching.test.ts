import { test } from "node:test";
import assert from "node:assert/strict";
import { partnerRef } from "../src/chain.ts";
import { FAKE_USDC, PARTNER, STRANGER, USDC, USDT, World, baseConfig } from "./helpers/world.ts";

const dep = (w: World) => [...w.state().deposits.values()];

test("happy path: one bank transfer becomes one batch item with the right ref and credit", async () => {
  const w = new World();
  w.pay({ id: "tx_1", gbp: "100.00" });
  const r = await w.run();
  assert.ok(r.batchId, r.report);
  const [d] = dep(w);
  assert.equal(d.state, "matched");
  assert.equal(d.reason, "OK");
  const entry = w.state().entries.get(partnerRef("settlement", "tx_1"))!;
  assert.equal(entry.status, "batched");
  assert.equal(entry.entry.gbpCredit, 10_000n);
  assert.equal(entry.entry.tokenAmount, 127_000_000n);
  assert.equal(entry.entry.loanId, 1n);
  assert.ok(r.checkOk);
});

test("unconfirmed deposit is not read; message waits", async () => {
  const w = new World();
  const { txHashes, units } = w.sendOnChain({ id: "tx_1" });
  w.chain.mineEmpty(1);
  w.deliver([w.settlementEvent({ id: "tx_1" }, txHashes, units)]);
  const r = await w.run();
  assert.equal(r.batchId, null);
  assert.equal(w.state().deposits.size, 0);
  w.chain.mineEmpty(1);
  const r2 = await w.run();
  assert.ok(r2.batchId);
});

test("underpayment: less arrives than the message says", async () => {
  const w = new World();
  w.pay({ id: "tx_1", sendUnits: 126_000_000n, claim: "127.000000" });
  const r = await w.run();
  assert.equal(r.batchId, null);
  assert.equal(dep(w)[0].state, "underpayment");
  assert.equal(dep(w)[0].reason, "SHORT_SETTLEMENT");
  assert.match(r.report, /underpayment \/ SHORT_SETTLEMENT/);
});

test("overpayment: more arrives than the message says", async () => {
  const w = new World();
  w.pay({ id: "tx_1", sendUnits: 128_000_000n, claim: "127.000000" });
  await w.run();
  assert.equal(dep(w)[0].state, "overpayment");
  assert.equal(dep(w)[0].reason, "EXCESS_SETTLEMENT");
});

test("overpayment: credit above what the loan still owes", async () => {
  const w = new World();
  // Loan 4 owes 100.00 GBP.
  w.pay({ id: "tx_1", ref: "FVC-L4", gbp: "150.00" });
  const r = await w.run();
  assert.equal(r.batchId, null);
  assert.equal(dep(w)[0].state, "overpayment");
  assert.equal(dep(w)[0].reason, "EXCEEDS_OUTSTANDING");
});

test("partial: two transfers for one settlement, second confirms later", async () => {
  const w = new World();
  const first = w.chain.mine([{ token: USDC, from: PARTNER, amount: 100_000_000n }]).txHashes[0];
  w.confirm();
  const secondHash = "0x" + "ab".repeat(32);
  const ev = w.partner.settlement({
    transactionId: "tx_split",
    reference: "FVC-L1",
    method: "bank_transfer",
    currency: "GBP",
    fiatAmount: "100.00",
    fee: "0.00",
    asset: "USDC",
    cryptoAmount: "127.000000",
    rate: "1.27",
    transfers: [{ tx_hash: first, log_index: 0 }, { tx_hash: secondHash, log_index: 0 }],
    settledAt: w.now.toISOString(),
  });
  w.deliver([ev]);
  await w.run();
  assert.equal(dep(w)[0].state, "partial");
  // The second transfer never arrives: after the wait it becomes an underpayment, never auto-credited.
  w.advance(25);
  await w.run();
  assert.equal(dep(w)[0].state, "underpayment");
  assert.equal(dep(w)[0].reason, "PARTIAL_TIMEOUT");
});

test("partial then complete: both transfers named, both confirmed in separate runs", async () => {
  const w = new World();
  const a = w.chain.mine([{ token: USDC, from: PARTNER, amount: 100_000_000n }]).txHashes[0];
  const b = w.chain.mine([{ token: USDC, from: PARTNER, amount: 27_000_000n }]).txHashes[0];
  w.chain.mineEmpty(1);
  const ev = w.partner.settlement({
    transactionId: "tx_split",
    reference: "FVC-L1",
    method: "bank_transfer",
    currency: "GBP",
    fiatAmount: "100.00",
    fee: "0.00",
    asset: "USDC",
    cryptoAmount: "127.000000",
    rate: "1.27",
    transfers: [{ tx_hash: a, log_index: 0 }, { tx_hash: b, log_index: 0 }],
    settledAt: w.now.toISOString(),
  });
  w.deliver([ev]);
  await w.run();
  assert.deepEqual(w.depositsByState(), { partial: 1 });
  w.chain.mineEmpty(1);
  const r = await w.run();
  assert.deepEqual(w.depositsByState(), { matched: 2 });
  assert.ok(r.batchId);
  assert.equal([...w.state().entries.values()][0].entry.depositIds.length, 2);
});

test("multiple payments for one loan go in one batch, within the outstanding balance", async () => {
  const w = new World();
  w.pay({ id: "tx_1", ref: "FVC-L2", gbp: "1000.00" });
  w.pay({ id: "tx_2", ref: "FVC-L2", gbp: "800.00" });
  w.pay({ id: "tx_3", ref: "FVC-L2", gbp: "300.00" });
  const r = await w.run();
  // Loan 2 owes 2000.00: the first two fit (1800), the third would exceed it.
  const states = dep(w).map((d) => `${d.partnerTxId}:${d.state}:${d.reason}`).sort();
  assert.deepEqual(states, ["tx_1:matched:OK", "tx_2:matched:OK", "tx_3:overpayment:EXCEEDS_OUTSTANDING"]);
  const evidence = JSON.parse(r.batchFiles[`${r.batchId}.evidence.json`]);
  assert.equal(evidence.items.length, 2);
});

test("missing reference is malformed and rejected; unknown reference is unmatched", async () => {
  const w = new World();
  w.pay({ id: "tx_1", ref: "NOPE-99" });
  const bad = w.partner.settlement({
    transactionId: "tx_2",
    reference: "",
    method: "bank_transfer",
    currency: "GBP",
    fiatAmount: "1.00",
    fee: "0.00",
    asset: "USDC",
    cryptoAmount: "1.270000",
    rate: "1.27",
    transfers: [{ tx_hash: "0x" + "11".repeat(32), log_index: 0 }],
    settledAt: w.now.toISOString(),
  });
  w.deliver([bad]);
  const r = await w.run();
  assert.equal(dep(w)[0].state, "unmatched");
  assert.equal(dep(w)[0].reason, "UNKNOWN_REFERENCE");
  assert.equal(w.state().rejected.length, 1);
  assert.match(w.state().rejected[0].reason, /MALFORMED: payment_reference missing/);
  assert.match(r.report, /MALFORMED/);
});

test("malformed reference characters are rejected", async () => {
  const w = new World();
  w.pay({ id: "tx_1", ref: "FVC-L1'; DROP" });
  await w.run();
  assert.match(w.state().rejected[0].reason, /payment_reference malformed/);
  // The deposit itself waits, then becomes unmatched: never credited to a guessed loan.
  w.advance(25);
  await w.run();
  assert.equal(dep(w)[0].state, "unmatched");
  assert.equal(dep(w)[0].reason, "NO_MESSAGE");
});

test("reused reference: two settlements for one loan are two separate credits, never merged", async () => {
  const w = new World();
  w.pay({ id: "tx_1", ref: "FVC-L1" });
  w.pay({ id: "tx_2", ref: "FVC-L1" });
  const r = await w.run();
  assert.equal(JSON.parse(r.batchFiles[`${r.batchId}.evidence.json`]).items.length, 2);
});

test("loan book refuses a reference listed for two loans", async () => {
  const { parseLoanBook } = await import("../src/sources.ts");
  assert.throws(() => parseLoanBook([{ reference: "X", loanId: "1", currency: "GBP" }, { reference: "X", loanId: "2", currency: "GBP" }]), /listed twice/);
  assert.throws(() => parseLoanBook([{ reference: "X", loanId: "1", currency: "GBP" }, { reference: "Y", loanId: "1", currency: "GBP" }]), /two references/);
});

test("wrong token: an unaccepted token is wrong_currency and never batched", async () => {
  const w = new World();
  const other = "0x6b175474e89094c44da98b954eedeac495271d0f";
  w.chain.decimals.set(other, 18);
  w.chain.mine([{ token: other, from: PARTNER, amount: 100n * 10n ** 18n }]);
  w.confirm();
  const r = await w.run();
  assert.equal(dep(w)[0].state, "wrong_currency");
  assert.equal(r.batchId, null);
});

test("spoofed lookalike USDC: message names it, deposit is wrong_currency, message cannot use it", async () => {
  const w = new World();
  w.pay({ id: "tx_1", token: FAKE_USDC });
  const r = await w.run();
  assert.equal(dep(w)[0].state, "wrong_currency");
  assert.equal(r.batchId, null);
  assert.equal(w.state().entries.size, 0);
});

test("message token differs from deposit token is disputed", async () => {
  const w = new World();
  // USDT arrives, message says USDC.
  w.pay({ id: "tx_1", token: USDT, asset: "USDC" });
  await w.run();
  assert.equal(dep(w)[0].state, "disputed");
  assert.equal(dep(w)[0].reason, "TOKEN_MISMATCH");
});

test("wrong decimals: more decimals than the token has is malformed", async () => {
  const w = new World();
  w.pay({ id: "tx_1", claim: "127.0000001" });
  await w.run();
  assert.match(w.state().rejected[0].reason, /more than 6 decimal places/);
});

test("wrong decimals: settings that disagree with the chain stop the run", async () => {
  const w = new World();
  w.chain.decimals.set(USDC, 18);
  await assert.rejects(w.run(), /USDC has 18 decimals on-chain, settings say 6/);
  assert.equal(w.state().alerts[0].kind, "PREFLIGHT_FAILED");
});

test("deposit with no message waits, then is unmatched; a late message still matches it", async () => {
  const w = new World();
  const { txHashes, units } = w.sendOnChain({ id: "tx_1" });
  w.confirm();
  await w.run();
  assert.equal(dep(w)[0].state, "awaiting_message");
  w.advance(25);
  await w.run();
  assert.equal(dep(w)[0].state, "unmatched");
  assert.equal(dep(w)[0].reason, "NO_MESSAGE");
  w.deliver([w.settlementEvent({ id: "tx_1" }, txHashes, units)]);
  const r = await w.run();
  assert.equal(dep(w)[0].state, "matched");
  assert.ok(r.batchId);
});

test("deposit from an unknown sender with no message is reported as such", async () => {
  const w = new World();
  w.chain.mine([{ token: USDC, from: STRANGER, amount: 50_000_000n }]);
  w.confirm();
  w.advance(25);
  await w.run();
  w.advance(25);
  await w.run();
  assert.equal(dep(w)[0].reason, "UNKNOWN_SENDER_NO_MESSAGE");
});

test("deposit from a non-partner sender named by a message is disputed", async () => {
  const w = new World();
  w.pay({ id: "tx_1", from: STRANGER });
  await w.run();
  assert.equal(dep(w)[0].state, "disputed");
  assert.equal(dep(w)[0].reason, "SENDER_NOT_PARTNER");
});

test("message with no deposit expires and is reported", async () => {
  const w = new World();
  w.deliver([w.settlementEvent({ id: "tx_ghost" }, ["0x" + "cd".repeat(32)], 127_000_000n)]);
  await w.run();
  w.advance(25);
  const r = await w.run();
  assert.equal(w.state().messages.get("tx_ghost")!.expired, true);
  assert.match(r.report, /settlement tx_ghost/);
  assert.equal(w.state().entries.size, 0);
});

test("rounding: GBP via USDC at a rate with many decimals, within tolerance", async () => {
  const w = new World(baseConfig({ referenceRates: [{ currency: "GBP", token: "USDC", date: "*", rate: "1.2734" }] }));
  // 33.33 GBP x 1.273419 = 42.442055... USDC; partner rounds up by one unit.
  const units = World.units("33.33", "0.00", "1.273419") + 1n;
  w.pay({ id: "tx_1", gbp: "33.33", rate: "1.273419", sendUnits: units });
  const r = await w.run();
  assert.equal(dep(w)[0].state, "matched", r.report);
  // Credit is floor(tokens / rate) in pence.
  assert.equal([...w.state().entries.values()][0].entry.gbpCredit, 3333n);
});

test("rate difference: tokens inconsistent with fiat x rate are disputed", async () => {
  const w = new World();
  // Message says 100 GBP at 1.27 but 120 USDC.
  w.pay({ id: "tx_1", sendUnits: 120_000_000n });
  await w.run();
  assert.equal(dep(w)[0].reason, "RATE_INTERNAL_MISMATCH");
});

test("rate off market: partner rate far from reference is disputed", async () => {
  const w = new World();
  w.pay({ id: "tx_1", rate: "1.40" });
  await w.run();
  assert.equal(dep(w)[0].reason, "RATE_OFF_MARKET");
});

test("no reference rate with requireReferenceRate is disputed", async () => {
  const w = new World(baseConfig({ referenceRates: [] }));
  w.pay({ id: "tx_1" });
  await w.run();
  assert.equal(dep(w)[0].reason, "NO_REFERENCE_RATE");
});

test("GBP loan repaid via USDT: USDT batch resets the allowance first", async () => {
  const w = new World();
  w.pay({ id: "tx_1", asset: "USDT" });
  const r = await w.run();
  const safe = JSON.parse(r.batchFiles[`${r.batchId}.json`]);
  assert.equal(safe.transactions.length, 3);
  assert.equal(safe.transactions[0].to, USDT);
  assert.match(safe.transactions[0].data, /0{64}$/);
  await w.execute(r);
  await w.run();
  assert.ok((await w.chain.loan(1n))!.repaidGbp === 10_000n);
});

test("CHF loan repaid via USDC: matched and checked, but never batched (registry is GBP only)", async () => {
  const w = new World();
  const units = World.units("100.00", "0.00", "1.13");
  w.pay({ id: "tx_chf", ref: "FVC-L3", currency: "CHF", rate: "1.13", sendUnits: units });
  const r = await w.run();
  assert.equal(dep(w)[0].state, "matched");
  assert.equal(dep(w)[0].reason, "REGISTRY_CURRENCY_GAP");
  assert.equal(r.batchId, null);
  assert.match(r.report, /REGISTRY_CURRENCY_GAP/);
});

test("CHF loan repaid via USDT, and a CHF payment against a GBP loan", async () => {
  const w = new World();
  w.pay({ id: "tx_a", ref: "FVC-L3", currency: "CHF", gbp: "50.00", asset: "USDT", rate: "1.13" });
  w.pay({ id: "tx_b", ref: "FVC-L1", currency: "CHF", gbp: "50.00", rate: "1.13" });
  await w.run();
  const byId = Object.fromEntries(dep(w).map((d) => [d.partnerTxId, d.reason]));
  assert.equal(byId.tx_a, "REGISTRY_CURRENCY_GAP");
  assert.equal(byId.tx_b, "LOAN_CURRENCY_MISMATCH");
});

test("fee: net basis credits what was converted, gross basis credits what the SME paid", async () => {
  const net = new World();
  net.pay({ id: "tx_1", gbp: "100.00", fee: "1.50" });
  await net.run();
  assert.equal([...net.state().entries.values()][0].entry.gbpCredit, 9_850n);
  const gross = new World(baseConfig({ creditBasis: "gross" }));
  gross.pay({ id: "tx_1", gbp: "100.00", fee: "1.50" });
  await gross.run();
  assert.equal([...gross.state().entries.values()][0].entry.gbpCredit, 10_000n);
});

test("dust spam: many tiny transfers are collapsed in the report and never batched", async () => {
  const w = new World();
  for (let i = 0; i < 50; i++) w.chain.mine([{ token: USDC, from: STRANGER, amount: 1n }]);
  w.chain.mine([{ token: FAKE_USDC, from: STRANGER, amount: 5n }]);
  w.confirm();
  await w.run();
  w.advance(25);
  const r = await w.run();
  assert.equal(r.batchId, null);
  assert.match(r.report, /DUST: 50 transfer\(s\), 0\.000050 USDC in total, from 1 sender\(s\)/);
  assert.doesNotMatch(r.report, /unmatched \/ DUST/);
});

test("loan not repayable (written off) is unmatched", async () => {
  const w = new World();
  w.chain.patchLoan(2n, { status: 3 });
  w.pay({ id: "tx_1", ref: "FVC-L2" });
  await w.run();
  assert.equal(dep(w)[0].reason, "LOAN_NOT_REPAYABLE");
});

test("hold: a direct debit is not batched until its hold has passed", async () => {
  const w = new World();
  w.pay({ id: "tx_dd", method: "direct_debit" });
  let r = await w.run();
  assert.equal(r.batchId, null);
  w.advance(71);
  r = await w.run();
  assert.equal(r.batchId, null);
  w.advance(1);
  r = await w.run();
  assert.ok(r.batchId);
});
