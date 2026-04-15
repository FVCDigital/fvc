import { ethers } from "hardhat";

/**
 * Mint OTC Script - Mint FVC with custom vesting terms
 * 
 * Usage:
 *   RECIPIENT=0x...
 *   AMOUNT=1000000          # FVC amount (not wei)
 *   CLIFF_DAYS=180          # Cliff in days (e.g., 180 = 6 months)
 *   VEST_DAYS=730           # Total vesting duration in days (e.g., 730 = 2 years)
 *   npx hardhat run scripts/mint-otc.ts --network mainnet
 * 
 * Examples:
 *   # Alice: 2M FVC, 6 month cliff, 24 month vest
 *   RECIPIENT=0xAlice... AMOUNT=2000000 CLIFF_DAYS=180 VEST_DAYS=730 npx hardhat run scripts/mint-otc.ts --network mainnet
 * 
 *   # Bob: 500k FVC, 3 month cliff, 12 month vest  
 *   RECIPIENT=0xBob... AMOUNT=500000 CLIFF_DAYS=90 VEST_DAYS=365 npx hardhat run scripts/mint-otc.ts --network mainnet
 * 
 *   # Immediate unlock (no vesting) - set VEST_DAYS=0
 *   RECIPIENT=0x... AMOUNT=100000 CLIFF_DAYS=0 VEST_DAYS=0 npx hardhat run scripts/mint-otc.ts --network mainnet
 */

async function main() {
  const SALE_ADDRESS = process.env.SALE_ADDRESS;
  const RECIPIENT = process.env.RECIPIENT;
  const AMOUNT_FVC = process.env.AMOUNT;
  const CLIFF_DAYS = process.env.CLIFF_DAYS;
  const VEST_DAYS = process.env.VEST_DAYS;

  if (!SALE_ADDRESS || !RECIPIENT || !AMOUNT_FVC || CLIFF_DAYS === undefined || VEST_DAYS === undefined) {
    console.error("❌ Missing required environment variables:\n");
    console.error("   SALE_ADDRESS=0x...   (Sale contract address)");
    console.error("   RECIPIENT=0x...      (investor wallet)");
    console.error("   AMOUNT=1000000       (FVC amount, not wei)");
    console.error("   CLIFF_DAYS=180       (cliff in days, e.g. 180 = 6 months)");
    console.error("   VEST_DAYS=730        (total vest duration in days, e.g. 730 = 2 years)");
    console.error("\nExample:");
    console.error("   SALE_ADDRESS=0x... RECIPIENT=0x... AMOUNT=2000000 CLIFF_DAYS=180 VEST_DAYS=730 npx hardhat run scripts/mint-otc.ts --network mainnet");
    process.exit(1);
  }

  if (!ethers.isAddress(RECIPIENT)) {
    console.error(`❌ Invalid recipient address: ${RECIPIENT}`);
    process.exit(1);
  }

  const amountWei = ethers.parseEther(AMOUNT_FVC);
  const cliffSeconds = BigInt(Number(CLIFF_DAYS) * 86400);
  const durationSeconds = BigInt(Number(VEST_DAYS) * 86400);

  if (Number(CLIFF_DAYS) > Number(VEST_DAYS) && Number(VEST_DAYS) > 0) {
    console.error(`❌ Cliff (${CLIFF_DAYS} days) cannot exceed duration (${VEST_DAYS} days)`);
    process.exit(1);
  }

  const [signer] = await ethers.getSigners();
  
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║                    MINT OTC - FVC SALE                     ║");
  console.log("╠════════════════════════════════════════════════════════════╣");
  console.log(`║  Network:     ${(await ethers.provider.getNetwork()).name.padEnd(43)}║`);
  console.log(`║  Signer:      ${signer.address.substring(0,20)}...${signer.address.substring(38).padEnd(18)}║`);
  console.log("╠════════════════════════════════════════════════════════════╣");
  console.log(`║  Recipient:   ${RECIPIENT.substring(0,20)}...${RECIPIENT.substring(38).padEnd(18)}║`);
  console.log(`║  Amount:      ${Number(AMOUNT_FVC).toLocaleString().padEnd(43)}FVC ║`);
  console.log(`║  Cliff:       ${CLIFF_DAYS.padEnd(43)}days ║`);
  console.log(`║  Duration:    ${VEST_DAYS.padEnd(43)}days ║`);
  if (Number(VEST_DAYS) === 0) {
    console.log("║  Vesting:     NO VESTING - immediate unlock                  ║");
  } else {
    console.log(`║  Vesting:     Linear over ${VEST_DAYS} days after ${CLIFF_DAYS} day cliff`.padEnd(62) + "║");
  }
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const sale = await ethers.getContractAt("Sale", SALE_ADDRESS);

  // Check if signer is owner
  const owner = await sale.owner();
  if (owner.toLowerCase() !== signer.address.toLowerCase()) {
    console.log("⚠️  Signer is not Sale owner. Generating calldata for Safe...\n");
    
    const calldata = sale.interface.encodeFunctionData("mintOTC", [
      RECIPIENT,
      amountWei,
      cliffSeconds,
      durationSeconds
    ]);

    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║              GNOSIS SAFE TRANSACTION DATA                  ║");
    console.log("╠════════════════════════════════════════════════════════════╣");
    console.log(`║  To:    ${SALE_ADDRESS.padEnd(50)}║`);
    console.log("║  Value: 0                                                  ║");
    console.log("╠════════════════════════════════════════════════════════════╣");
    console.log("║  Data:                                                     ║");
    console.log("╚════════════════════════════════════════════════════════════╝");
    console.log(calldata);
    console.log("\n→ Copy data above into Safe Transaction Builder\n");
    return;
  }

  // Execute directly
  console.log("🔑 Signer is Sale owner, executing mintOTC directly...\n");

  const tx = await sale.mintOTC(RECIPIENT, amountWei, cliffSeconds, durationSeconds);
  console.log("📤 Transaction submitted:", tx.hash);
  console.log("⏳ Waiting for confirmation...");
  
  const receipt = await tx.wait();
  
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║                    ✅ SUCCESS                              ║");
  console.log("╠════════════════════════════════════════════════════════════╣");
  console.log(`║  Tx Hash:  ${receipt!.hash.substring(0,20)}...${receipt!.hash.substring(58).padEnd(18)}║`);
  console.log(`║  Block:    ${String(receipt!.blockNumber).padEnd(47)}║`);
  console.log(`║  Gas Used: ${String(receipt!.gasUsed).padEnd(47)}║`);
  console.log("╠════════════════════════════════════════════════════════════╣");
  console.log(`║  Minted ${Number(AMOUNT_FVC).toLocaleString()} FVC to ${RECIPIENT.substring(0,10)}...`.padEnd(61) + "║");
  if (Number(VEST_DAYS) > 0) {
    console.log(`║  Vesting: ${CLIFF_DAYS}d cliff, ${VEST_DAYS}d total duration`.padEnd(61) + "║");
  } else {
    console.log("║  No vesting - tokens unlocked immediately                   ║");
  }
  console.log("╚════════════════════════════════════════════════════════════╝\n");
}

main().catch((e) => {
  console.error("❌ Error:", e.message || e);
  process.exit(1);
});
