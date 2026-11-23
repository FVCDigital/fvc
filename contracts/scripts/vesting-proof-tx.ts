import { ethers } from "hardhat";

const TX = process.env.TX || "0x6d40c9450e8baffa24ea55f3f0d5b81241f0d7edfdddb14fd52f69a9b50bfb42";

async function main() {
  const provider = ethers.provider;
  const tx = await provider.getTransaction(TX);
  const rc = await provider.getTransactionReceipt(TX);
  console.log("from:", tx?.from, "\nto:", tx?.to, "\nstatus:", rc?.status, "\nblock:", rc?.blockNumber);
  console.log("input selector:", tx?.data.slice(0, 10));

  const iface = new ethers.Interface([
    "event VestingScheduleCreated(address indexed beneficiary, uint256 indexed scheduleId, uint256 amount, uint256 startTime, uint256 cliff, uint256 duration)",
    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "event ExecutionSuccess(bytes32 indexed txHash, uint256 payment)",
    "event ExecutionSuccess(bytes32 txHash, uint256 payment)",
    "event SafeMultiSigTransaction(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,bytes signatures,bytes additionalInfo)",
    "event TokensPurchased(address indexed buyer, address indexed paymentToken, uint256 paymentAmount, uint256 tokenAmount, bool vested)",
  ]);

  console.log("\n--- logs ---");
  for (const log of rc!.logs) {
    let parsed = null;
    try {
      parsed = iface.parseLog({ topics: [...log.topics], data: log.data });
    } catch {}
    console.log(`\n#${log.index} emitter: ${log.address}`);
    if (parsed) {
      console.log("  event:", parsed.name);
      console.log("  args:", parsed.args.map((a: any) => (typeof a === "bigint" ? a.toString() : a)).join(" | "));
    } else {
      console.log("  topic0:", log.topics[0]);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
