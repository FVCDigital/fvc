/**
 * End to end against a local Hardhat node and the real LoanRegistry bytecode. An unlocked account
 * plays the Safe (it executes the batch call by call, not atomically as a Safe MultiSend would).
 * Needs `npx hardhat compile` in contracts/ first. Uses E2E_RPC_URL if set, else starts a node.
 */
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ContractFactory, JsonRpcProvider, type Contract, type JsonRpcSigner } from "ethers";
import { EthersChain, partnerRef } from "../../src/chain.ts";
import type { Config } from "../../src/config.ts";
import { MemoryInbox } from "../../src/inbox.ts";
import { EventLog, MemoryStore } from "../../src/log.ts";
import { MockPartnerAdapter } from "../../src/partner/adapter.ts";
import { MockPartner } from "../../src/partner/mock.ts";
import { runOnce } from "../../src/reconciler.ts";
import { StaticRateSource, parseLoanBook } from "../../src/sources.ts";
import { verifyBatch } from "../../src/verify.ts";
import { SECRET, baseConfig } from "../helpers/world.ts";

const ARTIFACTS = new URL("../../../contracts/artifacts/src/", import.meta.url);
const artifact = (path: string) => JSON.parse(readFileSync(new URL(path, ARTIFACTS), "utf8"));
const PORT = 8599;

let node: ChildProcess | null = null;
let provider: JsonRpcProvider;
let rpcUrl: string;
let admin: JsonRpcSigner, safe: JsonRpcSigner, partnerWallet: JsonRpcSigner, stranger: JsonRpcSigner, sme: JsonRpcSigner;
let registry: Contract, usdc: Contract, usdt: Contract, fakeUsdc: Contract;
let config: Config;
let outDir: string;

const mine = (n: number) => provider.send("hardhat_mine", ["0x" + n.toString(16)]);

async function waitForRpc(url: string, ms: number): Promise<void> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }) });
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`no RPC at ${url}`);
}

before(async () => {
  rpcUrl = process.env.E2E_RPC_URL ?? `http://127.0.0.1:${PORT}`;
  if (!process.env.E2E_RPC_URL) {
    const env = { ...process.env };
    delete env.FORK;
    // Own process group, so the hardhat process npx starts is stopped with it.
    node = spawn("npx", ["hardhat", "node", "--port", String(PORT)], { cwd: new URL("../../../contracts/", import.meta.url), env, stdio: "ignore", detached: true });
  }
  await waitForRpc(rpcUrl, 90_000);
  provider = new JsonRpcProvider(rpcUrl, undefined, { staticNetwork: true });
  [admin, safe, partnerWallet, stranger, sme] = await Promise.all([0, 1, 2, 3, 4].map((i) => provider.getSigner(i)));

  const stable = artifact("mocks/MockStable.sol/MockStable.json");
  const reg = artifact("loan/LoanRegistry.sol/LoanRegistry.json");
  const deploy = async (a: { abi: unknown[]; bytecode: string }, signer: JsonRpcSigner, ...args: unknown[]) => {
    const c = await new ContractFactory(a.abi as never, a.bytecode, signer).deploy(...args);
    await c.waitForDeployment();
    return c as unknown as Contract;
  };
  usdc = await deploy(stable, admin, "USD Coin", "USDC", 6);
  usdt = await deploy(stable, admin, "Tether USD", "USDT", 6);
  fakeUsdc = await deploy(stable, stranger, "USD Coin", "USDC", 6);
  registry = await deploy(reg, admin, await admin.getAddress(), await safe.getAddress(), 10_000_000n);

  for (const t of [usdc, usdt]) await (await registry.connect(admin).getFunction("allowToken")(await t.getAddress(), 11_000, 15_000, 10n ** 12n, 10n ** 13n)).wait();
  await (await registry.connect(admin).getFunction("addDestination")(await partnerWallet.getAddress())).wait();

  // Loan 1: 1,000.00 GBP facility, 50.00 fee, one tranche of 1,000.00 paid out to the partner.
  const asSafe = registry.connect(safe);
  await (await asSafe.getFunction("createLoan")("0x" + "a1".repeat(32), "0x" + "b1".repeat(32), 100_000n, 5_000n)).wait();
  await (await usdc.connect(admin).getFunction("mint")(await safe.getAddress(), 1_270_000_000n)).wait();
  await (await usdc.connect(safe).getFunction("approve")(await registry.getAddress(), 1_270_000_000n)).wait();
  await (await asSafe.getFunction("recordDisbursement")(1n, 100_000n, await usdc.getAddress(), 1_270_000_000n, partnerRef("payout", "po_1"), await partnerWallet.getAddress())).wait();
  // Loan 2: open but nothing paid out yet.
  await (await asSafe.getFunction("createLoan")("0x" + "a2".repeat(32), "0x" + "b2".repeat(32), 100_000n, 0n)).wait();

  for (const t of [usdc, usdt]) await (await t.connect(admin).getFunction("mint")(await partnerWallet.getAddress(), 10n ** 12n)).wait();
  await (await fakeUsdc.connect(stranger).getFunction("mint")(await stranger.getAddress(), 10n ** 12n)).wait();

  outDir = mkdtempSync(join(tmpdir(), "reconciler-e2e-"));
  config = baseConfig({
    chainId: 1337,
    safe: await safe.getAddress(),
    registry: await registry.getAddress(),
    startBlock: 0,
    chunkSize: 50,
    tokens: [
      { symbol: "USDC", address: await usdc.getAddress(), decimals: 6, approveResetFirst: false, dustThreshold: "1000000" },
      { symbol: "USDT", address: await usdt.getAddress(), decimals: 6, approveResetFirst: true, dustThreshold: "1000000" },
    ],
    partnerSenders: [await partnerWallet.getAddress()],
  });
});

