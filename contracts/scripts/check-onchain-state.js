/* Read-only mainnet state check: total supply, balances, all vesting schedules ever created. */
const { ethers } = require("ethers");

const RPC = process.env.ETHEREUM_MAINNET_RPC || "https://eth-mainnet.g.alchemy.com/v2/6tgWso4UXVZmfMyP0ErKJ";
const TOKEN = "0xB84eC31C6B520c3aeA6a19483EB8f88cB55A0556";
const VESTING = "0x24263Dce127Ad06cC272897629d6688Ec54df389";
const SALE = "0x0E99482aaA074C72756b78eDbdCA61E438729c54";
const SAFE = "0xE20c89da2138951655DbbbE6E6db01fe561EBe82";

const tokenAbi = [
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
];
const vestingAbi = [
  "function scheduleCount(address) view returns (uint256)",
  "function getAllSchedules(address) view returns (tuple(uint256 totalAmount,uint256 released,uint256 startTime,uint256 cliff,uint256 duration,bool revoked)[])",
  "event VestingScheduleCreated(address indexed beneficiary, uint256 indexed scheduleId, uint256 amount, uint256 startTime, uint256 cliff, uint256 duration)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const token = new ethers.Contract(TOKEN, tokenAbi, provider);
  const vesting = new ethers.Contract(VESTING, vestingAbi, provider);

  const f = (x) => Number(ethers.formatEther(x)).toLocaleString("en-US");

  const [supply, balVesting, balSale, balSafe] = await Promise.all([
    token.totalSupply(),
    token.balanceOf(VESTING),
    token.balanceOf(SALE),
    token.balanceOf(SAFE),
  ]);
  console.log("totalSupply:        ", f(supply), "FVC");
  console.log("vesting contract:   ", f(balVesting), "FVC");
  console.log("sale contract:      ", f(balSale), "FVC");
  console.log("treasury safe:      ", f(balSafe), "FVC");

  const latest = await provider.getBlockNumber();
  // Scan in chunks from a block safely before deployment
  const START = 23_000_000;
  const CHUNK = 400_000;
  let logs = [];
  for (let from = START; from <= latest; from += CHUNK) {
    const to = Math.min(from + CHUNK - 1, latest);
    const part = await vesting.queryFilter(vesting.filters.VestingScheduleCreated(), from, to);
    logs = logs.concat(part);
  }

  console.log("\nAll VestingScheduleCreated events:", logs.length);
  const perBeneficiary = {};
  for (const log of logs) {
    const b = log.args.beneficiary;
    perBeneficiary[b] = (perBeneficiary[b] || 0n) + log.args.amount;
  }
  let totalVested = 0n;
  console.log("\nBeneficiary totals:");
  for (const [addr, amt] of Object.entries(perBeneficiary)) {
    totalVested += amt;
    console.log(`  ${addr}  ${f(amt)} FVC`);
  }
  console.log("\nSum of all schedules:", f(totalVested), "FVC");

  console.log("\nSchedule details per beneficiary:");
  for (const addr of Object.keys(perBeneficiary)) {
    const schedules = await vesting.getAllSchedules(addr);
    schedules.forEach((s, i) => {
      console.log(`  ${addr} #${i}: total=${f(s.totalAmount)} released=${f(s.released)} start=${new Date(Number(s.startTime) * 1000).toISOString().slice(0, 10)} cliffDays=${(Number(s.cliff) / 86400).toFixed(0)} durationDays=${(Number(s.duration) / 86400).toFixed(0)} revoked=${s.revoked}`);
    });
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
