import { ethers } from "hardhat";

const VESTING = "0x24263Dce127Ad06cC272897629d6688Ec54df389";
const USER = "0x020fd3bDCB2716B15c5ac0D2B242f26a5c54AcA6";

const abi = [
  "function scheduleCount(address) view returns (uint256)",
  "function getAllSchedules(address) view returns (tuple(uint256 totalAmount,uint256 released,uint256 startTime,uint256 cliff,uint256 duration,bool revoked)[])",
  "event VestingScheduleCreated(address indexed beneficiary, uint256 indexed scheduleId, uint256 amount, uint256 startTime, uint256 cliff, uint256 duration)",
];

async function main() {
  const v = new ethers.Contract(VESTING, abi, ethers.provider);

  const count = await v.scheduleCount(USER);
  console.log("scheduleCount for", USER, ":", count.toString());

  if (Number(count) > 0) {
    const schedules = await v.getAllSchedules(USER);
    schedules.forEach((s: any, i: number) => {
      console.log(` schedule ${i}:`, {
        total: ethers.formatEther(s.totalAmount),
        released: ethers.formatEther(s.released),
        start: new Date(Number(s.startTime) * 1000).toISOString(),
        cliffDays: (Number(s.cliff) / 86400).toFixed(1),
        durationDays: (Number(s.duration) / 86400).toFixed(1),
        revoked: s.revoked,
      });
    });
  }

  const latest = await ethers.provider.getBlockNumber();
  const fromBlock = Math.max(0, latest - 500_000); // recent ~70 days
  const logs = await v.queryFilter(v.filters.VestingScheduleCreated(), fromBlock, latest);
  console.log("\nTotal VestingScheduleCreated events:", logs.length);

  const byBeneficiary: Record<string, number> = {};
  for (const log of logs) {
    const beneficiary = log.args?.beneficiary as string;
    byBeneficiary[beneficiary] = (byBeneficiary[beneficiary] || 0) + 1;
  }

  console.log("\nBeneficiaries with at least one schedule:");
  for (const [addr, n] of Object.entries(byBeneficiary)) {
    console.log(`  ${addr} -> ${n} schedule(s)`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
