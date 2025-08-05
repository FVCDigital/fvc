const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Debugging 10M FVC Calculation...");

  /**
   * @constant {Signer[]} signers - The signers available.
   * @constant {Signer} admin - The admin signing the transactions.
   */
  const signers = await ethers.getSigners();
  const admin = signers[0];

  /**
   * @constant {ContractFactory} Bonding - The factory for the Bonding contract.
   * @constant {string} BONDING_ADDRESS - The address of the Bonding contract.
   * @constant {Contract} bonding - The Bonding contract.
   */
  const Bonding = await ethers.getContractFactory("Bonding");
  const BONDING_ADDRESS = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";
  const bonding = Bonding.attach(BONDING_ADDRESS);

  console.log("📋 Current State:");
  console.log("Admin address:", admin.address);

  /**
   * @constant {Object} currentRound - The current round of the bonding contract.
   * @constant {BigNumber} roundId - The ID of the current round.
   * @constant {boolean} isActive - Whether the current round is active.
   * @constant {BigNumber} epochCap - The epoch cap for the current round.
   */
  console.log("\n🔍 Current Round State:");
  const currentRound = await bonding.getCurrentRound();
  console.log("Round ID:", currentRound.roundId.toString());
  console.log("Round active:", currentRound.isActive);
  console.log("Current epoch cap:", ethers.formatUnits(currentRound.epochCap, 6), "USDC");

  console.log("\n🧮 Calculating USDC needed for 10M FVC:");
  const FVC_TARGET = ethers.parseUnits("10000000", 18); // 10M FVC
  console.log("Target FVC:", ethers.formatUnits(FVC_TARGET, 18));

  /**
   * @constant {BigNumber} USDC_NEEDED - The amount of USDC needed to allocate 10M FVC at 20% discount.
   */
  const USDC_NEEDED = FVC_TARGET * BigInt(100) / BigInt(120) / BigInt(1e12);
  console.log("Calculated USDC needed:", ethers.formatUnits(USDC_NEEDED, 6));

  /**
   * @constant {string} USDC_NEEDED_STRING - The amount of USDC needed as a string.
   * @constant {number} USDC_NEEDED_NUMBER - The amount of USDC needed as a number.
   */
  console.log("USDC_NEEDED as BigInt:", USDC_NEEDED.toString());
  console.log("USDC_NEEDED as number:", Number(USDC_NEEDED));

  /**
   * @constant {BigNumber} USDC_NEEDED_SIMPLE - The amount of USDC needed to allocate 10M FVC at 20% discount.
   */
  console.log("\n🧮 Alternative calculation:");
  const USDC_NEEDED_SIMPLE = ethers.parseUnits("8333333", 6); // 8.33M USDC
  console.log("Simple USDC needed:", ethers.formatUnits(USDC_NEEDED_SIMPLE, 6));

  /**
   * @constant {number} NEW_INITIAL_DISCOUNT - The initial discount for the new round.
   * @constant {number} NEW_FINAL_DISCOUNT - The final discount for the new round.
   * @constant {BigNumber} NEW_EPOCH_CAP - The epoch cap for the new round.
   * @constant {BigNumber} NEW_WALLET_CAP - The wallet cap for the new round.
   * @constant {number} NEW_VESTING_PERIOD - The vesting period for the new round.
   */
  console.log("\n🎯 Testing parameters:");
  const NEW_INITIAL_DISCOUNT = 20;
  const NEW_FINAL_DISCOUNT = 10;
  const NEW_EPOCH_CAP = USDC_NEEDED_SIMPLE;
  const NEW_WALLET_CAP = ethers.parseUnits("1000000", 6);
  const NEW_VESTING_PERIOD = 90 * 24 * 60 * 60;

  console.log("Initial discount:", NEW_INITIAL_DISCOUNT);
  console.log("Final discount:", NEW_FINAL_DISCOUNT);
  console.log("Epoch cap:", ethers.formatUnits(NEW_EPOCH_CAP, 6));
  console.log("Wallet cap:", ethers.formatUnits(NEW_WALLET_CAP, 6));
  console.log("Vesting period:", NEW_VESTING_PERIOD);

  /**
   * @constant {string} owner - The owner of the bonding contract.
   * @constant {boolean} isAdminOwner - Whether the admin is the owner of the bonding contract.
   */
  console.log("\n👑 Admin Permissions:");
  try {
    const owner = await bonding.owner();
    console.log("Contract owner:", owner);
    console.log("Is admin owner:", owner === admin.address);
  } catch (error) {
    console.log("❌ Error checking owner:", error.message);
  }

  /**
   * @constant {BigNumber} gasEstimate - The gas estimate for the startNewRound function.
   */
  console.log("\n⛽ Gas Estimation:");
  try {
    const gasEstimate = await bonding.connect(admin).startNewRound.estimateGas(
      NEW_INITIAL_DISCOUNT,
      NEW_FINAL_DISCOUNT,
      NEW_EPOCH_CAP,
      NEW_WALLET_CAP,
      NEW_VESTING_PERIOD
    );
    console.log("Gas estimate:", gasEstimate.toString());
  } catch (error) {
    console.log("❌ Gas estimation failed:", error.message);
  }

  /**
   * @constant {Object} currentRoundAfter - The current round after the completion.
   * @constant {boolean} isActive - Whether the current round is active after the completion.
   */
  console.log("\n🔍 Checking if round is actually completed:");
  try {
    const currentRoundAfter = await bonding.getCurrentRound();
    console.log("Round active after completion:", currentRoundAfter.isActive);
  } catch (error) {
    console.log("❌ Error checking round:", error.message);
  }

  console.log("\n🎯 Next Steps:");
  console.log("1. Check if round is actually completed");
  console.log("2. Verify admin permissions");
  console.log("3. Try with simpler parameters");
  console.log("4. Check contract validation logic");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 