after(async () => {
  provider?.destroy();
  if (node?.pid) process.kill(-node.pid, "SIGTERM");
  if (outDir) rmSync(outDir, { recursive: true, force: true });
});

const store = new MemoryStore();
const inbox = new MemoryInbox();
const partner = new MockPartner(SECRET);
const loanBook = parseLoanBook([
  { reference: "FVC-L1", loanId: "1", currency: "GBP" },
  { reference: "FVC-L2", loanId: "2", currency: "GBP" },
]);

async function run(now: Date) {
  const chain = new EthersChain(rpcUrl, config.registry);
  try {
    return await runOnce({
      config,
      configHash: "e2e",
      log: new EventLog(store),
      chain,
      registry: chain,
      adapter: new MockPartnerAdapter(),
      inbox,
      loanBook,
      rates: new StaticRateSource(config),
      secret: SECRET,
      clock: () => now,
      outDir,
    });
  } finally {
    chain.provider.destroy();
  }
}

async function pay(token: Contract, from: JsonRpcSigner, units: bigint): Promise<string> {
  const tx = await token.connect(from).getFunction("transfer")(config.safe, units);
  await tx.wait();
  return tx.hash.toLowerCase();
}

function settle(id: string, ref: string, gbp: string, asset: string, units: bigint, txHash: string, at: Date) {
  const ev = partner.settlement({
    transactionId: id,
    reference: ref,
    method: "bank_transfer",
    currency: "GBP",
    fiatAmount: gbp,
    fee: "0.00",
    asset,
    cryptoAmount: (Number(units) / 1e6).toFixed(6),
    rate: "1.27",
    transfers: [{ tx_hash: txHash }],
    settledAt: at.toISOString(),
  });
  inbox.push(partner.sign(ev, at));
}

