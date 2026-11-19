import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { hmacSignature } from "../src/partner/auth.ts";
import { MockPartner } from "../src/partner/mock.ts";
import { World } from "./helpers/world.ts";

test("duplicate message: network retries of one delivery are ignored", async () => {
  const w = new World();
  const { txHashes, units } = w.sendOnChain({ id: "tx_1" });
  w.confirm();
  w.deliver([w.settlementEvent({ id: "tx_1" }, txHashes, units)], { retries: 4 });
  const r = await w.run();
  const s = w.state();
  assert.equal(s.messages.size, 1);
  assert.equal(s.entries.size, 1);
  assert.equal(JSON.parse(r.batchFiles[`${r.batchId}.evidence.json`]).items.length, 1);
  assert.equal(w.log().all().filter((x) => x.event.type === "DeliveryRetried").length, 4);
});

test("duplicate message: the partner re-emits the same event under a new delivery ID", async () => {
  const w = new World();
  const { txHashes, units } = w.sendOnChain({ id: "tx_1" });
  w.confirm();
  w.deliver([w.settlementEvent({ id: "tx_1" }, txHashes, units)], { reEmit: true, retries: 1 });
  await w.run();
  assert.equal(w.state().entries.size, 1);
  assert.equal(w.log().all().filter((x) => x.event.type === "MessageRepeated").length, 1);
});

test("duplicate message across runs: already batched or recorded is never batched again", async () => {
  const w = new World();
  const { event } = w.pay({ id: "tx_1" });
  const r1 = await w.run();
  await w.execute(r1);
  w.confirm();
  w.advance(1);
  w.deliver([{ eventId: "evt_new", body: event.body }]);
  const r2 = await w.run();
  assert.equal(r2.batchId, null);
  assert.equal([...w.state().entries.values()][0].status, "recorded");
  assert.ok(r2.checkOk, r2.report);
});

test("forged message: wrong secret is rejected and does not burn the delivery ID", async () => {
  const w = new World();
  const { txHashes, units } = w.sendOnChain({ id: "tx_1" });
  w.confirm();
  const genuine = w.settlementEvent({ id: "tx_1" }, txHashes, units);
  const forger = new MockPartner("guessed-secret");
  const forgedEvent = { eventId: genuine.eventId, body: genuine.body.replace("FVC-L1", "FVC-L2") };
  w.inbox.push(forger.sign(forgedEvent, w.now));
  let r = await w.run();
  assert.equal(r.batchId, null);
  assert.equal(w.state().rejected[0].reason, "BAD_SIGNATURE");
  assert.match(r.report, /BAD_SIGNATURE/);
  w.deliver([genuine]);
  r = await w.run();
  assert.ok(r.batchId);
  assert.equal([...w.state().entries.values()][0].entry.loanId, 1n);
});

test("forged message: missing signature, missing timestamp, missing delivery ID", async () => {
  const w = new World();
  const ev = w.settlementEvent({ id: "tx_1" }, ["0x" + "11".repeat(32)], 1n);
  const good = w.partner.sign(ev, w.now);
  const strip = (h: string) => ({ ...good, headers: Object.fromEntries(Object.entries(good.headers).filter(([k]) => k !== h)) });
  w.inbox.push(strip("x-partner-signature"), strip("x-partner-timestamp"), strip("x-partner-delivery-id"));
  await w.run();
  assert.deepEqual(w.state().rejected.map((r) => r.reason).sort(), ["MISSING_DELIVERY_ID", "MISSING_SIGNATURE", "MISSING_TIMESTAMP"]);
});

test("replayed message: a captured delivery replayed after the window is stale", async () => {
  const w = new World();
  w.pay({ id: "tx_1" });
  await w.run();
  const captured = w.inbox.list()[0];
  w.inbox.push({ ...captured, receivedAt: new Date(w.now.getTime() + 3_600_000).toISOString() });
  await w.run();
  assert.equal(w.state().rejected.at(-1)!.reason, "STALE_TIMESTAMP");
});

test("replayed message: same delivery ID with a different signed body is rejected", async () => {
  const w = new World();
  const { txHashes, units, event } = w.pay({ id: "tx_1" });
  await w.run();
  const changed = w.settlementEvent({ id: "tx_1", ref: "FVC-L2" }, txHashes, units);
  w.inbox.push(w.partner.sign({ eventId: event.eventId, body: changed.body }, w.now));
  await w.run();
  assert.equal(w.state().rejected.at(-1)!.reason, "REPLAY_CONFLICT");
});

