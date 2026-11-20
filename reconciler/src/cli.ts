import { closeSync, mkdirSync, openSync, readFileSync, rmSync, writeSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { EthersChain } from "./chain.ts";
import { loadConfig, type ConfirmationPolicy } from "./config.ts";
import { DirectoryInbox } from "./inbox.ts";
import { HaltError } from "./ingest.ts";
import { EventLog, FileStore } from "./log.ts";
import { MockPartnerAdapter } from "./partner/adapter.ts";
import { runOnce } from "./reconciler.ts";
import { replay } from "./state.ts";
import { StaticRateSource, loadLoanBook } from "./sources.ts";
import { verifyBatch } from "./verify.ts";

const USAGE = `reconciler: matches partner settlements to stablecoin deposits at the Safe and writes
"record repayment" batches for the Safe signers. It holds no key and never proposes or signs.

  run          --config <file>                  one pass, then exit
  watch        --config <file> --every <sec>    a pass every <sec> seconds; stops on a halt
  verify-log   --config <file>                  check the event log's hash chain and replay it
  verify-batch <batch.json> --chain-id <n> --safe <addr> --registry <addr> (--depth <n> | --finalized)
               checks a batch from its files and VERIFY_RPC_URL only; run it before signing

env: RECONCILER_RPC_URL, PARTNER_WEBHOOK_SECRET (run, watch); VERIFY_RPC_URL (verify-batch)
exit codes: 0 ok, 1 error, 2 halted (a person must look), 3 three-way check or verification failed`;

function env(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`${name} is not set`);
    process.exit(1);
  }
  return v;
}

/** One process at a time per data directory: two writers would fork the hash chain. */
function lock(dataDir: string): () => void {
  mkdirSync(dataDir, { recursive: true });
  const file = join(dataDir, ".lock");
  let fd: number;
  try {
    fd = openSync(file, "wx");
  } catch {
    throw new HaltError(`${file} exists: another run is in progress, or one was killed. Check with pgrep before removing it.`);
  }
  writeSync(fd, `${process.pid}\n`);
  closeSync(fd);
  return () => rmSync(file, { force: true });
}

async function pass(configFile: string): Promise<number> {
  const { config, hash } = loadConfig(configFile);
  const rpcUrl = env("RECONCILER_RPC_URL");
  const secret = env("PARTNER_WEBHOOK_SECRET");
  let unlock: () => void;
  try {
    unlock = lock(config.paths.data);
  } catch (e) {
    console.error(`HALTED: ${(e as Error).message}`);
    return 2;
  }
  const rpc = new EthersChain(rpcUrl, config.registry);
  try {
    const log = new EventLog(new FileStore(join(config.paths.data, "events.jsonl")));
    const result = await runOnce({
      config,
      configHash: hash,
      log,
      chain: rpc,
      registry: rpc,
      adapter: new MockPartnerAdapter(),
      inbox: new DirectoryInbox(config.paths.inbox),
      loanBook: loadLoanBook(config.paths.loanBook),
      rates: new StaticRateSource(config),
      secret,
      clock: () => new Date(),
      outDir: config.paths.out,
    });
    console.log(
      `confirmed head ${result.confirmedHead}; ` +
        (result.batchId ? `wrote batch ${result.batchId} to ${join(config.paths.out, "batches")}` : "no batch") +
        `; three-way check ${result.checkOk ? "ok" : "FAILED"}; report in ${join(config.paths.out, "reports")}`
    );
    return result.checkOk ? 0 : 3;
  } catch (e) {
    if (e instanceof HaltError) {
      console.error(`HALTED: ${e.message}`);
      return 2;
    }
    throw e;
  } finally {
    rpc.provider.destroy();
    unlock();
  }
}

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  const { values, positionals } = parseArgs({
    args: rest,
    allowPositionals: true,
    options: {
      config: { type: "string" },
      every: { type: "string" },
      "chain-id": { type: "string" },
      safe: { type: "string" },
      registry: { type: "string" },
      depth: { type: "string" },
      finalized: { type: "boolean" },
    },
  });

  switch (command) {
    case "run":
      if (!values.config) break;
      return pass(values.config);

    case "watch": {
      if (!values.config || !values.every || !/^\d+$/.test(values.every)) break;
      const ms = Number(values.every) * 1000;
      for (;;) {
        const code = await pass(values.config);
        if (code === 2) return code;
        await new Promise((r) => setTimeout(r, ms));
      }
    }

    case "verify-log": {
      if (!values.config) break;
      const { config } = loadConfig(values.config);
      const log = new EventLog(new FileStore(join(config.paths.data, "events.jsonl")));
      const state = replay(log.all());
      console.log(`event log ok: ${log.all().length} records, head ${log.head()}, ${state.deposits.size} deposits, ${state.entries.size} entries`);
      return 0;
    }

    case "verify-batch": {
      const file = positionals[0];
      if (!file || !values["chain-id"] || !values.safe || !values.registry || (!values.depth === !values.finalized)) break;
      const confirmation: ConfirmationPolicy = values.finalized ? { mode: "finalized" } : { mode: "depth", blocks: Number(values.depth) };
      const evidenceFile = file.replace(/\.json$/, ".evidence.json");
      const rpc = new EthersChain(env("VERIFY_RPC_URL"), values.registry.toLowerCase());
      try {
        const result = await verifyBatch(
          {
            safeJson: JSON.parse(readFileSync(file, "utf8")),
            evidenceJson: JSON.parse(readFileSync(evidenceFile, "utf8")),
            expected: { chainId: Number(values["chain-id"]), safe: values.safe, registry: values.registry, confirmation },
          },
          rpc,
          rpc
        );
        for (const line of result.lines) console.log(line);
        console.log(result.ok ? "\nALL CHECKS PASSED. Still compare each row with the partner dashboard before signing." : "\nDO NOT SIGN.");
        return result.ok ? 0 : 3;
      } finally {
        rpc.provider.destroy();
      }
    }
  }
  console.error(USAGE);
  return 1;
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
);
