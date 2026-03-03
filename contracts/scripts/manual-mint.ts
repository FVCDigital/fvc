import { ethers } from "hardhat";

/**
 * Manual Mint Script
 * 
 * Usage: Provide recipient address and amount, then execute via Gnosis Safe
 * 
 * Example: 
 *   RECIPIENT=0x123... AMOUNT=1000000 npx hardhat run scripts/manual-mint.ts --network polygon-amoy
 */

async function main() {
  const RECIPIENT = process.env.RECIPIENT;
  const AMOUNT_FVC = process.env.AMOUNT; // in FVC units (not wei)
  const FVC_ADDRESS = process.env.FVC_ADDRESS || "0xE288F7BB9E7F27512A41651399c68FBAf33f27B9";

  if (!RECIPIENT || !AMOUNT_FVC) {
    console.error("❌ Missing required environment variables:");
    console.error("   RECIPIENT=0x... (wallet to receive FVC)");
    console.error("   AMOUNT=1000000 (FVC amount, not wei)");
    console.error("\nExample:");
    console.error('   RECIPIENT=0x123... AMOUNT=1000000 npx hardhat run scripts/manual-mint.ts --network bsc-testnet');
    process.exit(1);
  }

  if (!ethers.isAddress(RECIPIENT)) {
    console.error(`❌ Invalid recipient address: ${RECIPIENT}`);
    process.exit(1);
  }

  const amountInWei = ethers.parseEther(AMOUNT_FVC);

  console.log("\n=== Manual Mint Transaction ===");
  console.log("FVC Contract:", FVC_ADDRESS);
  console.log("Recipient:   ", RECIPIENT);
  console.log("Amount:      ", AMOUNT_FVC, "FVC");
  console.log("Amount (wei):", amountInWei.toString());
  console.log("================================\n");

  const fvc = await ethers.getContractAt("FVC", FVC_ADDRESS);

  // Encode the mint call
  const mintCalldata = fvc.interface.encodeFunctionData("mint", [RECIPIENT, amountInWei]);

  console.log("✅ Transaction Data for Gnosis Safe:");
  console.log("\nTo:", FVC_ADDRESS);
  console.log("Value: 0");
  console.log("Data:", mintCalldata);
  console.log("\n=================================");
  console.log("Copy the above data and execute via Gnosis Safe UI");
  console.log("=================================\n");

  // If running from a wallet with MINTER_ROLE (not Safe), execute directly
  const [signer] = await ethers.getSigners();
  const hasMinterRole = await fvc.hasRole(await fvc.MINTER_ROLE(), signer.address);

  if (hasMinterRole) {
    console.log("🔑 Signer has MINTER_ROLE, executing directly...");
    const tx = await fvc.mint(RECIPIENT, amountInWei);
    console.log("Transaction hash:", tx.hash);
    console.log("Waiting for confirmation...");
    await tx.wait();
    console.log("✅ Minted", AMOUNT_FVC, "FVC to", RECIPIENT);
  } else {
    console.log("⚠️  Signer does not have MINTER_ROLE");
    console.log("Execute the transaction via Gnosis Safe with the data above");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
