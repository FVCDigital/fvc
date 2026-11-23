import { test } from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import { canonical, revive } from "../src/log.ts";
import { expectedTokenAmount, fiatValueOfTokens, formatUnits, parseDecimal, rateWithinBps, toUnits } from "../src/money.ts";
import { liveBatches, type State } from "../src/state.ts";
import type { WireEvent } from "../src/partner/mock.ts";
import { FAKE_USDC, PARTNER, STRANGER, USDC, World, formatSix } from "./helpers/world.ts";

const RUNS = Number(process.env.FC_RUNS ?? 60);

type Action =
  | { kind: "pay"; ref: string; pence: number; asset: "USDC" | "USDT"; method: "bank_transfer" | "direct_debit" | "card"; skew: number; deliver: boolean }
  | { kind: "lookalike" }
  | { kind: "dust"; n: number }
  | { kind: "reverse"; target: number }
  | { kind: "hitBatched"; target: number; conflict: boolean }
  | { kind: "conflict"; target: number }
  | { kind: "retry"; target: number }
  | { kind: "late"; target: number }
  | { kind: "advance"; hours: number }
  | { kind: "run" }
  | { kind: "execute" };

const action: fc.Arbitrary<Action> = fc.oneof(
  { weight: 6, arbitrary: fc.record({
    kind: fc.constant("pay" as const),
    ref: fc.constantFrom("FVC-L1", "FVC-L1", "FVC-L2", "FVC-L2", "FVC-L4", "FVC-L3", "UNKNOWN"),
    pence: fc.oneof(fc.integer({ min: 1, max: 9_000 }), fc.integer({ min: 1, max: 300_000 })),
    asset: fc.constantFrom("USDC" as const, "USDT" as const),
    method: fc.constantFrom("bank_transfer" as const, "bank_transfer" as const, "direct_debit" as const, "card" as const),
    skew: fc.constantFrom(0, 0, 0, 0, 0, 0, -1_000_000, 1_000_000, 1, -1),
    deliver: fc.boolean(),
  }) },
  { weight: 1, arbitrary: fc.constant({ kind: "lookalike" as const }) },
  { weight: 1, arbitrary: fc.record({ kind: fc.constant("dust" as const), n: fc.integer({ min: 1, max: 5 }) }) },
  { weight: 1, arbitrary: fc.record({ kind: fc.constant("reverse" as const), target: fc.nat(20) }) },
  { weight: 1, arbitrary: fc.record({ kind: fc.constant("conflict" as const), target: fc.nat(20) }) },
  { weight: 2, arbitrary: fc.record({ kind: fc.constant("hitBatched" as const), target: fc.nat(20), conflict: fc.boolean() }) },
  { weight: 1, arbitrary: fc.record({ kind: fc.constant("retry" as const), target: fc.nat(20) }) },
  { weight: 1, arbitrary: fc.record({ kind: fc.constant("late" as const), target: fc.nat(20) }) },
  { weight: 2, arbitrary: fc.record({ kind: fc.constant("advance" as const), hours: fc.integer({ min: 1, max: 80 }) }) },
  { weight: 3, arbitrary: fc.constant({ kind: "run" as const }) },
  { weight: 2, arbitrary: fc.constant({ kind: "execute" as const }) }
);

interface Sim {
  w: World;
  events: WireEvent[];
  held: { event: WireEvent }[];
  payTx: { id: string; txHashes: string[]; units: bigint; p: Parameters<World["settlementEvent"]>[0] }[];
  lastBatch: Awaited<ReturnType<World["run"]>> | null;
  injectedDispute: boolean;
  runs: number;
}

const stats = { histories: 0, runs: 0, entries: 0, recorded: 0, disputed: 0, batches: 0 };