test("e2e: settle, batch, verify, execute on the real registry, three-way check agrees", async () => {
  const now = new Date();
  const h1 = await pay(usdc, partnerWallet, 127_000_000n);
  const h2 = await pay(usdt, partnerWallet, 63_500_000n);
  const h3 = await pay(fakeUsdc, stranger, 127_000_000n);
  const h4 = await pay(usdc, partnerWallet, 12_700_000n);
  settle("tx_1", "FVC-L1", "100.00", "USDC", 127_000_000n, h1, now);
  settle("tx_2", "FVC-L1", "50.00", "USDT", 63_500_000n, h2, now);
  settle("tx_3", "FVC-L1", "100.00", "USDC", 127_000_000n, h3, now);
  settle("tx_4", "FVC-L2", "10.00", "USDC", 12_700_000n, h4, now);
  await mine(2);

  const r = await run(now);
  assert.ok(r.batchId, r.report);
  const s = r.state;
  const byTx = Object.fromEntries([...s.deposits.values()].map((d) => [d.deposit.txHash, `${d.state}/${d.reason}`]));
  assert.equal(byTx[h1], "matched/OK");
  assert.equal(byTx[h2], "matched/OK");
  assert.equal(byTx[h3], "wrong_currency/TOKEN_NOT_ACCEPTED");
  assert.equal(byTx[h4], "unmatched/LOAN_NOT_REPAYABLE");

  const safeJson = JSON.parse(r.batchFiles[`${r.batchId}.json`]);
  const evidenceJson = JSON.parse(r.batchFiles[`${r.batchId}.evidence.json`]);
  const chain = new EthersChain(rpcUrl, config.registry);
  const v = await verifyBatch({ safeJson, evidenceJson, expected: { chainId: 1337, safe: config.safe, registry: config.registry, confirmation: config.confirmation } }, chain, chain);
  assert.ok(v.ok, v.lines.join("\n"));

  const tampered = JSON.parse(JSON.stringify(safeJson));
  const iface = registry.interface;
  const last = iface.parseTransaction({ data: tampered.transactions.at(-1).data })!;
  tampered.transactions.at(-1).data = iface.encodeFunctionData("recordRepayment", [last.args[0], last.args[1] * 10n, last.args[2], last.args[3], last.args[4]]);
  const vt = await verifyBatch({ safeJson: tampered, evidenceJson, expected: { chainId: 1337, safe: config.safe, registry: config.registry, confirmation: config.confirmation } }, chain, chain);
  assert.equal(vt.ok, false);
  chain.provider.destroy();

  for (const t of safeJson.transactions) await (await safe.sendTransaction({ to: t.to, data: t.data, value: 0n })).wait();
  await mine(2);

  const r2 = await run(new Date(now.getTime() + 60_000));
  assert.ok(r2.checkOk, r2.report);
  assert.equal(r2.batchId, null);
  const loan = await registry.getFunction("loans")(1n);
  assert.equal(loan.repaidGbp, 15_000n);
  assert.equal(await registry.getFunction("refUsed")(partnerRef("settlement", "tx_1")), true);
  assert.equal(await registry.getFunction("totalReceived")(await usdc.getAddress()), 127_000_000n);
});

function cli(args: string[], cwd: string, env: Record<string, string> = {}): Promise<{ code: number; out: string }> {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, args, { cwd, env: { ...process.env, RECONCILER_RPC_URL: rpcUrl, VERIFY_RPC_URL: rpcUrl, PARTNER_WEBHOOK_SECRET: SECRET, ...env } });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (out += d));
    p.on("close", (code) => resolve({ code: code ?? -1, out }));
  });
}

