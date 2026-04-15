import { ethers } from "hardhat";
import Safe from "@safe-global/protocol-kit";
import SafeApiKit from "@safe-global/api-kit";
import * as readline from "readline";

/**
 * FVC Seed Investor Terminal
 * 
 * Run: npx hardhat run scripts/otc-ui.ts --network mainnet
 * Or:  fvc-otc (if installed via install.sh)
 */

// ═══════════════════════════════════════════════════════════════
// CONFIGURE THESE FOR YOUR DEPLOYMENT
// ═══════════════════════════════════════════════════════════════
const CONFIG = {
  SAFE_ADDRESS: "0xE20c89da2138951655DbbbE6E6db01fe561EBe82",
  SALE_ADDRESS: "0xdf95824ae269c62427a5925231b970aa43d709d1", // Sale with allowlist
};

const PRESETS = {
  "seed-standard": { cliff: 180, vest: 540, label: "Seed Standard (6mo cliff, 18mo vest)" },
  "seed-aggressive": { cliff: 180, vest: 730, label: "Seed Long (6mo cliff, 24mo vest)" },
  "strategic": { cliff: 90, vest: 365, label: "Strategic (3mo cliff, 12mo vest)" },
  "advisor": { cliff: 180, vest: 730, label: "Advisor (6mo cliff, 24mo vest)" },
  "no-vest": { cliff: 0, vest: 0, label: "No Vesting (immediate unlock)" },
};