function step(sim: Sim, a: Action, i: number): Promise<void> | void {
  const { w } = sim;
  switch (a.kind) {
    case "pay": {
      const pounds = `${Math.floor(a.pence / 100)}.${String(a.pence % 100).padStart(2, "0")}`;
      const currency = a.ref === "FVC-L3" ? "CHF" : "GBP";
      const rate = currency === "CHF" ? "1.13" : "1.27";
      const units = World.units(pounds, "0.00", rate);
      const p = { id: `tx_${i}`, ref: a.ref, gbp: pounds, currency, rate, asset: a.asset, method: a.method, sendUnits: units + BigInt(a.skew > 0 ? a.skew : 0) - BigInt(a.skew < 0 ? -a.skew : 0), claim: formatSix(units) };
      if (p.sendUnits <= 0n) return;
      const { txHashes } = w.sendOnChain(p);
      const event = w.settlementEvent(p, txHashes, units);
      sim.events.push(event);
      sim.payTx.push({ id: p.id, txHashes, units, p });
      if (a.deliver) w.deliver([event]);
      else sim.held.push({ event });
      return;
    }
    case "lookalike":
      w.chain.mine([{ token: FAKE_USDC, from: PARTNER, amount: 127_000_000n }]);
      return;
    case "dust":
      for (let k = 0; k < a.n; k++) w.chain.mine([{ token: USDC, from: STRANGER, amount: 7n }]);
      return;
    case "reverse": {
      const t = sim.payTx[a.target % Math.max(1, sim.payTx.length)];
      if (!t) return;
      sim.injectedDispute = true;
      w.deliver([w.reversal({ transactionId: `rev_${i}`, originalTransactionId: t.id, reason: "chargeback" })]);
      return;
    }
    case "conflict": {
      const t = sim.payTx[a.target % Math.max(1, sim.payTx.length)];
      if (!t) return;
      sim.injectedDispute = true;
      w.deliver([w.settlementEvent({ ...t.p, ref: t.p.ref === "FVC-L1" ? "FVC-L2" : "FVC-L1" }, t.txHashes, t.units)]);
      return;
    }
    case "hitBatched": {
      // Reverse or contradict an item that sits in an unsigned batch right now.
      const batched = [...w.state().entries.values()].filter((e) => e.status === "batched");
      const e = batched[a.target % Math.max(1, batched.length)];
      const t = e && sim.payTx.find((x) => x.id === e.entry.partnerTxId);
      if (!t) return;
      sim.injectedDispute = true;
      if (a.conflict) w.deliver([w.settlementEvent({ ...t.p, ref: t.p.ref === "FVC-L1" ? "FVC-L2" : "FVC-L1" }, t.txHashes, t.units)]);
      else w.deliver([w.reversal({ transactionId: `rev_${i}`, originalTransactionId: t.id, reason: "direct_debit_return" })]);
      return;
    }
    case "retry": {
      const e = sim.events[a.target % Math.max(1, sim.events.length)];
      if (e) w.deliver([e], { retries: 1 });
      return;
    }
    case "late": {
      const h = sim.held.shift();
      if (h) w.deliver([h.event]);
      return;
    }
    case "advance":
      w.chain.mineEmpty(1);
      w.advance(a.hours);
      // Keep delivery timestamps fresh for anything re-delivered later.
      return;
    case "run":
      w.confirm();
      return w.run().then(async (r) => {
        sim.lastBatch = r.batchId ? r : sim.lastBatch;
        sim.runs += 1;
        await checkInvariants(sim, r.state);
        if (!sim.injectedDispute) assert.ok(r.checkOk, r.report);
      });
    case "execute":
      // Signers execute the latest live batch, then the reconciler runs again.
      return Promise.resolve(step(sim, { kind: "run" }, i)).then(() => {
        const b = sim.lastBatch;
        sim.lastBatch = null;
        if (!b?.batchId || !liveBatches(w.state()).some((x) => x.batchId === b.batchId)) return;
        return w.execute(b).then(() => step(sim, { kind: "run" }, i));
      });
  }
}

