import { ethers } from "hardhat";

const VESTING = "0x24263Dce127Ad06cC272897629d6688Ec54df389";
const FVC = "0xB84eC31C6B520c3aeA6a19483EB8f88cB55A0556";

const BENEFICIARY = process.env.BENEFICIARY || "0x0322bf11bCd9F8393EB233c5dF3a4b19aae95FA9";

const vestingAbi = [
  "function token() view returns (address)",
  "function owner() view returns (address)",
  "function totalVesting() view returns (uint256)",
  "function scheduleCount(address) view returns (uint256)",
  "function getVestingSchedule(address,uint256) view returns (uint256 totalAmount,uint256 released,uint256 startTime,uint256 cliff,uint256 duration,bool revoked,uint256 releasable)",
  "event VestingScheduleCreated(address indexed beneficiary, uint256 indexed scheduleId, uint256 amount, uint256 startTime, uint256 cliff, uint256 duration)",
  "event TokensReleased(address indexed beneficiary, uint256 indexed scheduleId, uint256 amount)",
];

const erc20Abi = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
];

const fmt = (v: bigint) => Number(ethers.formatEther(v)).toLocaleString("en-GB", { maximumFractionDigits: 4 });
const iso = (t: bigint | number) => new Date(Number(t) * 1000).toISOString().replace("T", " ").slice(0, 19) + " UTC";

async function main() {
  const provider = ethers.provider;
  const net = await provider.getNetwork();
  const block = await provider.getBlock("latest");
  const addr = ethers.getAddress(BENEFICIARY);

  console.log("=== NETWORK ===");
  console.log("chainId:", net.chainId.toString(), "| latest block:", block!.number, "|", iso(block!.timestamp));

  const vesting = new ethers.Contract(VESTING, vestingAbi, provider);
  const token = new ethers.Contract(FVC, erc20Abi, provider);

  console.log("\n=== TOKEN ===");
  console.log("address:", FVC);
  console.log("name/symbol/decimals:", await token.name(), "/", await token.symbol(), "/", (await token.decimals()).toString());
  console.log("totalSupply:", fmt(await token.totalSupply()));

  console.log("\n=== VESTING CONTRACT ===");
  console.log("address:", VESTING);
  console.log("token():", await vesting.token());
  console.log("owner():", await vesting.owner());
  console.log("totalVesting:", fmt(await vesting.totalVesting()));
  console.log("FVC held by vesting contract:", fmt(await token.balanceOf(VESTING)));

  console.log("\n=== BENEFICIARY ===");
  console.log("address:", addr);
  console.log("FVC balance in wallet:", fmt(await token.balanceOf(addr)));
  const count: bigint = await vesting.scheduleCount(addr);
  console.log("scheduleCount:", count.toString());

  for (let i = 0n; i < count; i++) {
    const s = await vesting.getVestingSchedule(addr, i);
    const start = Number(s.startTime);
    const cliffEnd = start + Number(s.cliff);
    const end = start + Number(s.duration);
    console.log(`\n--- schedule #${i} ---`);
    console.log("totalAmount:", fmt(s.totalAmount), "FVC");
    console.log("released:", fmt(s.released), "FVC");
    console.log("releasable now:", fmt(s.releasable), "FVC");
    console.log("locked:", fmt(s.totalAmount - s.released), "FVC");
    console.log("startTime:", start, iso(start));
    console.log("cliff:", (Number(s.cliff) / 86400).toFixed(2), "days -> ends", iso(cliffEnd));
    console.log("duration:", (Number(s.duration) / 86400).toFixed(2), "days -> fully vested", iso(end));
    console.log("revoked:", s.revoked);
  }

  console.log("\n=== EVENTS ===");
  const created = await vesting.queryFilter(vesting.filters.VestingScheduleCreated(addr), 0, "latest");
  for (const log of created) {
    const b = await log.getBlock();
    console.log("VestingScheduleCreated | tx:", log.transactionHash);
    console.log("  block:", log.blockNumber, iso(b.timestamp));
    console.log("  scheduleId:", (log as any).args.scheduleId.toString(), "| amount:", fmt((log as any).args.amount));
  }

  const released = await vesting.queryFilter(vesting.filters.TokensReleased(addr), 0, "latest");
  console.log("TokensReleased events:", released.length);
  for (const log of released) {
    console.log("  tx:", log.transactionHash, "| amount:", fmt((log as any).args.amount));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
