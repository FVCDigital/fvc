import { ethers } from "hardhat";
import Safe from "@safe-global/protocol-kit";
import SafeApiKit from "@safe-global/api-kit";

/**
 * Propose OTC Mint to Safe
 * 
 * This script proposes a mintOTC transaction to your Gnosis Safe.
 * You sign it, then your colleague approves in the Safe UI.
 * 
 * Required env vars:
 *   SAFE_ADDRESS       - Your Gnosis Safe address
 *   SALE_ADDRESS       - Sale contract address
 *   RECIPIENT          - Investor wallet address
 *   AMOUNT             - FVC amount (not wei)
 *   CLIFF_DAYS         - Cliff in days
 *   VEST_DAYS          - Total vesting duration in days
 * 
 * Example:
 *   SAFE_ADDRESS=0xYourSafe... \
 *   SALE_ADDRESS=0xSale... \
 *   RECIPIENT=0xInvestor... \
 *   AMOUNT=2000000 \
 *   CLIFF_DAYS=180 \
 *   VEST_DAYS=730 \
 *   npx hardhat run scripts/propose-otc.ts --network mainnet
 */

async function main() {
  const SAFE_ADDRESS = process.env.SAFE_ADDRESS;
  const SALE_ADDRESS = process.env.SALE_ADDRESS;
  const RECIPIENT = process.env.RECIPIENT;
  const AMOUNT_FVC = process.env.AMOUNT;
  const CLIFF_DAYS = process.env.CLIFF_DAYS;
  const VEST_DAYS = process.env.VEST_DAYS;

  if (!SAFE_ADDRESS || !SALE_ADDRESS || !RECIPIENT || !AMOUNT_FVC || 
      CLIFF_DAYS === undefined || VEST_DAYS === undefined) {
    console.error("❌ Missing required environment variables:\n");
    console.error("   SAFE_ADDRESS=0x...   (your Gnosis Safe)");
    console.error("   SALE_ADDRESS=0x...   (Sale contract)");
    console.error("   RECIPIENT=0x...      (investor wallet)");
    console.error("   AMOUNT=1000000       (FVC amount)");
    console.error("   CLIFF_DAYS=180       (cliff in days)");
    console.error("   VEST_DAYS=730        (vest duration in days)");
    process.exit(1);
  }

  const [signer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  // Determine Safe Transaction Service URL based on network
  const safeServiceUrls: Record<number, string> = {
    1: "https://safe-transaction-mainnet.safe.global",
    11155111: "https://safe-transaction-sepolia.safe.global",
    137: "https://safe-transaction-polygon.safe.global",
    56: "https://safe-transaction-bsc.safe.global",
  };

  const serviceUrl = safeServiceUrls[chainId];
  if (!serviceUrl) {
    console.error(`❌ Safe Transaction Service not available for chain ${chainId}`);
    process.exit(1);
  }

  const amountWei = ethers.parseEther(AMOUNT_FVC);
  const cliffSeconds = BigInt(Number(CLIFF_DAYS) * 86400);
  const durationSeconds = BigInt(Number(VEST_DAYS) * 86400);

  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║              PROPOSE OTC MINT TO SAFE                      ║");
  console.log("╠════════════════════════════════════════════════════════════╣");
  console.log(`║  Network:    ${network.name.padEnd(44)}║`);
  console.log(`║  Safe:       ${SAFE_ADDRESS.substring(0,20)}...${SAFE_ADDRESS.substring(38).padEnd(19)}║`);
  console.log(`║  Proposer:   ${signer.address.substring(0,20)}...${signer.address.substring(38).padEnd(19)}║`);
  console.log("╠════════════════════════════════════════════════════════════╣");
  console.log(`║  Recipient:  ${RECIPIENT.substring(0,20)}...${RECIPIENT.substring(38).padEnd(19)}║`);
  console.log(`║  Amount:     ${Number(AMOUNT_FVC).toLocaleString().padEnd(42)}FVC ║`);
  console.log(`║  Cliff:      ${CLIFF_DAYS.toString().padEnd(44)}days ║`);
  console.log(`║  Duration:   ${VEST_DAYS.toString().padEnd(44)}days ║`);
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  // Encode the mintOTC call
  const sale = await ethers.getContractAt("Sale", SALE_ADDRESS);
  const mintOTCData = sale.interface.encodeFunctionData("mintOTC", [
    RECIPIENT,
    amountWei,
    cliffSeconds,
    durationSeconds
  ]);

  console.log("🔐 Initializing Safe SDK...");

  // Get the provider and signer
  const provider = signer.provider!;
  
  // Initialize Safe Protocol Kit
  const safeSdk = await Safe.init({
    provider: provider,
    signer: await signer.getAddress(),
    safeAddress: SAFE_ADDRESS
  });

  // Initialize Safe API Kit
  const apiKit = new SafeApiKit({
    chainId: BigInt(chainId)
  });

  console.log("📝 Creating transaction...");

  // Create the transaction
  const safeTransaction = await safeSdk.createTransaction({
    transactions: [{
      to: SALE_ADDRESS,
      value: "0",
      data: mintOTCData
    }]
  });

  console.log("✍️  Signing transaction...");

  // Sign the transaction
  const signedTx = await safeSdk.signTransaction(safeTransaction);
  const safeTxHash = await safeSdk.getTransactionHash(signedTx);

  console.log("📤 Proposing to Safe Transaction Service...");

  // Propose the transaction
  await apiKit.proposeTransaction({
    safeAddress: SAFE_ADDRESS,
    safeTransactionData: signedTx.data,
    safeTxHash,
    senderAddress: signer.address,
    senderSignature: signedTx.encodedSignatures()
  });

  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║                    ✅ PROPOSED                             ║");
  console.log("╠════════════════════════════════════════════════════════════╣");
  console.log(`║  Safe Tx Hash: ${safeTxHash.substring(0,42)}...║`);
  console.log("╠════════════════════════════════════════════════════════════╣");
  console.log("║  Next steps:                                               ║");
  console.log("║  1. Your colleague opens Safe UI                           ║");
  console.log("║  2. They see the pending transaction                       ║");
  console.log("║  3. They approve + execute                                 ║");
  console.log("╠════════════════════════════════════════════════════════════╣");

  const safeUrl = chainId === 1 
    ? `https://app.safe.global/transactions/queue?safe=eth:${SAFE_ADDRESS}`
    : chainId === 11155111
    ? `https://app.safe.global/transactions/queue?safe=sep:${SAFE_ADDRESS}`
    : `https://app.safe.global/transactions/queue?safe=${SAFE_ADDRESS}`;
  
  console.log(`║  Safe UI: ${safeUrl.substring(0,48)}...║`);
  console.log("╚════════════════════════════════════════════════════════════╝\n");
}

main().catch((e) => {
  console.error("❌ Error:", e.message || e);
  process.exit(1);
});
