/**
 * Tests a vested purchase on Sepolia.
 * Requires vestingThreshold to already be set to 0 via Gnosis Safe.
 *
 * Run: npx ts-node contracts/scripts/test-vesting-sepolia.ts
 */
import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

const SALE_ADDRESS    = "0x685866FA0841e918C3452Fe480eFD792bA912088";
const VESTING_ADDRESS = "0x068D068e92F5725697Ca838388e2F76536a3fAf7";
const FVC_ADDRESS     = "0x52F7608fC35AefDa12B3b66131E9554f64e72eC9";
const USDC_ADDRESS    = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const AMOUNT_USDC     = ethers.parseUnits("2", 6); // 2 USDC

const SALE_ABI = [
  "function buy(address stable, uint256 amount) external",
  "function vestingThreshold() view returns (uint256)",
];
const VESTING_ABI = [
  "function scheduleCount(address) view returns (uint256)",
  "function getVestingSchedule(address, uint256) view returns (tuple(uint256 totalAmount, uint256 released, uint256 startTime, uint256 cliff, uint256 duration, bool revoked))",
  "function releasableAmount(address, uint256) view returns (uint256)",
];
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address) view returns (uint256)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider(
    process.env.ETHEREUM_SEPOLIA_RPC || "https://ethereum-sepolia-rpc.publicnode.com"
  );
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider);
  console.log("Wallet:", wallet.address);

  const sale    = new ethers.Contract(SALE_ADDRESS,    SALE_ABI,    wallet);
  const vesting = new ethers.Contract(VESTING_ADDRESS, VESTING_ABI, provider);
  const usdc    = new ethers.Contract(USDC_ADDRESS,    ERC20_ABI,   wallet);
  const fvc     = new ethers.Contract(FVC_ADDRESS,     ERC20_ABI,   provider);

  const threshold = await sale.vestingThreshold();
  console.log("vestingThreshold:", ethers.formatUnits(threshold, 6), "USDC");
  // threshold=1 means vest everything (0 disables vesting in the contract)
  if (threshold > BigInt(50000000000)) {
    console.error("\n⚠️  vestingThreshold is > $50k. Lower it first so the test purchase triggers vesting.");
    process.exit(1);
  }

  const fvcBefore = await fvc.balanceOf(wallet.address);
  const schedulesBefore = await vesting.scheduleCount(wallet.address);
  console.log("\nFVC in wallet before:    ", ethers.formatEther(fvcBefore));
  console.log("Vesting schedules before:", schedulesBefore.toString());

  console.log("\nApproving 2 USDC...");
  const approveTx = await usdc.approve(SALE_ADDRESS, AMOUNT_USDC);
  await approveTx.wait();

  console.log("Buying 2 USDC worth of FVC (should be vested)...");
  const buyTx = await sale.buy(USDC_ADDRESS, AMOUNT_USDC);
  await buyTx.wait();
  console.log("Tx:", buyTx.hash);

  const fvcAfter = await fvc.balanceOf(wallet.address);
  const schedulesAfter = await vesting.scheduleCount(wallet.address);
  console.log("\nFVC in wallet after:     ", ethers.formatEther(fvcAfter));
  console.log("Vesting schedules after: ", schedulesAfter.toString());

  if (fvcAfter > fvcBefore) {
    console.error("\n✗ FVC landed in wallet — vesting did NOT trigger. Check threshold.");
    process.exit(1);
  }

  if (Number(schedulesAfter) <= Number(schedulesBefore)) {
    console.error("\n✗ No new vesting schedule created. Something is wrong.");
    process.exit(1);
  }

  const scheduleId = Number(schedulesAfter) - 1;
  const schedule = await vesting.getVestingSchedule(wallet.address, scheduleId);
  const releasable = await vesting.releasableAmount(wallet.address, scheduleId);

  const cliffEnd = new Date(Number(schedule.startTime + schedule.cliff) * 1000).toISOString().split("T")[0];
  const vestEnd  = new Date(Number(schedule.startTime + schedule.duration) * 1000).toISOString().split("T")[0];

  console.log(`\n✓ Vesting schedule #${scheduleId} created`);
  console.log("  totalAmount: ", ethers.formatEther(schedule.totalAmount), "FVC");
  console.log("  releasable:  ", ethers.formatEther(releasable), "FVC (should be 0 — before cliff)");
  console.log("  cliff ends:  ", cliffEnd);
  console.log("  vesting ends:", vestEnd);
  console.log("  revoked:     ", schedule.revoked);

  console.log("\n✓ Vesting test passed. Tokens are locked in the Vesting contract.");
}

main().catch(console.error);
