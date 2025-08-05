const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Verifying 10M FVC Round...");

  // Get signers
  const signers = await ethers.getSigners();
  const admin = signers[0];

  // Load contract factories
  const Bonding = await ethers.getContractFactory("Bonding");
  const BONDING_ADDRESS = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";
  const bonding = Bonding.attach(BONDING_ADDRESS);

  console.log("📋 Current State:");
  console.log("Admin address:", admin.address);

  // Check current round
  console.log("\n🔍 Current Round State:");
  const currentRound = await bonding.getCurrentRound();
  console.log("Round ID:", currentRound.roundId.toString());
  console.log("Round active:", currentRound.isActive);
  console.log("Epoch cap:", ethers.formatUnits(currentRound.epochCap, 6), "USDC");
  console.log("Initial discount:", currentRound.initialDiscount.toString() + "%");
  console.log("Final discount:", currentRound.finalDiscount.toString() + "%");
  console.log("Wallet cap:", ethers.formatUnits(currentRound.walletCap, 6), "USDC");

  // Check if round is active
  console.log("\n🔍 Round Status:");
  if (!currentRound.isActive) {
    console.log("⚠️ Round is not active! Need to start it.");
    
    // Start the round
    console.log("\n🎯 Starting the round...");
    try {
      await bonding.startNextRound();
      console.log("✅ Round started successfully");
    } catch (error) {
      console.log("❌ Failed to start round:", error.message);
    }
  } else {
    console.log("✅ Round is active");
  }

  // Check the round again after starting
  console.log("\n📊 Updated Round State:");
  const updatedRound = await bonding.getCurrentRound();
  console.log("Round ID:", updatedRound.roundId.toString());
  console.log("Round active:", updatedRound.isActive);
  console.log("Epoch cap:", ethers.formatUnits(updatedRound.epochCap, 6), "USDC");
  console.log("Initial discount:", updatedRound.initialDiscount.toString() + "%");
  console.log("Final discount:", updatedRound.finalDiscount.toString() + "%");

  // Calculate expected FVC from the epoch cap
  const expectedFVCSold = updatedRound.epochCap * BigInt(100 + Number(updatedRound.initialDiscount)) / BigInt(100) * BigInt(1e12);
  console.log("Expected FVC that can be sold:", ethers.formatUnits(expectedFVCSold, 18));

  console.log("\n🎯 Target vs Actual:");
  console.log("Target FVC: 10,000,000");
  console.log("Actual FVC capacity:", ethers.formatUnits(expectedFVCSold, 18));

  if (expectedFVCSold.toString() === ethers.parseUnits("10000000", 18).toString()) {
    console.log("✅ SUCCESS! Round is set for exactly 10M FVC");
  } else {
    console.log("❌ FAILED! Round is not set for 10M FVC");
    console.log("Need to manually set the epoch cap");
  }

  console.log("\n🔗 Safe URL: https://safe.global/app/amoy:0x7f1EE89fDB16b57930b7F53Bb998f25d917F35D9");
  console.log("🔍 Explorer: https://www.oklink.com/amoy/address/0x7f1EE89fDB16b57930b7F53Bb998f25d917F35D9");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 