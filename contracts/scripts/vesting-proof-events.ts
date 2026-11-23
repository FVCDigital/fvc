import { ethers } from "hardhat";

const VESTING = "0x24263Dce127Ad06cC272897629d6688Ec54df389";
const BENEFICIARY = process.env.BENEFICIARY || "0x0322bf11bCd9F8393EB233c5dF3a4b19aae95FA9";
const TARGET_TS = Number(process.env.TARGET_TS || 1786468715);

const iso = (t: number) => new Date(t * 1000).toISOString().replace("T", " ").slice(0, 19) + " UTC";

async function findBlockByTimestamp(target: number) {
  const provider = ethers.provider;
  let lo = 1;
  let hi = await provider.getBlockNumber();
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const b = await provider.getBlock(mid);
    if (!b) break;
    if (b.timestamp < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

async function main() {
  const provider = ethers.provider;
  const addr = ethers.getAddress(BENEFICIARY);

  const code = await provider.getCode(addr);
  console.log("beneficiary bytecode size:", (code.length - 2) / 2, code === "0x" ? "(EOA / normal wallet)" : "(smart contract wallet)");
  console.log("beneficiary tx count (nonce):", await provider.getTransactionCount(addr));

  const anchor = await findBlockByTimestamp(TARGET_TS);
  console.log("\nblock at/after target timestamp:", anchor, iso((await provider.getBlock(anchor))!.timestamp));

  const iface = new ethers.Interface([
    "event VestingScheduleCreated(address indexed beneficiary, uint256 indexed scheduleId, uint256 amount, uint256 startTime, uint256 cliff, uint256 duration)",
  ]);
  const topic0 = iface.getEvent("VestingScheduleCreated")!.topicHash;
  const topic1 = ethers.zeroPadValue(addr, 32);

  for (let from = anchor - 10; from <= anchor + 10; from += 5) {
    const logs = await provider.getLogs({
      address: VESTING,
      topics: [topic0, topic1],
      fromBlock: from,
      toBlock: from + 4,
    });
    for (const log of logs) {
      const parsed = iface.parseLog({ topics: [...log.topics], data: log.data })!;
      const b = await provider.getBlock(log.blockNumber);
      const tx = await provider.getTransaction(log.transactionHash);
      console.log("\nVestingScheduleCreated");
      console.log("  tx hash:", log.transactionHash);
      console.log("  block:", log.blockNumber, iso(b!.timestamp));
      console.log("  from (sender):", tx?.from);
      console.log("  to:", tx?.to);
      console.log("  scheduleId:", parsed.args.scheduleId.toString());
      console.log("  amount:", ethers.formatEther(parsed.args.amount), "FVC");
      console.log("  startTime:", parsed.args.startTime.toString(), iso(Number(parsed.args.startTime)));
      console.log("  cliff days:", Number(parsed.args.cliff) / 86400, "| duration days:", Number(parsed.args.duration) / 86400);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