test("conflicting message: same partner ID, different content, disputes the deposit and voids the batch", async () => {
  const w = new World(undefined);
  const { txHashes, units } = w.pay({ id: "tx_1" });
  const r1 = await w.run();
  assert.ok(r1.batchId);
  const conflicting = w.settlementEvent({ id: "tx_1", ref: "FVC-L2" }, txHashes, units);
  w.deliver([conflicting]);
  const r2 = await w.run();
  const s = w.state();
  assert.equal([...s.deposits.values()][0].state, "disputed");
  assert.equal([...s.deposits.values()][0].reason, "MESSAGE_CONFLICT");
  assert.equal(s.batches.get(r1.batchId!)!.voided, "MESSAGE_CONFLICT");
  assert.match(r2.report, /Voided batches: do not sign[\s\S]*MESSAGE_CONFLICT/);
  assert.equal(r2.batchId, null);
});

test("out-of-order messages: reversal before its settlement still disputes the settlement", async () => {
  const w = new World();
  const { txHashes, units } = w.sendOnChain({ id: "tx_1" });
  w.confirm();
  const settlement = w.settlementEvent({ id: "tx_1" }, txHashes, units);
  const reversal = w.reversal({ transactionId: "rev_1", originalTransactionId: "tx_1", reason: "chargeback" });
  w.deliver([reversal]);
  await w.run();
  w.deliver([settlement]);
  const r = await w.run();
  assert.equal([...w.state().deposits.values()][0].state, "disputed");
  assert.equal(r.batchId, null);
});

test("out-of-order messages: shuffled settlements give the same entries as ordered ones", async () => {
  const build = async (seed?: number) => {
    const w = new World();
    const events = [];
    for (let i = 1; i <= 6; i++) {
      const { txHashes, units } = w.sendOnChain({ id: `tx_${i}`, ref: i % 2 ? "FVC-L1" : "FVC-L2", gbp: `${i * 10}.00` });
      events.push(w.settlementEvent({ id: `tx_${i}`, ref: i % 2 ? "FVC-L1" : "FVC-L2", gbp: `${i * 10}.00` }, txHashes, units));
    }
    w.confirm();
    w.deliver(events, seed === undefined ? {} : { shuffleSeed: seed, retries: 1 });
    await w.run();
    return [...w.state().entries.values()].map((e) => `${e.entry.partnerTxId}:${e.entry.loanId}:${e.entry.gbpCredit}`).sort();
  };
  const ordered = await build();
  for (const seed of [1, 7, 42]) assert.deepEqual(await build(seed), ordered);
});

test("partner outage then backlog: deposits wait, then all match in one run", async () => {
  const w = new World();
  const events = [];
  for (let i = 1; i <= 5; i++) {
    const { txHashes, units } = w.sendOnChain({ id: `tx_${i}`, gbp: "10.00" });
    events.push(w.settlementEvent({ id: `tx_${i}`, gbp: "10.00" }, txHashes, units));
  }
  w.confirm();
  await w.run();
  assert.deepEqual(w.depositsByState(), { awaiting_message: 5 });
  // Outage longer than the message wait: they become unmatched, then the backlog matches them.
  w.advance(30);
  await w.run();
  assert.deepEqual(w.depositsByState(), { unmatched: 5 });
  w.deliver(events, { outageEndsAt: w.now.toISOString(), shuffleSeed: 3 });
  const r = await w.run();
  assert.deepEqual(w.depositsByState(), { matched: 5 });
  assert.equal(JSON.parse(r.batchFiles[`${r.batchId}.evidence.json`]).items.length, 5);
});

test("unknown event types are malformed; payout.completed is ignored (disbursement flow)", async () => {
  const w = new World();
  const body1 = JSON.stringify({ type: "account.updated", data: {} });
  const body2 = JSON.stringify({ type: "payout.completed", data: { transaction_id: "po_1" } });
  w.inbox.push(w.partner.sign({ eventId: "evt_a", body: body1 }, w.now), w.partner.sign({ eventId: "evt_b", body: body2 }, w.now));
  await w.run();
  assert.match(w.state().rejected[0].reason, /unknown event type/);
  assert.equal(w.log().all().filter((x) => x.event.type === "DeliveryIgnored").length, 1);
});

test("HMAC is over timestamp.body, so a changed timestamp breaks the signature", () => {
  assert.equal(hmacSignature("k", 1, "b"), createHmac("sha256", "k").update("1.b").digest("hex"));
  assert.notEqual(hmacSignature("k", 1, "b"), hmacSignature("k", 2, "b"));
});
