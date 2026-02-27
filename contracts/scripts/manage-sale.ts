import { ethers } from "hardhat";

/**
 * Sale Contract Management Script
 *
 * All functions are onlyOwner — the owner is the beneficiary (Gnosis Safe)
 * set during Sale deployment. The deployer private key must correspond to
 * the Safe address, or this must be run via a Safe transaction proposal.
 *
 * For direct execution (e.g. testnet where deployer == owner):
 *   npx hardhat run scripts/manage-sale.ts --network <network>
 *
 * For Gnosis Safe (mainnet):
 *   Use the encoded calldata from this script in a Safe transaction.
 *   Or use Safe's Transaction Builder with the function signatures below.
 *
 * Required env vars:
 *   SALE_ADDRESS  — deployed Sale contract address
 */

async function main() {
  const SALE_ADDRESS = process.env.SALE_ADDRESS;
  if (!SALE_ADDRESS) throw new Error("Set SALE_ADDRESS env var");

  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);

  const sale = await ethers.getContractAt("Sale", SALE_ADDRESS);
  const owner = await sale.owner();
  console.log("Sale owner:", owner);
  console.log("Current rate:", (await sale.rate()).toString());
  console.log("Current cap:", ethers.formatUnits(await sale.cap(), 6), "USDC");
  console.log("Raised:", ethers.formatUnits(await sale.raised(), 6), "USDC");
  console.log("Active:", await sale.active());
  console.log();

  const ACTION = process.env.ACTION;

  switch (ACTION) {
    // ─────────────────────────────────────────────
    // SET RATE
    // ─────────────────────────────────────────────
    case "setRate": {
      const newRate = process.env.NEW_RATE;
      if (!newRate) throw new Error("Set NEW_RATE env var (e.g. 50000 for $0.05)");

      console.log(`Setting rate to ${newRate} (${Number(newRate) / 1e6} USDC per FVC)...`);
      const tx = await sale.setRate(newRate);
      await tx.wait();
      console.log("Done. New rate:", (await sale.rate()).toString());
      break;
    }

    // ─────────────────────────────────────────────
    // SET CAP
    // ─────────────────────────────────────────────
    case "setCap": {
      const newCap = process.env.NEW_CAP;
      if (!newCap) throw new Error("Set NEW_CAP env var (in USDC with 6 decimals, e.g. 20000000000000 for 20M)");

      console.log(`Setting cap to ${ethers.formatUnits(newCap, 6)} USDC...`);
      const tx = await sale.setCap(newCap);
      await tx.wait();
      console.log("Done. New cap:", ethers.formatUnits(await sale.cap(), 6), "USDC");
      break;
    }

    // ─────────────────────────────────────────────
    // ACTIVATE / DEACTIVATE
    // ─────────────────────────────────────────────
    case "activate": {
      console.log("Activating sale...");
      const tx = await sale.setActive(true);
      await tx.wait();
      console.log("Sale is now ACTIVE");
      break;
    }

    case "deactivate": {
      console.log("Deactivating sale...");
      const tx = await sale.setActive(false);
      await tx.wait();
      console.log("Sale is now INACTIVE");
      break;
    }

    // ─────────────────────────────────────────────
    // ACCEPT TOKEN
    // ─────────────────────────────────────────────
    case "acceptToken": {
      const tokenAddr = process.env.TOKEN_ADDRESS;
      const decimals = process.env.TOKEN_DECIMALS || "6";
      if (!tokenAddr) throw new Error("Set TOKEN_ADDRESS env var");

      console.log(`Accepting token ${tokenAddr} (${decimals} decimals)...`);
      const tx = await sale.setAcceptedToken(tokenAddr, true, Number(decimals));
      await tx.wait();
      console.log("Done.");
      break;
    }

    // ─────────────────────────────────────────────
    // CONFIGURE VESTING
    // ─────────────────────────────────────────────
    case "setVesting": {
      const vestingAddr = process.env.VESTING_ADDRESS;
      const threshold = process.env.VESTING_THRESHOLD || "50000000000"; // 50k USDC
      const cliff = process.env.VESTING_CLIFF || String(180 * 86400);
      const duration = process.env.VESTING_DURATION || String(730 * 86400);
      if (!vestingAddr) throw new Error("Set VESTING_ADDRESS env var");

      console.log(`Configuring vesting: threshold=${ethers.formatUnits(threshold, 6)} USDC, cliff=${Number(cliff)/86400} days, duration=${Number(duration)/86400} days`);
      const tx = await sale.setVestingConfig(vestingAddr, threshold, cliff, duration);
      await tx.wait();
      console.log("Done.");
      break;
    }

    // ─────────────────────────────────────────────
    // GENERATE CALLDATA (for Gnosis Safe Transaction Builder)
    // ─────────────────────────────────────────────
    case "calldata": {
      const saleInterface = sale.interface;
      console.log("Gnosis Safe Transaction Builder calldata:");
      console.log();
      console.log("setRate(50000)  — $0.05 per FVC:");
      console.log(saleInterface.encodeFunctionData("setRate", [50_000]));
      console.log();
      console.log("setRate(25000)  — $0.025 per FVC:");
      console.log(saleInterface.encodeFunctionData("setRate", [25_000]));
      console.log();
      console.log("setActive(true):");
      console.log(saleInterface.encodeFunctionData("setActive", [true]));
      console.log();
      console.log("setActive(false):");
      console.log(saleInterface.encodeFunctionData("setActive", [false]));
      console.log();
      console.log("setCap(20000000000000)  — 20M USDC:");
      console.log(saleInterface.encodeFunctionData("setCap", [ethers.parseUnits("20000000", 6)]));
      break;
    }

    // ─────────────────────────────────────────────
    // STATUS (default)
    // ─────────────────────────────────────────────
    default: {
      console.log("No ACTION specified. Showing status only.");
      console.log();
      console.log("Available actions (set ACTION env var):");
      console.log("  ACTION=setRate NEW_RATE=50000          — Set price to $0.05/FVC");
      console.log("  ACTION=setRate NEW_RATE=25000          — Set price to $0.025/FVC");
      console.log("  ACTION=setCap NEW_CAP=20000000000000   — Set cap to 20M USDC");
      console.log("  ACTION=activate                        — Turn sale on");
      console.log("  ACTION=deactivate                      — Turn sale off");
      console.log("  ACTION=acceptToken TOKEN_ADDRESS=0x...  — Accept a stablecoin");
      console.log("  ACTION=setVesting VESTING_ADDRESS=0x... — Configure vesting");
      console.log("  ACTION=calldata                        — Generate Gnosis Safe calldata");
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
