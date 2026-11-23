/* Find large vesting beneficiaries via Transfer logs into vesting + scheduleCount probes.
   Alchemy free: eth_getLogs max 10 blocks, so scan Transfer topic to vesting for large amounts. */
const { ethers } = require("ethers");

const RPC = process.env.ETHEREUM_MAINNET_RPC || "https://eth-mainnet.g.alchemy.com/v2/6tgWso4UXVZmfMyP0ErKJ";
const TOKEN = "0xB84eC31C6B520c3aeA6a19483EB8f88cB55A0556";
const VESTING = "0x24263Dce127Ad06cC272897629d6688Ec54df389";
const SALE = "0x0E99482aaA074C72756b78eDbdCA61E438729c54";
const SAFE = "0xE20c89da2138951655DbbbE6E6db01fe561EBe82";

const KNOWN = new Set([
  "0x020fd3bDCB2716B15c5ac0D2B242f26a5c54AcA6".toLowerCase(),
  "0x0322bf11bCd9F8393EB233c5dF3a4b19aae95FA9".toLowerCase(),
]);

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const token = new ethers.Contract(TOKEN, [
    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "function balanceOf(address) view returns (uint256)",
  ], provider);
  const vesting = new ethers.Contract(VESTING, [
    "function scheduleCount(address) view returns (uint256)",
    "function getAllSchedules(address) view returns (tuple(uint256 totalAmount,uint256 released,uint256 startTime,uint256 cliff,uint256 duration,bool revoked)[])",
    "function totalVesting() view returns (uint256)",
    "event VestingScheduleCreated(address indexed beneficiary, uint256 indexed scheduleId, uint256 amount, uint256 startTime, uint256 cliff, uint256 duration)",
  ], provider);

  const latest = await provider.getBlockNumber();
  console.log("latest block", latest, "totalVesting", ethers.formatEther(await vesting.totalVesting()));

  // Scan Transfer(to=VESTING) from deploy ~ Mar 2026. Alchemy free = 10 blocks.
  // Jump strategy: sample every N blocks looking for non-zero Transfer by checking
  // mint txs via eth_getLogs in 10-block windows around known activity.
  // Better: use Transfer topic filtered to vesting as `to`, scan in 10-block windows
  // but skip empty ranges by binary-searching via getLogs on 10-block and advancing
  // by 50k when empty? Alchemy rejects >10. So we must do 10 at a time, which is too slow for full history.
  //
  // Alternative: query sale TokensPurchasedWithVesting events in 10-block windows
  // OR use eth_call creatively.
  //
  // Practical approach for Billy (~866k FVC @ $0.03): look at USDC/USDT transfers INTO Safe
  // around the right size (~26k).

  const usdc = new ethers.Contract("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", [
    "event Transfer(address indexed from, address indexed to, uint256 value)",
  ], provider);
  const usdt = new ethers.Contract("0xdAC17F958D2ee523a2206206994597C13D831ec7", [
    "event Transfer(address indexed from, address indexed to, uint256 value)",
  ], provider);

  const transferTopic = ethers.id("Transfer(address,address,uint256)");
  const safeTopic = ethers.zeroPadValue(SAFE, 32);

  // Scan last ~2M blocks in 10-block chunks is impossible (200k requests).
  // Instead use Alchemy asset transfers API if available.
  const body = {
    id: 1,
    jsonrpc: "2.0",
    method: "alchemy_getAssetTransfers",
    params: [{
      fromBlock: "0x0",
      toBlock: "latest",
      toAddress: SAFE,
      category: ["erc20", "external"],
      withMetadata: true,
      excludeZeroValue: true,
      maxCount: "0x3e8",
      order: "asc",
    }],
  };
  const res = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json();
  if (json.error) {
    console.log("alchemy_getAssetTransfers error", json.error);
  } else {
    const transfers = json.result?.transfers || [];
    console.log("\nTransfers INTO treasury Safe:", transfers.length);
    for (const t of transfers) {
      const val = Number(t.value || 0);
      if (val >= 1000 || (t.asset && ["USDC","USDT","ETH","WETH"].includes(t.asset))) {
        console.log({
          asset: t.asset,
          value: t.value,
          from: t.from,
          hash: t.hash,
          block: t.blockNum,
          date: t.metadata?.blockTimestamp,
        });
      }
    }
  }

  // Also transfers INTO vesting of FVC (mint allocations)
  const body2 = {
    id: 2,
    jsonrpc: "2.0",
    method: "alchemy_getAssetTransfers",
    params: [{
      fromBlock: "0x0",
      toBlock: "latest",
      toAddress: VESTING,
      contractAddresses: [TOKEN],
      category: ["erc20"],
      withMetadata: true,
      excludeZeroValue: true,
      maxCount: "0x3e8",
      order: "asc",
    }],
  };
  const res2 = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body2) });
  const json2 = await res2.json();
  if (json2.error) {
    console.log("vesting transfers error", json2.error);
  } else {
    const transfers = json2.result?.transfers || [];
    console.log("\nFVC transfers INTO vesting:", transfers.length);
    for (const t of transfers) {
      console.log({ value: t.value, from: t.from, hash: t.hash, date: t.metadata?.blockTimestamp });
    }
  }

  // VestingScheduleCreated via alchemy getLogs? Try getAssetTransfers won't work.
  // Use alchemy_getAssetTransfers from sale? Or probe known large FVC holders.
}

main().catch((e) => { console.error(e); process.exit(1); });
