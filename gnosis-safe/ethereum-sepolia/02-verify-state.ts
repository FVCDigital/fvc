/**
 * Reads and prints full on-chain state of the Ethereum Sepolia deployment.
 * Run: npx ts-node gnosis-safe/ethereum-sepolia/02-verify-state.ts
 */
import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config({ path: "contracts/.env" });

const SALE_ADDRESS    = "0x685866FA0841e918C3452Fe480eFD792bA912088";
const VESTING_ADDRESS = "0xc4b6d70Fd384CA3CAD335e45a041717b56622737";
const FVC_ADDRESS     = "0x52F7608fC35AefDa12B3b66131E9554f64e72eC9";
const USDC_ADDRESS    = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

const SALE_ABI = [
  "function active() view returns (bool)",
  "function rate() view returns (uint256)",
  "function cap() view returns (uint256)",
  "function raised() view returns (uint256)",
  "function vestingThreshold() view returns (uint256)",
  "function defaultCliff() view returns (uint256)",
  "function defaultDuration() view returns (uint256)",
  "function vestingContract() view returns (address)",
  "function isAccepted(address) view returns (bool)",
  "function owner() view returns (address)",
  "function beneficiary() view returns (address)",
];
const VESTING_ABI = [
  "function owner() view returns (address)",
  "function scheduleCount(address) view returns (uint256)",
  "function getAllSchedules(address) view returns (tuple(uint256 totalAmount, uint256 released, uint256 startTime, uint256 cliff, uint256 duration, bool revoked)[])",
  "function releasableAmount(address, uint256) view returns (uint256)",
];
const FVC_ABI = [
  "function totalSupply() view returns (uint256)",
  "function cap() view returns (uint256)",
  "function hasRole(bytes32, address) view returns (bool)",
  "function MINTER_ROLE() view returns (bytes32)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider(
    process.env.ETHEREUM_SEPOLIA_RPC || "https://ethereum-sepolia-rpc.publicnode.com"
  );

  const sale    = new ethers.Contract(SALE_ADDRESS,    SALE_ABI,    provider);
  const vesting = new ethers.Contract(VESTING_ADDRESS, VESTING_ABI, provider);
  const fvc     = new ethers.Contract(FVC_ADDRESS,     FVC_ABI,     provider);

  const minterRole = await fvc.MINTER_ROLE();

  const [
    active, rate, saleCap, raised, threshold, cliff, duration,
    vestingAddr, usdcAccepted, saleOwner, beneficiary,
    vestingOwner, hasMinter, totalSupply, fvcCap,
  ] = await Promise.all([
    sale.active(), sale.rate(), sale.cap(), sale.raised(),
    sale.vestingThreshold(), sale.defaultCliff(), sale.defaultDuration(),
    sale.vestingContract(), sale.isAccepted(USDC_ADDRESS),
    sale.owner(), sale.beneficiary(),
    vesting.owner(),
    fvc.hasRole(minterRole, SALE_ADDRESS),
    fvc.totalSupply(), fvc.cap(),
  ]);

  console.log("\n=== ETHEREUM SEPOLIA — FVC DEPLOYMENT STATE ===\n");

  console.log("FVC Token");
  console.log("  address:      ", FVC_ADDRESS);
  console.log("  totalSupply:  ", ethers.formatEther(totalSupply), "FVC");
  console.log("  cap:          ", ethers.formatEther(fvcCap), "FVC");
  console.log("  remaining:    ", ethers.formatEther(fvcCap - totalSupply), "FVC");
  console.log("  MINTER→Sale:  ", hasMinter ? "✓" : "✗ MISSING");

  console.log("\nSale Contract");
  console.log("  address:      ", SALE_ADDRESS);
  console.log("  owner:        ", saleOwner);
  console.log("  beneficiary:  ", beneficiary);
  console.log("  active:       ", active ? "✓ OPEN" : "✗ PAUSED");
  console.log("  rate:         ", rate.toString(), `($${(1e6 / Number(rate)).toFixed(4)}/FVC)`);
  console.log("  cap:          ", ethers.formatUnits(saleCap, 6), "USDC");
  console.log("  raised:       ", ethers.formatUnits(raised, 6), "USDC");
  console.log("  USDC accepted:", usdcAccepted ? "✓" : "✗");
  console.log("  vestingContract:", vestingAddr);
  console.log("  vestingThreshold:", ethers.formatUnits(threshold, 6), "USDC",
    threshold === 0n ? "(ALL purchases vested)" : "");
  console.log("  defaultCliff: ", (Number(cliff) / 86400).toFixed(0), "days");
  console.log("  defaultDuration:", (Number(duration) / 86400).toFixed(0), "days");

  console.log("\nVesting Contract");
  console.log("  address:      ", VESTING_ADDRESS);
  console.log("  owner:        ", vestingOwner,
    vestingOwner.toLowerCase() === SALE_ADDRESS.toLowerCase() ? "✓" : "✗ SHOULD BE SALE");

  // If a wallet address is passed as arg, show its schedules
  const target = process.argv[2];
  if (target) {
    console.log(`\nVesting schedules for ${target}`);
    const count = await vesting.scheduleCount(target);
    console.log("  scheduleCount:", count.toString());
    if (count > 0n) {
      const schedules = await vesting.getAllSchedules(target);
      for (let i = 0; i < schedules.length; i++) {
        const s = schedules[i];
        const releasable = await vesting.releasableAmount(target, i);
        const cliffEnd = new Date(Number(s.startTime + s.cliff) * 1000).toISOString().split("T")[0];
        const vestEnd  = new Date(Number(s.startTime + s.duration) * 1000).toISOString().split("T")[0];
        console.log(`\n  Schedule #${i}`);
        console.log("    totalAmount: ", ethers.formatEther(s.totalAmount), "FVC");
        console.log("    released:    ", ethers.formatEther(s.released), "FVC");
        console.log("    releasable:  ", ethers.formatEther(releasable), "FVC");
        console.log("    cliff ends:  ", cliffEnd);
        console.log("    vesting ends:", vestEnd);
        console.log("    revoked:     ", s.revoked);
      }
    }
  }

  console.log("\n===============================================\n");
}

main().catch(console.error);
