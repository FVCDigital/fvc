/**
 * Generates mintOTC calldata for a Gnosis Safe transaction.
 *
 * Usage:
 *   npx ts-node gnosis-safe/generate-otc-calldata.ts \
 *     --recipient 0xABC... \
 *     --fvc 4000000 \
 *     --cliff 12 \
 *     --duration 24
 *
 * --cliff and --duration are in MONTHS.
 * --fvc is in whole FVC tokens (not wei).
 * --duration 0 = no vesting, direct mint.
 */
import { ethers } from "ethers";

const MONTH = 30 * 24 * 60 * 60; // 30 days in seconds

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : null;
  };
  const recipient = get("--recipient");
  const fvc       = get("--fvc");
  const cliff     = get("--cliff");
  const duration  = get("--duration");

  if (!recipient || !fvc || cliff === null || duration === null) {
    console.error("Usage: npx ts-node gnosis-safe/generate-otc-calldata.ts \\");
    console.error("  --recipient 0xABC...  (investor wallet)");
    console.error("  --fvc 4000000         (FVC amount, whole tokens)");
    console.error("  --cliff 12            (cliff in months, 0 = no cliff)");
    console.error("  --duration 24         (total vesting duration in months, 0 = no vesting)");
    process.exit(1);
  }

  return {
    recipient,
    fvcWei:   ethers.parseEther(fvc),
    cliffSec: BigInt(Math.round(Number(cliff) * MONTH)),
    durSec:   BigInt(Math.round(Number(duration) * MONTH)),
    cliffMo:  Number(cliff),
    durMo:    Number(duration),
    fvcHuman: fvc,
  };
}

async function main() {
  const { recipient, fvcWei, cliffSec, durSec, cliffMo, durMo, fvcHuman } = parseArgs();

  const iface = new ethers.Interface([
    "function mintOTC(address recipient, uint256 fvcAmount, uint256 cliff, uint256 duration) external",
  ]);

  const calldata = iface.encodeFunctionData("mintOTC", [recipient, fvcWei, cliffSec, durSec]);

  console.log("\n================================================================");
  console.log("GNOSIS SAFE — mintOTC TRANSACTION");
  console.log("================================================================");
  console.log("Recipient:  ", recipient);
  console.log("FVC Amount: ", Number(fvcHuman).toLocaleString(), "FVC");
  console.log("Cliff:      ", cliffMo === 0 ? "none" : `${cliffMo} months (${cliffSec}s)`);
  console.log("Duration:   ", durMo === 0 ? "none (direct mint)" : `${durMo} months (${durSec}s)`);
  console.log("\n--- Paste into Transaction Builder ---");
  console.log("To:      [SALE_ADDRESS]");
  console.log("Value:   0");
  console.log("Calldata:", calldata);
  console.log("\n--- Or use ABI method ---");
  console.log('ABI: [{"inputs":[{"name":"recipient","type":"address"},{"name":"fvcAmount","type":"uint256"},{"name":"cliff","type":"uint256"},{"name":"duration","type":"uint256"}],"name":"mintOTC","outputs":[],"stateMutability":"nonpayable","type":"function"}]');
  console.log("Parameters:");
  console.log("  recipient:", recipient);
  console.log("  fvcAmount:", fvcWei.toString());
  console.log("  cliff:    ", cliffSec.toString());
  console.log("  duration: ", durSec.toString());
  console.log("================================================================\n");
}

main().catch(console.error);
