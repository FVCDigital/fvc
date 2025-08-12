const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Debugging New Round Creation...");

  // Get signers
  const signers = await ethers.getSigners();
  const admin = signers[0];

  // Load contract factories
  const Bonding = await ethers.getContractFactory("Bonding");
  const BONDING_ADDRESS = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";
  const bonding = Bonding.attach(BONDING_ADDRESS);

  console.log("📋 Contract State:");
  console.log("Bonding address:", BONDING_ADDRESS);
  console.log("Admin address:", admin.address);

  // Check current round state
  console.log("\n🔍 Current Round State:");
  try {
    const currentRound = await bonding.getCurrentRound();
    console.log("Current round:", currentRound);
    console.log("Round active:", currentRound.isActive);
    console.log("Round ID:", currentRound.roundId.toString());
  } catch (error) {
    console.log("❌ Error reading current round:", error.message);
  }

  // Check if admin has owner role
  console.log("\n👑 Admin Permissions:");
  try {
    const owner = await bonding.owner();
    console.log("Contract owner:", owner);
    console.log("Is admin owner:", owner === admin.address);
  } catch (error) {
    console.log("❌ Error checking owner:", error.message);
  }

  // Try to estimate gas for startNewRound
  console.log("\n⛽ Gas Estimation for startNewRound:");
  try {
    const NEW_INITIAL_DISCOUNT = 20;
    const NEW_FINAL_DISCOUNT = 10;
    const NEW_EPOCH_CAP = ethers.parseUnits("10000000", 6);
    const NEW_WALLET_CAP = ethers.parseUnits("1000000", 6);
    const NEW_VESTING_PERIOD = 90 * 24 * 60 * 60;

    const gasEstimate = await bonding.connect(admin).startNewRound.estimateGas(
      NEW_INITIAL_DISCOUNT,
      NEW_FINAL_DISCOUNT,
      NEW_EPOCH_CAP,
      NEW_WALLET_CAP,
      NEW_VESTING_PERIOD
    );
    console.log("Gas estimate for startNewRound:", gasEstimate.toString());
  } catch (error) {
    console.log("❌ Gas estimation failed:", error.message);
  }

  // Check if round is actually completed
  console.log("\n🔍 Checking if round is actually completed:");
  try {
    const currentRound = await bonding.getCurrentRound();
    if (currentRound.isActive) {
      console.log("⚠️ Round is still active, trying to complete again...");
      await bonding.completeCurrentRound();
      console.log("✅ Round completed again");
    } else {
      console.log("✅ Round is already completed");
    }
  } catch (error) {
    console.log("❌ Error completing round:", error.message);
  }

  // Try starting new round with simpler parameters
  console.log("\n🔄 Trying to start new round with simpler parameters:");
  try {
    const SIMPLE_INITIAL_DISCOUNT = 20;
    const SIMPLE_FINAL_DISCOUNT = 10;
    const SIMPLE_EPOCH_CAP = ethers.parseUnits("1000000", 6); // Smaller cap
    const SIMPLE_WALLET_CAP = ethers.parseUnits("100000", 6); // Smaller wallet cap
    const SIMPLE_VESTING_PERIOD = 30 * 24 * 60 * 60; // 30 days

    await bonding.connect(admin).startNewRound(
      SIMPLE_INITIAL_DISCOUNT,
      SIMPLE_FINAL_DISCOUNT,
      SIMPLE_EPOCH_CAP,
      SIMPLE_WALLET_CAP,
      SIMPLE_VESTING_PERIOD
    );
    console.log("✅ Successfully started new round with simpler parameters");
  } catch (error) {
    console.log("❌ Failed to start new round:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 