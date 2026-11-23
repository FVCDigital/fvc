import { test } from "node:test";
import assert from "node:assert/strict";
import { EventLog, MemoryStore } from "../src/log.ts";
import { replay } from "../src/state.ts";
import { canonical } from "../src/log.ts";
import { PARTNER, USDC, World, baseConfig } from "./helpers/world.ts";

test("reorg above the confirmation depth: the dropped deposit was never classified", async () => {
  const w = new World();
  const { txHashes, units } = w.sendOnChain({ id: "tx_1" });
  w.chain.mineEmpty(1);
  w.deliver([w.settlementEvent({ id: "tx_1" }, txHashes, units)]);
  await w.run();
  assert.equal(w.state().deposits.size, 0);
  // The block holding the deposit is reorganised away before it is confirmed.
  w.chain.reorg(1);
  w.chain.mineEmpty(5);
  const r = await w.run();
  assert.equal(w.state().deposits.size, 0);
  assert.equal(r.batchId, null);
  w.advance(25);
  const r2 = await w.run();
  assert.match(r2.report, /settlement tx_1/);
});

test("reorg below the confirmation depth: the run halts, alerts and changes nothing", async () => {
  const w = new World();
  w.pay({ id: "tx_1" });
  await w.run();
  const before = w.log().all().length;
  w.chain.reorg(1);
  w.chain.mineEmpty(5);
  await assert.rejects(w.run(), /reorg below the confirmation depth/);
  const after = w.log().all();
  assert.equal(after.length, before + 2);
  assert.equal(after.at(-1)!.event.type, "Alert");
  assert.equal((after.at(-1)!.event as { kind: string }).kind, "DEEP_REORG");
});

test("duplicate log delivery: an RPC returning the same log twice adds one deposit", async () => {
  const w = new World();
  w.pay({ id: "tx_1" });
  const original = w.chain.transfersTo.bind(w.chain);
  w.chain.transfersTo = async (...a) => {
    const d = await original(...a);
    return [...d, ...d];
  };
  await w.run();
  assert.equal(w.state().deposits.size, 1);
});

test("missed blocks are backfilled in chunks after downtime", async () => {
  const w = new World();
  for (let i = 0; i < 23; i++) w.chain.mine([{ token: USDC, from: PARTNER, amount: 10_000_000n + BigInt(i) }]);
  w.confirm();
  const calls = w.chain.calls.transfersTo;
  await w.run();
  assert.equal(w.state().deposits.size, 23);
  // 26 blocks confirmed (0..23 plus the first empty), chunkSize 5.
  assert.equal(w.chain.calls.transfersTo - calls, 5);
  assert.equal(w.state().cursor!.blockNumber, w.chain.blocks.length - 3);
});

test("restart mid-processing: a crash after any record gives the same final state as no crash", async () => {
  const reference = new World();
  const setup = (w: World) => {
    w.pay({ id: "tx_1", gbp: "100.00" });
    w.pay({ id: "tx_2", ref: "FVC-L2", gbp: "50.00", asset: "USDT" });
    w.pay({ id: "tx_3", ref: "NOPE" });
  };
  setup(reference);
  await reference.run();
  const total = reference.log().all().length;
  const summary = (w: World) => {
    const s = w.state();
    return canonical({
      deposits: [...s.deposits.values()].map((d) => [d.deposit.id, d.state, d.reason]).sort(),
      entries: [...s.entries.values()].map((e) => [e.entry.settlementRef, e.status]).sort(),
      batches: [...s.batches.values()].map((b) => [b.batchId, b.refs]).sort(),
    });
  };
  const want = summary(reference);

  for (let crashAt = 1; crashAt < total; crashAt++) {
    const w = new World();
    setup(w);
    let writes = 0;
    const append = w.store.appendLine.bind(w.store);
    w.store.appendLine = (line: string) => {
      if (writes++ === crashAt) throw new Error("power cut");
      append(line);
    };
    await assert.rejects(w.run(), /power cut/);
    w.store.appendLine = append;
    await w.run();
    assert.equal(summary(w), want, `crash after ${crashAt} records`);
  }
});

test("event log: an edited record is detected on load", async () => {
  const w = new World();
  w.pay({ id: "tx_1" });
  await w.run();
  const lines = w.store.readLines();
  const i = lines.findIndex((l) => l.includes("EntryCreated"));
  const store = new MemoryStore();
  store.lines = lines.map((l, j) => (j === i ? l.replace('"gbpCredit":{"$n":"10000"}', '"gbpCredit":{"$n":"99999"}') : l));
  assert.notEqual(store.lines[i], lines[i]);
  assert.throws(() => new EventLog(store), /event log broken at record/);
  const truncated = new MemoryStore();
  truncated.lines = lines.filter((_, j) => j !== 3);
  assert.throws(() => new EventLog(truncated), /event log broken/);
  const torn = new MemoryStore();
  torn.lines = [...lines.slice(0, -1), lines.at(-1)!.slice(0, 40)];
  assert.throws(() => new EventLog(torn), /record \d+: the line is not JSON/);
});

test("replay of the log equals the live state", async () => {
  const w = new World();
  w.pay({ id: "tx_1" });
  const r = await w.run();
  assert.equal(canonical([...replay(w.log().all()).entries.values()]), canonical([...r.state.entries.values()]));
});

test("finalized policy: nothing is read until the finalized block passes it", async () => {
  const w = new World(baseConfig({ confirmation: { mode: "finalized" } }));
  w.pay({ id: "tx_1" });
  await w.run();
  assert.equal(w.state().deposits.size, 0);
  w.chain.mineEmpty(64);
  const r = await w.run();
  assert.ok(r.batchId);
});

test("wrong chain or wrong Safe in settings stops the run", async () => {
  const w = new World(baseConfig({ chainId: 1 }));
  await assert.rejects(w.run(), /RPC is chain 11155111, settings say 1/);
  const v = new World(baseConfig({ safe: PARTNER }));
  await assert.rejects(v.run(), /registry.safe\(\)/);
});
