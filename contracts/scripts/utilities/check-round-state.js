const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking Round State...");

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
  console.log("Initial discount:", Number(currentRound.initialDiscount), "%");
  console.log("Final discount:", Number(currentRound.finalDiscount), "%");
  console.log("Wallet cap:", ethers.formatUnits(currentRound.walletCap, 6), "USDC");
  console.log("Vesting period:", Number(currentRound.vestingPeriod) / (24 * 60 * 60), "days");
  console.log("Total bonded:", ethers.formatUnits(currentRound.totalBonded, 6), "USDC");

  // Check if round is active
  if (!currentRound.isActive) {
    console.log("\n⚠️ Round is not active! Starting it...");
    try {
      await bonding.startNextRound();
      console.log("✅ Round started successfully");
    } catch (error) {
      console.log("❌ Failed to start round:", error.message);
    }
  } else {
    console.log("\n✅ Round is active");
  }

  // Check the round again after starting
  console.log("\n📊 Updated Round State:");
  const updatedRound = await bonding.getCurrentRound();
  console.log("Round ID:", updatedRound.roundId.toString());
  console.log("Round active:", updatedRound.isActive);
  console.log("Epoch cap:", ethers.formatUnits(updatedRound.epochCap, 6), "USDC");
  console.log("Initial discount:", Number(updatedRound.initialDiscount), "%");
  console.log("Final discount:", Number(updatedRound.finalDiscount), "%");

  // Calculate expected FVC from the epoch cap
  const expectedFVCSold = updatedRound.epochCap * BigInt(100 + Number(updatedRound.initialDiscount)) / BigInt(100) * BigInt(1e12);
  console.log("Expected FVC that can be sold:", ethers.formatUnits(expectedFVCSold, 18));

  console.log("\n🎯 Analysis:");
  console.log("Target FVC: 10,000,000");
  console.log("Actual FVC capacity:", ethers.formatUnits(expectedFVCSold, 18));
  console.log("Difference:", parseFloat(ethers.formatUnits(expectedFVCSold, 18)) - 10000000);

  console.log("\n🔗 Safe URL: https://safe.global/app/amoy:0x7f1EE89fDB16b57930b7F53Bb998f25d917F35D9");
  console.log("🔍 Explorer: https://www.oklink.com/amoy/address/0x7f1EE89fDB16b57930b7F53Bb998f25d917F35D9");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 