async function checkInvariants(sim: Sim, live: State): Promise<void> {
  const s = sim.w.state();
  // Replay equals the live state.
  assert.equal(canonical([...s.deposits.values()]), canonical([...live.deposits.values()]));

  // 1. Every confirmed deposit is in exactly one state (replay would have thrown on an illegal change).
  for (const d of s.deposits.values()) assert.notEqual(d.state, null, d.deposit.id);

  // 2. A deposit and a partner ID are used by at most one live entry.
  const byDeposit = new Map<string, number>();
  const byPartner = new Map<string, number>();
  for (const e of s.entries.values()) {
    if (e.status === "cancelled") continue;
    byPartner.set(e.entry.partnerTxId, (byPartner.get(e.entry.partnerTxId) ?? 0) + 1);
    for (const id of e.entry.depositIds) byDeposit.set(id, (byDeposit.get(id) ?? 0) + 1);
  }
  for (const [k, n] of [...byDeposit, ...byPartner]) assert.equal(n, 1, `${k} used ${n} times`);

  // 3. Per token, batched plus recorded never exceed the deposits backing them.
  const committed = new Map<string, bigint>();
  const backing = new Map<string, bigint>();
  for (const e of s.entries.values()) {
    if (e.status !== "batched" && e.status !== "recorded") continue;
    committed.set(e.entry.token, (committed.get(e.entry.token) ?? 0n) + e.entry.tokenAmount);
    for (const id of e.entry.depositIds) {
      const d = s.deposits.get(id)!;
      assert.equal(d.deposit.token, e.entry.token);
      backing.set(d.deposit.token, (backing.get(d.deposit.token) ?? 0n) + d.deposit.amount);
    }
  }
  for (const [t, v] of committed) assert.ok(v <= (backing.get(t) ?? 0n), `token ${t} over-committed`);

  // 6. Nothing from an unconfirmed block was classified.
  for (const d of s.deposits.values()) assert.ok(s.cursor && d.deposit.blockNumber <= s.cursor.blockNumber);

  // 7. No disputed (or otherwise unmatched) deposit is in a live batch.
  for (const b of liveBatches(s)) {
    for (const ref of b.refs) {
      const e = s.entries.get(ref)!;
      if (e.status !== "batched") continue;
      for (const id of e.entry.depositIds) assert.equal(s.deposits.get(id)!.state, "matched", `${id} in live batch ${b.batchId}`);
    }
  }

  // 8. Per loan, batched credits never exceed what is outstanding at the confirmed block.
  const perLoan = new Map<string, bigint>();
  for (const e of s.entries.values()) {
    if (e.status === "batched") perLoan.set(e.entry.loanId.toString(), (perLoan.get(e.entry.loanId.toString()) ?? 0n) + e.entry.gbpCredit);
  }
  for (const [loanId, credit] of perLoan) {
    const v = await sim.w.chain.loan(BigInt(loanId), s.cursor!.blockNumber);
    assert.ok(credit <= v!.outstandingGbp, `loan ${loanId}: batched ${credit} > outstanding ${v!.outstandingGbp}`);
  }

  // Only accepted-token deposits can be matched; lookalikes and dust never are.
  for (const d of s.deposits.values()) {
    if (d.deposit.token === FAKE_USDC) assert.equal(d.state, "wrong_currency");
    if (d.deposit.from === STRANGER) assert.notEqual(d.state, "matched");
  }
}

const newSim = (): Sim => ({ w: new World(), events: [], held: [], payTx: [], lastBatch: null, injectedDispute: false, runs: 0 });

async function simulate(actions: Action[]): Promise<Sim> {
  const sim = newSim();
  for (const [i, a] of actions.entries()) await step(sim, a, i);
  await step(sim, { kind: "run" }, actions.length);
  return sim;
}

test("property: invariants 1, 2, 3, 6, 7, 8 hold after every run of a random history", async () => {
  await fc.assert(
    fc.asyncProperty(fc.array(action, { minLength: 1, maxLength: 30 }), async (actions) => {
      const sim = await simulate(actions);
      // 4. Processing the same inputs again adds no entry and no batch.
      const before = sim.w.state();
      const again = await sim.w.run();
      assert.equal(again.state.entries.size, before.entries.size);
      assert.equal(again.state.batches.size, before.batches.size);
      await checkInvariants(sim, again.state);
      const s = again.state;
      stats.histories += 1;
      stats.runs += sim.runs + 1;
      stats.entries += s.entries.size;
      stats.recorded += [...s.entries.values()].filter((e) => e.status === "recorded").length;
      stats.disputed += [...s.deposits.values()].filter((d) => d.state === "disputed").length;
      stats.batches += s.batches.size;
    }),
    { numRuns: RUNS }
  );
  // The generator must reach the interesting states, or the property proves little.
  console.log(`  coverage: ${JSON.stringify(stats)}`);
  assert.ok(stats.recorded > 0 && stats.disputed > 0 && stats.batches > 0, JSON.stringify(stats));
});

test("property 5: final states do not depend on the order deliveries arrive", async () => {
  const pay = fc.record({
    ref: fc.constantFrom("FVC-L1", "FVC-L2", "FVC-L4", "UNKNOWN"),
    pence: fc.integer({ min: 100, max: 150_000 }),
    asset: fc.constantFrom("USDC", "USDT"),
    retries: fc.nat(2),
  });
  await fc.assert(
    fc.asyncProperty(fc.array(pay, { minLength: 1, maxLength: 12 }), fc.integer(), fc.nat(3), async (pays, seed, reversals) => {
      const outcome = async (shuffle: number | undefined) => {
        const w = new World();
        const events: WireEvent[] = [];
        for (const [i, p] of pays.entries()) {
          const pounds = `${Math.floor(p.pence / 100)}.${String(p.pence % 100).padStart(2, "0")}`;
          const args = { id: `tx_${i}`, ref: p.ref, gbp: pounds, asset: p.asset };
          const { txHashes, units } = w.sendOnChain(args);
          events.push(w.settlementEvent(args, txHashes, units));
          for (let k = 0; k < p.retries; k++) events.push(events.at(-1)!);
        }
        for (let k = 0; k < Math.min(reversals, pays.length); k++) {
          events.push(w.reversal({ transactionId: `rev_${k}`, originalTransactionId: `tx_${k}`, reason: "chargeback" }));
        }
        w.confirm();
        w.deliver(events, shuffle === undefined ? {} : { shuffleSeed: shuffle });
        await w.run();
        const s = w.state();
        return canonical({
          deposits: [...s.deposits.values()].map((d) => [d.deposit.id, d.state, d.reason, d.partnerTxId]).sort(),
          entries: [...s.entries.values()].map((e) => [e.entry.settlementRef, e.status, e.entry.gbpCredit]).sort(),
        });
      };
      assert.equal(await outcome(seed), await outcome(undefined));
    }),
    { numRuns: RUNS }
  );
});