const PRICE_PRESETS: Record<string, { rate: number; label: string }> = {
  "1": { rate: 20000, label: "$0.02 per FVC" },
  "2": { rate: 25000, label: "$0.025 per FVC" },
  "3": { rate: 30000, label: "$0.03 per FVC" },
  "4": { rate: 0, label: "Use default contract rate" },
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

function clear() {
  console.clear();
}

function header() {
  console.log("\n");
  console.log("  ╔══════════════════════════════════════════╗");
  console.log("  ║                                          ║");
  console.log("  ║        FVC SEED INVESTOR TERMINAL        ║");
  console.log("  ║                                          ║");
  console.log("  ╚══════════════════════════════════════════╝");
  console.log("\n");
}

async function main() {
  clear();
  header();

  const [signer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  console.log(`  Network:  ${network.name} (${chainId})`);
  console.log(`  Signer:   ${signer.address}`);
  console.log(`  Safe:     ${CONFIG.SAFE_ADDRESS}`);
  console.log(`  Sale:     ${CONFIG.SALE_ADDRESS}`);
  console.log("\n  ─────────────────────────────────────────────────────────\n");

  const saleAddress = CONFIG.SALE_ADDRESS;

  // Main menu
  console.log("  What would you like to do?\n");
  console.log("    [1] Add investor to allowlist - they buy via UI with custom terms");
  console.log("    [2] Mint OTC - you received payment, mint tokens directly");
  console.log("    [q] Quit\n");

  const action = await ask("  Select: ");

  if (action === "q" || action === "Q") {
    rl.close();
    return;
  }

  if (action === "1") {
    await addToAllowlist(signer, saleAddress, chainId);
    rl.close();
    return;
  }

  // Default to OTC mint (action === "2" or anything else)
  
  // Get investor details
  console.log("\n  📋 INVESTOR DETAILS\n");
  
  const recipient = await ask("  Investor Wallet Address: ");
  if (!ethers.isAddress(recipient)) {
    console.log("\n  ❌ Invalid address");
    rl.close();
    return;
  }

  const amountStr = await ask("  FVC Amount (e.g. 2000000): ");
  const amount = Number(amountStr.replace(/,/g, ""));
  if (isNaN(amount) || amount <= 0) {
    console.log("\n  ❌ Invalid amount");
    rl.close();
    return;
  }

  // Show presets
  console.log("\n  📅 VESTING TERMS\n");
  console.log("  Choose a preset or enter custom:\n");
  
  let i = 1;
  for (const [key, preset] of Object.entries(PRESETS)) {
    console.log(`    [${i}] ${preset.label}`);
    i++;
  }
  console.log(`    [${i}] Custom terms`);
  
  const choice = await ask("\n  Select (1-6): ");
  
  let cliffDays: number;
  let vestDays: number;
  
  const presetKeys = Object.keys(PRESETS);
  const choiceNum = parseInt(choice);
  
  if (choiceNum >= 1 && choiceNum <= presetKeys.length) {
    const preset = PRESETS[presetKeys[choiceNum - 1] as keyof typeof PRESETS];
    cliffDays = preset.cliff;
    vestDays = preset.vest;
    console.log(`\n  ✓ Selected: ${preset.label}`);
  } else {
    cliffDays = parseInt(await ask("  Cliff (days): "));
    vestDays = parseInt(await ask("  Total vesting duration (days): "));
  }

  if (cliffDays > vestDays && vestDays > 0) {
    console.log("\n  ❌ Cliff cannot exceed duration");
    rl.close();
    return;
  }

  // Confirm
  console.log("\n  ─────────────────────────────────────────────────────────\n");
  console.log("  📝 TRANSACTION SUMMARY\n");
  console.log(`    Recipient:   ${recipient}`);
  console.log(`    Amount:      ${amount.toLocaleString()} FVC`);
  console.log(`    Cliff:       ${cliffDays} days`);
  console.log(`    Duration:    ${vestDays} days`);
  if (vestDays > 0) {
    console.log(`    Schedule:    Linear unlock over ${vestDays - cliffDays} days after cliff`);
  } else {
    console.log(`    Schedule:    Immediate unlock (no vesting)`);
  }
  console.log("\n  ─────────────────────────────────────────────────────────\n");

  const confirm = await ask("  Propose to Safe? (y/n): ");
  if (confirm.toLowerCase() !== "y") {
    console.log("\n  Cancelled.\n");
    rl.close();
    return;
  }

  // Execute
  console.log("\n  🔐 Initializing Safe SDK...");

  const amountWei = ethers.parseEther(amount.toString());
  const cliffSeconds = BigInt(cliffDays * 86400);
  const durationSeconds = BigInt(vestDays * 86400);

  const sale = await ethers.getContractAt("Sale", saleAddress);
  const mintOTCData = sale.interface.encodeFunctionData("mintOTC", [
    recipient,
    amountWei,
    cliffSeconds,
    durationSeconds
  ]);

  try {
    const safeSdk = await Safe.init({
      provider: signer.provider!,
      signer: await signer.getAddress(),
      safeAddress: CONFIG.SAFE_ADDRESS
    });

    const apiKit = new SafeApiKit({
      chainId: BigInt(chainId)
    });

    console.log("  📝 Creating transaction...");

    const safeTransaction = await safeSdk.createTransaction({
      transactions: [{
        to: saleAddress,
        value: "0",
        data: mintOTCData
      }]
    });

    console.log("  ✍️  Signing with your key...");

    const signedTx = await safeSdk.signTransaction(safeTransaction);
    const safeTxHash = await safeSdk.getTransactionHash(signedTx);

    console.log("  📤 Proposing to Safe...");

    await apiKit.proposeTransaction({
      safeAddress: CONFIG.SAFE_ADDRESS,
      safeTransactionData: signedTx.data,
      safeTxHash,
      senderAddress: signer.address,
      senderSignature: signedTx.encodedSignatures()
    });

    const safeUrl = chainId === 1 
      ? `https://app.safe.global/transactions/queue?safe=eth:${CONFIG.SAFE_ADDRESS}`
      : chainId === 11155111
      ? `https://app.safe.global/transactions/queue?safe=sep:${CONFIG.SAFE_ADDRESS}`
      : `https://app.safe.global/transactions/queue?safe=${CONFIG.SAFE_ADDRESS}`;

    console.log("\n  ─────────────────────────────────────────────────────────\n");
    console.log("  ✅ PROPOSED SUCCESSFULLY\n");
    console.log(`    Safe Tx: ${safeTxHash.substring(0, 20)}...`);
    console.log(`\n    👉 Send this to your colleague:`);
    console.log(`    ${safeUrl}\n`);
    console.log("  ─────────────────────────────────────────────────────────\n");

  } catch (e: any) {
    console.log(`\n  ❌ Error: ${e.message}\n`);
  }

  rl.close();
}

async function addToAllowlist(signer: any, saleAddress: string, chainId: number) {
  console.log("\n  ═══════════════════════════════════════════════════════════");
  console.log("             ADD INVESTOR TO ALLOWLIST                        ");
  console.log("  ═══════════════════════════════════════════════════════════\n");

  const investor = await ask("  Investor Wallet Address: ");
  if (!ethers.isAddress(investor)) {
    console.log("\n  ❌ Invalid address");
    return;
  }

  const maxAmountStr = await ask("  Max Investment (USD, e.g. 50000): ");
  const maxAmount = Number(maxAmountStr.replace(/,/g, "")) * 1e6; // Convert to 6 decimals

  // Price selection
  console.log("\n  💰 PRICE\n");
  for (const [key, preset] of Object.entries(PRICE_PRESETS)) {
    console.log(`    [${key}] ${preset.label}`);
  }
  console.log(`    [5] Custom price`);

  const priceChoice = await ask("\n  Select: ");
  let rate: number;

  if (priceChoice in PRICE_PRESETS) {
    rate = PRICE_PRESETS[priceChoice].rate;
  } else {
    const customPrice = await ask("  Price per FVC (e.g. 0.02): ");
    rate = Math.round(Number(customPrice) * 1e6);
  }

  // Vesting selection
  console.log("\n  📅 VESTING TERMS\n");
  let i = 1;
  for (const [key, preset] of Object.entries(PRESETS)) {
    console.log(`    [${i}] ${preset.label}`);
    i++;
  }
  console.log(`    [${i}] Custom terms`);

  const vestChoice = await ask("\n  Select (1-6): ");
  let cliffDays: number;
  let vestDays: number;

  const presetKeys = Object.keys(PRESETS);
  const vestChoiceNum = parseInt(vestChoice);

  if (vestChoiceNum >= 1 && vestChoiceNum <= presetKeys.length) {
    const preset = PRESETS[presetKeys[vestChoiceNum - 1] as keyof typeof PRESETS];
    cliffDays = preset.cliff;
    vestDays = preset.vest;
    console.log(`\n  ✓ Selected: ${preset.label}`);
  } else {
    cliffDays = parseInt(await ask("  Cliff (days): "));
    vestDays = parseInt(await ask("  Total vesting duration (days): "));
  }

  // Summary
  console.log("\n  ─────────────────────────────────────────────────────────\n");
  console.log("  📝 ALLOWLIST ENTRY SUMMARY\n");
  console.log(`    Investor:    ${investor}`);
  console.log(`    Max Amount:  $${(maxAmount / 1e6).toLocaleString()}`);
  console.log(`    Price:       ${rate > 0 ? '$' + (rate / 1e6).toFixed(4) + '/FVC' : 'Default contract rate'}`);
  console.log(`    Cliff:       ${cliffDays} days`);
  console.log(`    Duration:    ${vestDays} days`);
  console.log("\n  ─────────────────────────────────────────────────────────\n");

  const confirm = await ask("  Propose to Safe? (y/n): ");
  if (confirm.toLowerCase() !== "y") {
    console.log("\n  Cancelled.\n");
    return;
  }

  // Encode setInvestorTerms call
  const cliffSeconds = BigInt(cliffDays * 86400);
  const durationSeconds = BigInt(vestDays * 86400);

  const saleInterface = new ethers.Interface([
    "function setInvestorTerms(address investor, uint256 maxAmount, uint256 customRate, uint256 cliff, uint256 duration) external"
  ]);

  const calldata = saleInterface.encodeFunctionData("setInvestorTerms", [
    investor,
    BigInt(Math.round(maxAmount)),
    BigInt(rate),
    cliffSeconds,
    durationSeconds
  ]);

  console.log("\n  🔐 Initializing Safe SDK...");

  try {
    const safeSdk = await Safe.init({
      provider: signer.provider!,
      signer: await signer.getAddress(),
      safeAddress: CONFIG.SAFE_ADDRESS
    });

    const apiKit = new SafeApiKit({
      chainId: BigInt(chainId)
    });

    console.log("  📝 Creating transaction...");

    const safeTransaction = await safeSdk.createTransaction({
      transactions: [{
        to: saleAddress,
        value: "0",
        data: calldata
      }]
    });

    console.log("  ✍️  Signing with your key...");

    const signedTx = await safeSdk.signTransaction(safeTransaction);
    const safeTxHash = await safeSdk.getTransactionHash(signedTx);

    console.log("  📤 Proposing to Safe...");

    await apiKit.proposeTransaction({
      safeAddress: CONFIG.SAFE_ADDRESS,
      safeTransactionData: signedTx.data,
      safeTxHash,
      senderAddress: signer.address,
      senderSignature: signedTx.encodedSignatures()
    });

    const prefix = chainId === 1 ? "eth" : chainId === 11155111 ? "sep" : "eth";
    const safeUrl = `https://app.safe.global/transactions/queue?safe=${prefix}:${CONFIG.SAFE_ADDRESS}`;

    console.log("\n  ─────────────────────────────────────────────────────────\n");
    console.log("  ✅ PROPOSED SUCCESSFULLY\n");
    console.log(`    Safe Tx: ${safeTxHash.substring(0, 20)}...`);
    console.log(`\n    👉 Send this to your colleague to approve:`);
    console.log(`    ${safeUrl}\n`);
    console.log("  ─────────────────────────────────────────────────────────\n");
    console.log("  Once approved, investor can go to the buy UI and their");
    console.log("  custom terms will be automatically applied.\n");

  } catch (e: any) {
    console.log(`\n  ❌ Error: ${e.message}\n`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
