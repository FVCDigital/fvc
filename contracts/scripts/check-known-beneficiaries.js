/* Read-only: schedules for known beneficiaries + totalVesting reconciliation. */
const { ethers } = require("ethers");

const RPC = process.env.ETHEREUM_MAINNET_RPC || "https://eth-mainnet.g.alchemy.com/v2/6tgWso4UXVZmfMyP0ErKJ";
const VESTING = "0x24263Dce127Ad06cC272897629d6688Ec54df389";

const KNOWN = [
  "0x020fd3bDCB2716B15c5ac0D2B242f26a5c54AcA6",
  "0x0322bf11bCd9F8393EB233c5dF3a4b19aae95FA9",
];

const abi = [
  "function totalVesting() view returns (uint256)",
  "function scheduleCount(address) view returns (uint256)",
  "function getAllSchedules(address) view returns (tuple(uint256 totalAmount,uint256 released,uint256 startTime,uint256 cliff,uint256 duration,bool revoked)[])",
  "function owner() view returns (address)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC);
  const v = new ethers.Contract(VESTING, abi, provider);
  const f = (x) => Number(ethers.formatEther(x)).toLocaleString("en-US");

  const [totalVesting, owner] = await Promise.all([v.totalVesting(), v.owner()]);
  console.log("vesting owner:      ", owner);
  console.log("totalVesting:       ", f(totalVesting), "FVC committed\n");

  let sum = 0n;
  for (const addr of KNOWN) {
    const count = await v.scheduleCount(addr);
    console.log(`${addr}  schedules: ${count}`);
    if (count > 0n) {
      const schedules = await v.getAllSchedules(addr);
      schedules.forEach((s, i) => {
        sum += s.totalAmount;
        console.log(`  #${i}: total=${f(s.totalAmount)} released=${f(s.released)} start=${new Date(Number(s.startTime) * 1000).toISOString().slice(0, 10)} cliffDays=${(Number(s.cliff) / 86400).toFixed(0)} durationDays=${(Number(s.duration) / 86400).toFixed(0)} revoked=${s.revoked}`);
      });
    }
  }
  console.log("\nSum of known schedules:", f(sum), "FVC");
  console.log("Unaccounted (totalVesting - known):", f(totalVesting - sum), "FVC");
}

main().catch((e) => { console.error(e); process.exit(1); });