test("property: a crash at any record of a random history ends in the same state as no crash", async () => {
  await fc.assert(
    fc.asyncProperty(fc.array(action, { minLength: 1, maxLength: 15 }), fc.nat(400), async (actions, crashAt) => {
      const summary = (s: State) =>
        canonical({
          deposits: [...s.deposits.values()].map((d) => [d.deposit.id, d.state, d.reason]).sort(),
          // A cancelled entry has no effect; whether one existed depends on how many runs saw the message first.
          entries: [...s.entries.values()].filter((e) => e.status !== "cancelled").map((e) => [e.entry.settlementRef, e.status]).sort(),
        });
      // Both worlds must get the same inputs, so actions that choose their input from the current
      // state (which the crash changes) are left out.
      const inputs = actions.filter((a) => a.kind !== "execute" && a.kind !== "hitBatched");
      const clean = await simulate(inputs);
      const crashed = newSim();
      let writes = 0;
      const append = crashed.w.store.appendLine.bind(crashed.w.store);
      crashed.w.store.appendLine = (line: string) => {
        if (writes++ === crashAt) throw new Error("power cut");
        append(line);
      };
      const all = [...inputs, { kind: "run" as const }];
      for (const [i, a] of all.entries()) {
        try {
          await step(crashed, a, i);
        } catch (e) {
          if ((e as Error).message !== "power cut") throw e;
        }
      }
      crashed.w.store.appendLine = append;
      await crashed.w.run();
      await clean.w.run();
      // Wait timers start when a deposit is first seen, so a crash can delay a report line by one
      // run. Compare once every wait has run out.
      for (const w of [crashed.w, clean.w]) {
        w.advance(200);
        await w.run();
      }
      assert.equal(summary(crashed.w.state()), summary(clean.w.state()));
    }),
    { numRuns: RUNS }
  );
});

test("property: money helpers are exact", () => {
  fc.assert(
    fc.property(fc.bigInt({ min: 1n, max: 10n ** 12n }), fc.integer({ min: 1, max: 4_000_000 }), (pence, rateMicro) => {
      const rate = { units: BigInt(rateMicro), scale: 6 };
      const tokens = expectedTokenAmount(pence, 2, rate, 6);
      // Converting back never credits more than was paid, and loses under one penny.
      const back = fiatValueOfTokens(tokens, rate, 6, 2);
      assert.ok(back <= pence && pence - back <= 1n + 1_000_000n / BigInt(rateMicro));
    })
  );
  fc.assert(
    fc.property(fc.bigInt({ min: 0n, max: 10n ** 30n }), fc.integer({ min: 0, max: 18 }), (v, d) => {
      assert.equal(toUnits(formatUnits(v, d), d), v);
    })
  );
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 10 ** 9 }), fc.integer({ min: 0, max: 500 }), (r, bps) => {
      const ref = { units: BigInt(r), scale: 6 };
      assert.ok(rateWithinBps(ref, ref, bps));
    })
  );
  for (const bad of ["-1", "1e5", " 1", "1.", ".5", "01", "0x10", "1,000", "NaN", ""]) assert.throws(() => parseDecimal(bad));
});

test("property: the log encoding round-trips bigints and is key-order independent", () => {
  fc.assert(
    fc.property(fc.jsonValue().filter((v) => !JSON.stringify(v).includes('"$n"')), fc.bigInt(), (v, b) => {
      const value = { v, b, nested: [b, { b }] };
      const back = revive(JSON.parse(canonical(value))) as { b: bigint };
      assert.equal(canonical(back), canonical(value));
      assert.equal(back.b, b);
      assert.equal(canonical({ x: 1, y: b }), canonical({ y: b, x: 1 }));
    })
  );
});
