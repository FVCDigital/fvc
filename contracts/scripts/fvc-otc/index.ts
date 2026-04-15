#!/usr/bin/env node
import { ethers } from "ethers";
import Safe from "@safe-global/protocol-kit";
import SafeApiKit from "@safe-global/api-kit";
import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// ═══════════════════════════════════════════════════════════════
// CONFIG - Edit these or use config file
// ═══════════════════════════════════════════════════════════════
const CONFIG_PATH = path.join(os.homedir(), ".fvc-otc.json");

interface Config {
  privateKey: string;
  rpcUrl: string;
  safeAddress: string;
  saleAddress: string;
  chainId: number;
}

const DEFAULT_CONFIG: Config = {
  privateKey: "",
  rpcUrl: "https://eth.llamarpc.com",
  safeAddress: "",
  saleAddress: "",
  chainId: 1,
};

const PRESETS = {
  "1": { cliff: 180, vest: 540, label: "Seed Standard (6mo cliff, 18mo vest)" },
  "2": { cliff: 180, vest: 730, label: "Seed Long (6mo cliff, 24mo vest)" },
  "3": { cliff: 90, vest: 365, label: "Strategic (3mo cliff, 12mo vest)" },
  "4": { cliff: 180, vest: 730, label: "Advisor (6mo cliff, 24mo vest)" },
  "5": { cliff: 0, vest: 0, label: "No Vesting (immediate unlock)" },
};

const SALE_ABI = [
  "function mintOTC(address recipient, uint256 fvcAmount, uint256 cliff, uint256 duration) external",
];

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
  console.log(`
  ╔══════════════════════════════════════════╗
  ║                                          ║
  ║        FVC SEED INVESTOR TERMINAL        ║
  ║                                          ║
  ╚══════════════════════════════════════════╝
`);
}

function loadConfig(): Config {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    }
  } catch {}
  return DEFAULT_CONFIG;
}

function saveConfig(config: Config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  fs.chmodSync(CONFIG_PATH, 0o600); // Only owner can read
}

async function configure(): Promise<Config> {
  console.log("\n  ⚙️  FIRST TIME SETUP\n");
  console.log("  This will be saved to ~/.fvc-otc.json\n");

  const config: Config = { ...DEFAULT_CONFIG };

  config.privateKey = await ask("  Private Key (starts with 0x): ");
  config.rpcUrl = (await ask("  RPC URL [https://eth.llamarpc.com]: ")) || "https://eth.llamarpc.com";
  config.safeAddress = await ask("  Safe Address: ");
  config.saleAddress = await ask("  Sale Contract Address: ");
  
  const chainInput = await ask("  Chain ID [1 for mainnet, 11155111 for sepolia]: ");
  config.chainId = parseInt(chainInput) || 1;

  saveConfig(config);
  console.log("\n  ✅ Config saved to ~/.fvc-otc.json\n");
  
  return config;
}

async function main() {
  clear();
  header();

  let config = loadConfig();

  // Check if we need to configure
  if (!config.privateKey || !config.safeAddress || !config.saleAddress) {
    config = await configure();
  }

  // Show current config
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const signer = new ethers.Wallet(config.privateKey, provider);

  console.log(`  Network:  Chain ${config.chainId}`);
  console.log(`  Signer:   ${signer.address}`);
  console.log(`  Safe:     ${config.safeAddress}`);
  console.log(`  Sale:     ${config.saleAddress}`);
  console.log("\n  ─────────────────────────────────────────────────────────\n");

  const action = await ask("  [1] New OTC Mint  [2] Reconfigure  [q] Quit: ");
  
  if (action === "2") {
    config = await configure();
  } else if (action === "q" || action === "Q") {
    rl.close();
    return;
  }

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

  for (const [key, preset] of Object.entries(PRESETS)) {
    console.log(`    [${key}] ${preset.label}`);
  }
  console.log(`    [6] Custom terms`);

  const choice = await ask("\n  Select (1-6): ");

  let cliffDays: number;
  let vestDays: number;

  if (choice in PRESETS) {
    const preset = PRESETS[choice as keyof typeof PRESETS];
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

  const sale = new ethers.Contract(config.saleAddress, SALE_ABI, signer);
  const mintOTCData = sale.interface.encodeFunctionData("mintOTC", [
    recipient,
    amountWei,
    cliffSeconds,
    durationSeconds,
  ]);

  try {
    const safeSdk = await Safe.init({
      provider: config.rpcUrl,
      signer: config.privateKey,
      safeAddress: config.safeAddress,
    });

    const apiKit = new SafeApiKit({
      chainId: BigInt(config.chainId),
    });

    console.log("  📝 Creating transaction...");

    const safeTransaction = await safeSdk.createTransaction({
      transactions: [
        {
          to: config.saleAddress,
          value: "0",
          data: mintOTCData,
        },
      ],
    });

    console.log("  ✍️  Signing with your key...");

    const signedTx = await safeSdk.signTransaction(safeTransaction);
    const safeTxHash = await safeSdk.getTransactionHash(signedTx);

    console.log("  📤 Proposing to Safe...");

    await apiKit.proposeTransaction({
      safeAddress: config.safeAddress,
      safeTransactionData: signedTx.data,
      safeTxHash,
      senderAddress: signer.address,
      senderSignature: signedTx.encodedSignatures(),
    });

    const prefix = config.chainId === 1 ? "eth" : config.chainId === 11155111 ? "sep" : "eth";
    const safeUrl = `https://app.safe.global/transactions/queue?safe=${prefix}:${config.safeAddress}`;

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

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
