/**
 * Plays the partner on a testnet: reads a real transfer to the Safe and drops a signed settlement
 * (or reversal) for it into the inbox, in the mock-v0 format. Reads the chain, sends nothing.
 *
 *   RECONCILER_RPC_URL=... PARTNER_WEBHOOK_SECRET=... node scripts/mock-settlement.ts \
 *     --config config.local.json --tx 0x... --id tx_test_1 --reference FVC-T1 --gbp 10.00 --rate 1.27
 *   ... --reverse tx_test_1 --id rev_test_1 --reason chargeback --gbp 10.00
 *
 * Options to test the checks: --claim <amount> (message states a different token amount),
 * --fee, --method, --currency.
 */
import { parseArgs } from "node:util";
import { EthersChain } from "../src/chain.ts";
import { loadConfig, tokenByAddress } from "../src/config.ts";
import { DirectoryInbox } from "../src/inbox.ts";
import { formatUnits } from "../src/money.ts";
import { MockPartner } from "../src/partner/mock.ts";
import type { PaymentMethod, ReversalReason } from "../src/types.ts";

const { values } = parseArgs({
  options: {
    config: { type: "string" },
    tx: { type: "string" },
    id: { type: "string" },
    reference: { type: "string" },
    gbp: { type: "string" },
    fee: { type: "string", default: "0.00" },
    rate: { type: "string" },
    method: { type: "string", default: "bank_transfer" },
    currency: { type: "string", default: "GBP" },
    claim: { type: "string" },
    reverse: { type: "string" },
    reason: { type: "string", default: "chargeback" },
  },
});

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

const secret = process.env.PARTNER_WEBHOOK_SECRET ?? fail("PARTNER_WEBHOOK_SECRET is not set");
const { config } = loadConfig(values.config ?? fail("--config is required"));
const id = values.id ?? fail("--id is required");
const partner = new MockPartner(secret);
const inbox = new DirectoryInbox(config.paths.inbox);
const now = new Date();
// Each run of this script is a new delivery; the partner's own counter would restart every time.
const deliveryId = `evt_${id}_${now.getTime()}`;

if (values.reverse) {
  const event = partner.reversal({
    transactionId: id,
    originalTransactionId: values.reverse,
    reason: values.reason as ReversalReason,
    currency: values.currency!,
    fiatAmount: values.gbp ?? fail("--gbp is required"),
    occurredAt: now.toISOString(),
  });
  inbox.write(`${now.getTime()}-${id}`, partner.sign({ ...event, eventId: deliveryId }, now));
  console.log(`inbox: reversal ${id} of ${values.reverse} (${values.reason})`);
} else {
  const rpcUrl = process.env.RECONCILER_RPC_URL ?? fail("RECONCILER_RPC_URL is not set");
  const chain = new EthersChain(rpcUrl, config.registry);
  try {
    const found = await chain.transfersInTx(values.tx ?? fail("--tx is required"), config.safe);
    if (!found || found.deposits.length !== 1) fail(`tx ${values.tx} has ${found?.deposits.length ?? 0} transfers to the Safe; expected exactly one`);
    const deposit = found.deposits[0];
    const token = tokenByAddress(config, deposit.token);
    const asset = token?.symbol ?? "UNKNOWN";
    const decimals = token?.decimals ?? 18;
    const event = partner.settlement({
      transactionId: id,
      reference: values.reference ?? fail("--reference is required"),
      method: values.method as PaymentMethod,
      currency: values.currency!,
      fiatAmount: values.gbp ?? fail("--gbp is required"),
      fee: values.fee!,
      asset,
      cryptoAmount: values.claim ?? formatUnits(deposit.amount, decimals),
      rate: values.rate ?? fail("--rate is required"),
      transfers: [{ tx_hash: deposit.txHash, log_index: deposit.logIndex }],
      settledAt: now.toISOString(),
    });
    inbox.write(`${now.getTime()}-${id}`, partner.sign({ ...event, eventId: deliveryId }, now));
    console.log(`inbox: settlement ${id} for ${formatUnits(deposit.amount, decimals)} ${asset} in block ${found.blockNumber}, reference ${values.reference}`);
  } finally {
    chain.provider.destroy();
  }
}