test("e2e: the CLI and scripts, as the Sepolia runbook uses them", async () => {
  const root = new URL("../../", import.meta.url).pathname;
  const script = (s: string) => join(root, s);
  const dir = mkdtempSync(join(tmpdir(), "reconciler-cli-"));
  try {
    const partnerAddr = await partnerWallet.getAddress();
    const deployBlock = await provider.getBlockNumber();
    const { writeFileSync, readdirSync } = await import("node:fs");
    writeFileSync(join(dir, "deployment.json"), JSON.stringify({ network: "localhost", chainId: "1337", registry: config.registry, safe: config.safe, partner: partnerAddr, deployBlock }));

    let r = await cli([script("scripts/make-config.ts"), "--deployment", "deployment.json", "--token", `USDC:${await usdc.getAddress()}`, "--gbp-rate", "USDC:1.27", "--depth", "2", "--explorer", "http://localhost/tx/", "--out", "config.json"], dir);
    assert.equal(r.code, 0, r.out);

    r = await cli([script("scripts/loan-batch.ts"), "--config", "config.json", "--reference", "FVC-T1", "--facility", "100.00", "--fee", "5.00", "--tranche", "100.00", "--token", "USDC", "--rate", "1.27", "--payout-id", "po_t1", "--to", partnerAddr], dir);
    assert.equal(r.code, 0, r.out);
    const setupFile = readdirSync(join(dir, "out", "setup"))[0];
    await (await usdc.connect(admin).getFunction("mint")(config.safe, 127_000_000n)).wait();
    for (const t of JSON.parse(readFileSync(join(dir, "out", "setup", setupFile), "utf8")).transactions) {
      await (await safe.sendTransaction({ to: t.to, data: t.data, value: 0n })).wait();
    }

    const hash = await pay(usdc, partnerWallet, 12_700_000n);
    r = await cli([script("scripts/mock-settlement.ts"), "--config", "config.json", "--tx", hash, "--id", "tx_t1", "--reference", "FVC-T1", "--gbp", "10.00", "--rate", "1.27"], dir);
    assert.equal(r.code, 0, r.out);
    await mine(2);

    r = await cli([script("src/cli.ts"), "run", "--config", "config.json"], dir);
    assert.equal(r.code, 0, r.out);
    const batchFile = readdirSync(join(dir, "out", "batches")).find((f) => /^B-[0-9a-f]{12}\.json$/.test(f))!;
    assert.ok(batchFile, r.out);

    r = await cli([script("src/cli.ts"), "verify-batch", join("out", "batches", batchFile), "--chain-id", "1337", "--safe", config.safe, "--registry", config.registry, "--depth", "2"], dir);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /ALL CHECKS PASSED/);

    for (const t of JSON.parse(readFileSync(join(dir, "out", "batches", batchFile), "utf8")).transactions) {
      await (await safe.sendTransaction({ to: t.to, data: t.data, value: 0n })).wait();
    }
    await mine(2);
    r = await cli([script("src/cli.ts"), "run", "--config", "config.json"], dir);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /no batch; three-way check ok/);
    r = await cli([script("src/cli.ts"), "verify-batch", join("out", "batches", batchFile), "--chain-id", "1337", "--safe", config.safe, "--registry", config.registry, "--depth", "2"], dir);
    assert.equal(r.code, 3, "an executed batch must not verify again");

    r = await cli([script("scripts/mock-settlement.ts"), "--config", "config.json", "--reverse", "tx_t1", "--id", "rev_t1", "--gbp", "10.00"], dir);
    assert.equal(r.code, 0, r.out);
    r = await cli([script("src/cli.ts"), "run", "--config", "config.json"], dir);
    const report = readFileSync(join(dir, "out", "reports", readdirSync(join(dir, "out", "reports"))[0]), "utf8");
    assert.equal(r.code, 3, r.out + report);
    assert.match(report, /CORRECTION_REQUIRED/);

    r = await cli([script("src/cli.ts"), "verify-log", "--config", "config.json"], dir);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /event log ok/);

    r = await cli([script("src/cli.ts"), "run", "--config", "config.json"], dir, { PARTNER_WEBHOOK_SECRET: "" });
    assert.equal(r.code, 1);
    assert.equal(readdirSync(join(dir, "data")).includes(".lock"), false, "lock released after a failed run");

    writeFileSync(join(dir, "data", ".lock"), "12345\n");
    r = await cli([script("src/cli.ts"), "run", "--config", "config.json"], dir);
    assert.equal(r.code, 2, r.out);
    assert.match(r.out, /another run is in progress/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("e2e: a reorg below the confirmation depth halts the run", async () => {
  const snap = await provider.send("evm_snapshot", []);
  await mine(3);
  const r = await run(new Date());
  assert.ok(r.confirmedHead > 0);
  await provider.send("evm_revert", [snap]);
  // A different history of the same length: new block hashes at the cursor height.
  await (await usdc.connect(partnerWallet).getFunction("transfer")(await stranger.getAddress(), 1n)).wait();
  await mine(5);
  await assert.rejects(run(new Date()), /reorg below the confirmation depth/);
});
