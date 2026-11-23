/**
 * Writes a Safe Transaction Builder batch that creates one test loan and pays out one tranche to the
 * partner's address, and adds the loan to the local loan book. Testnet setup only; it reads the
 * chain and writes files, it sends nothing.
 *
 *   RECONCILER_RPC_URL=... node scripts/loan-batch.ts --config config.local.json \
 *     --reference FVC-T1 --facility 100.00 --fee 5.00 --tranche 100.00 --token USDC --rate 1.27 \
 *     --payout-id po_test_1 --to 0xPartner
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { Contract, Interface, getAddress, id } from "ethers";
import { ERC20_ABI, EthersChain, partnerRef } from "../src/chain.ts";
import { loadConfig, tokenBySymbol } from "../src/config.ts";
import { expectedTokenAmount, formatUnits, parseDecimal, toUnits } from "../src/money.ts";
import { parseLoanBook } from "../src/sources.ts";

const ABI = [
  "function loanCount() view returns (uint256)",
  "function createLoan(bytes32 agreementHash, bytes32 smeRef, uint256 facilityGbp, uint256 feeGbp) returns (uint256)",
  "function recordDisbursement(uint256 loanId, uint256 gbpAmount, address token, uint256 tokenAmount, bytes32 payoutRef, address to)",
  "function approvedDestination(address) view returns (bool)",
];

const { values } = parseArgs({
  options: {
    config: { type: "string" },
    reference: { type: "string" },
    facility: { type: "string" },
    fee: { type: "string" },
    tranche: { type: "string" },
    token: { type: "string" },
    rate: { type: "string" },
    "payout-id": { type: "string" },
    to: { type: "string" },
  },
});
for (const k of ["config", "reference", "facility", "fee", "tranche", "token", "rate", "payout-id", "to"] as const) {
  if (!values[k]) {
    console.error(`--${k} is required`);
    process.exit(1);
  }
}
const rpcUrl = process.env.RECONCILER_RPC_URL;
if (!rpcUrl) {
  console.error("RECONCILER_RPC_URL is not set");
  process.exit(1);
}

const { config } = loadConfig(values.config!);
const token = tokenBySymbol(config, values.token!);
if (!token) throw new Error(`token ${values.token} is not in the config`);
const facility = toUnits(values.facility!, 2);
const fee = toUnits(values.fee!, 2);
const tranche = toUnits(values.tranche!, 2);
const tokenAmount = expectedTokenAmount(tranche, 2, parseDecimal(values.rate!), token.decimals);
const to = getAddress(values.to!);
const payoutRef = partnerRef("payout", values["payout-id"]!);

const chain = new EthersChain(rpcUrl, config.registry);
try {
  const registry = new Contract(config.registry, ABI, chain.provider);
  const loanId = (await registry.loanCount()) + 1n;
  if (!(await registry.approvedDestination(to))) throw new Error(`${to} is not an approved destination; execute the timelock setup batch first`);

  const book = existsSync(config.paths.loanBook) ? JSON.parse(readFileSync(config.paths.loanBook, "utf8")) : [];
  book.push({ reference: values.reference, loanId: loanId.toString(), currency: "GBP" });
  parseLoanBook(book);

  const reg = new Interface(ABI);
  const erc20 = new Interface(ERC20_ABI);
  const agreementHash = id(`fvc.test-agreement.${values.reference}`);
  const smeRef = id(`fvc.test-sme.${values.reference}`);
  const batch = {
    version: "1.0",
    chainId: String(config.chainId),
    createdAt: Date.now(),
    meta: {
      name: `Test loan ${loanId} (${values.reference})`,
      description: `createLoan ${values.facility} GBP + ${values.fee} fee; tranche ${values.tranche} GBP = ${formatUnits(tokenAmount, token.decimals)} ${token.symbol} to ${to}`,
      txBuilderVersion: "1.16.5",
      createdFromSafeAddress: config.safe,
    },
    transactions: [
      { to: config.registry, value: "0", data: reg.encodeFunctionData("createLoan", [agreementHash, smeRef, facility, fee]) },
      ...(token.approveResetFirst ? [{ to: token.address, value: "0", data: erc20.encodeFunctionData("approve", [config.registry, 0n]) }] : []),
      { to: token.address, value: "0", data: erc20.encodeFunctionData("approve", [config.registry, tokenAmount]) },
      { to: config.registry, value: "0", data: reg.encodeFunctionData("recordDisbursement", [loanId, tranche, token.address, tokenAmount, payoutRef, to]) },
    ],
  };
  const dir = join(config.paths.out, "setup");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `loan-${loanId}-${values.reference}.json`);
  writeFileSync(file, JSON.stringify(batch, null, 2) + "\n");
  writeFileSync(config.paths.loanBook, JSON.stringify(book, null, 2) + "\n");
  console.log(`wrote ${file}`);
  console.log(`loan ${loanId}: reference ${values.reference}, facility ${values.facility} GBP, fee ${values.fee} GBP`);
  console.log(`tranche ${values.tranche} GBP = ${formatUnits(tokenAmount, token.decimals)} ${token.symbol} to ${to}, payoutRef ${payoutRef}`);
  console.log(`added to ${config.paths.loanBook}. The Safe needs ${formatUnits(tokenAmount, token.decimals)} ${token.symbol} before signing.`);
} finally {
  chain.provider.destroy();
}
