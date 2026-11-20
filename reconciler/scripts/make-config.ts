/**
 * Writes a reconciler config for a network from the Loan Registry deployment output, then checks it
 * against the chain. Reads only; sends nothing.
 *
 *   RECONCILER_RPC_URL=... node scripts/make-config.ts \
 *     --deployment ../contracts/safe-batches/loan-registry-sepolia/deployment.json \
 *     --token USDC:0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 \
 *     --gbp-rate USDC:1.27 --out config.local.json
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { getAddress } from "ethers";
import { EthersChain } from "../src/chain.ts";
import { parseConfig } from "../src/config.ts";

const EXPLORERS: Record<string, string> = {
  "1": "https://etherscan.io/tx/",
  "11155111": "https://sepolia.etherscan.io/tx/",
};

const { values } = parseArgs({
  options: {
    deployment: { type: "string" },
    token: { type: "string", multiple: true },
    "gbp-rate": { type: "string", multiple: true },
    "partner-sender": { type: "string", multiple: true },
    depth: { type: "string" },
    explorer: { type: "string" },
    out: { type: "string" },
    force: { type: "boolean" },
  },
});

function need<T>(v: T | undefined, name: string): T {
  if (v === undefined) {
    console.error(`--${name} is required`);
    process.exit(1);
  }
  return v;
}

const rpcUrl = process.env.RECONCILER_RPC_URL;
if (!rpcUrl) {
  console.error("RECONCILER_RPC_URL is not set");
  process.exit(1);
}
const out = need(values.out, "out");
if (existsSync(out) && !values.force) {
  console.error(`${out} exists; pass --force to overwrite`);
  process.exit(1);
}

const deployment = JSON.parse(readFileSync(need(values.deployment, "deployment"), "utf8"));
if (typeof deployment.deployBlock !== "number") {
  console.error("deployment.json has no deployBlock; it was written by an older deploy script");
  process.exit(1);
}
const tokens = need(values.token, "token").map((t) => {
  const [symbol, address] = t.split(":");
  return { symbol, address: getAddress(address) };
});
const rates = (values["gbp-rate"] ?? []).map((r) => {
  const [token, rate] = r.split(":");
  return { currency: "GBP", token, date: "*", rate };
});

const chain = new EthersChain(rpcUrl, getAddress(deployment.registry).toLowerCase());
try {
  const chainId = await chain.chainId();
  if (String(chainId) !== String(deployment.chainId)) throw new Error(`RPC is chain ${chainId}, deployment is ${deployment.chainId}`);
  const tokenSettings = [];
  for (const t of tokens) {
    const decimals = await chain.tokenDecimals(t.address.toLowerCase());
    const tc = await chain.tokenConfig(t.address.toLowerCase());
    if (!tc.allowed) console.warn(`warning: ${t.symbol} is not allowed in the registry yet (timelock batch not executed?)`);
    tokenSettings.push({
      symbol: t.symbol,
      address: t.address,
      decimals,
      approveResetFirst: t.symbol === "USDT",
      dustThreshold: String(10n ** BigInt(decimals)),
    });
  }
  const senders = values["partner-sender"] ?? (deployment.partner ? [deployment.partner] : []);

  const raw = {
    chainId,
    safe: deployment.safe,
    registry: deployment.registry,
    startBlock: deployment.deployBlock,
    confirmation: values.depth ? { mode: "depth", blocks: Number(values.depth) } : { mode: "finalized" },
    chunkSize: 2000,
    tokens: tokenSettings,
    partnerSenders: senders,
    currencies: { GBP: { minorDigits: 2 }, CHF: { minorDigits: 2 }, EUR: { minorDigits: 2 } },
    tolerance: { internalBps: 10, roundingUnits: "2", marketBps: 200 },
    requireReferenceRate: true,
    referenceRates: rates,
    creditBasis: "net",
    holdHours: { bank_transfer: 0, direct_debit: 72, card: 0 },
    messageWaitHours: 24,
    partialWaitHours: 24,
    depositWaitHours: 24,
    bouncedPayoutPolicy: "report",
    maxClockSkewSeconds: 300,
    explorerTxUrl: values.explorer ?? EXPLORERS[String(chainId)] ?? need(undefined, "explorer (no default for this chain)"),
    paths: { data: "data", inbox: "inbox", out: "out", loanBook: "loans.json" },
  };
  parseConfig(raw);
  if ((await chain.safe()) !== getAddress(deployment.safe).toLowerCase()) throw new Error("registry.safe() is not the deployment's Safe");
  writeFileSync(out, JSON.stringify(raw, null, 2) + "\n");
  console.log(`wrote ${out}: chain ${chainId}, registry ${deployment.registry}, start block ${deployment.deployBlock}, ${tokenSettings.length} token(s)`);
  if (rates.length === 0) console.warn("warning: no --gbp-rate given; requireReferenceRate will dispute every settlement");
} finally {
  chain.provider.destroy();
}
