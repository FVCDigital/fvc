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
const VESTING_ADDRESS = "0xc4b6d70Fd384CA3CAD335e45a041717b56622737";
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
  if (threshold > 0n) {
    console.error("\n⚠️  vestingThreshold is not 0. Set it to 0 via Gnosis Safe first.");
    console.error("   See: gnosis-safe/ethereum-sepolia/01-set-vesting-threshold.txt");
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

  if (schedulesAfter <= schedulesBefore) {
    console.error("\n✗ No new vesting schedule created. Something is wrong.");
    process.exit(1);
  }

  const scheduleId = schedulesAfter - 1n;
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
