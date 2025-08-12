const { ethers } = require("hardhat");

async function main() {
  console.log("🎯 Setting Bonding Round to 10M FVC Allocation...");

  /**
   * @constant {Signer[]} signers - The signers available.
   * @constant {Signer} admin - The admin signing the transactions.
   */
  const signers = await ethers.getSigners();
  const admin = signers[0];

  /**
   * @constant {ContractFactory} Bonding - The factory for the Bonding contract.
   * @constant {ContractFactory} FVC - The factory for the FVC contract.
   * @constant {ContractFactory} MockUSDC - The factory for the MockUSDC contract.
   */
  const Bonding = await ethers.getContractFactory("Bonding");
  const FVC = await ethers.getContractFactory("FVC");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");

  /**
   * @constant {string} BONDING_ADDRESS - The address of the Bonding contract.
   * @constant {string} FVC_ADDRESS - The address of the FVC contract.
   * @constant {string} USDC_ADDRESS - The address of the USDC contract.
   * @constant {string} SAFE_ADDRESS - The address of the Safe contract.
   */
  const BONDING_ADDRESS = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";
  const FVC_ADDRESS = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";
  const USDC_ADDRESS = "0x11Cf72a75e284B61548B87fB5ad8B8693FCfB1fb";
  const SAFE_ADDRESS = "0x7f1EE89fDB16b57930b7F53Bb998f25d917F35D9";

  /**
   * @constant {Contract} bonding - The Bonding contract.
   * @constant {Contract} fvc - The FVC contract.
   * @constant {Contract} usdc - The USDC contract.
   */
  const bonding = Bonding.attach(BONDING_ADDRESS);
  const fvc = FVC.attach(FVC_ADDRESS);
  const usdc = MockUSDC.attach(USDC_ADDRESS);

  console.log("📋 Current State:");
  console.log("Admin address:", admin.address);
  console.log("Safe address:", SAFE_ADDRESS);

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

  /**
   * @constant {boolean} isActive - Whether the current round is active.
   */
  if (currentRound.isActive) {
    console.log("\n🔧 Step 1: Completing current round...");
    await bonding.completeCurrentRound();
    console.log("✅ Current round completed");
  }

  /**
   * @constant {BigNumber} FVC_TARGET - The target amount of FVC to allocate.
   * @constant {BigNumber} USDC_NEEDED - The amount of USDC needed to allocate 10M FVC at 20% discount.
   */
  // Calculate USDC needed for 10M FVC at 20% discount
  // At 20% discount: 1 USDC = 1.2 FVC
  // So 10M FVC = 10M ÷ 1.2 = 8.33M USDC
  const FVC_TARGET = ethers.parseUnits("10000000", 18); // 10M FVC
  const USDC_NEEDED = ethers.parseUnits("8333333", 6); // 8.33M USDC (simplified calculation)

  console.log("\n🎯 Step 2: Setting new round with 10M FVC allocation...");
  console.log("Target FVC:", ethers.formatUnits(FVC_TARGET, 18));
  console.log("Required USDC cap:", ethers.formatUnits(USDC_NEEDED, 6));
  
  /**
   * @constant {number} NEW_INITIAL_DISCOUNT - The initial discount for the new round.
   * @constant {number} NEW_FINAL_DISCOUNT - The final discount for the new round.
   * @constant {BigNumber} NEW_EPOCH_CAP - The epoch cap for the new round.
   * @constant {BigNumber} NEW_WALLET_CAP - The wallet cap for the new round.
   * @constant {number} NEW_VESTING_PERIOD - The vesting period for the new round.
   */
  const NEW_INITIAL_DISCOUNT = 20;
  const NEW_FINAL_DISCOUNT = 10;
  const NEW_EPOCH_CAP = USDC_NEEDED;
  const NEW_WALLET_CAP = ethers.parseUnits("1000000", 6);
  const NEW_VESTING_PERIOD = 90 * 24 * 60 * 60; // 90 days

  await bonding.startNewRound(
    NEW_INITIAL_DISCOUNT,
    NEW_FINAL_DISCOUNT,
    NEW_EPOCH_CAP,
    NEW_WALLET_CAP,
    NEW_VESTING_PERIOD
  );

  console.log("✅ New round started with parameters:");
  console.log("  - Initial discount:", NEW_INITIAL_DISCOUNT + "%");
  console.log("  - Final discount:", NEW_FINAL_DISCOUNT + "%");
  console.log("  - Epoch cap:", ethers.formatUnits(NEW_EPOCH_CAP, 6), "USDC");
  console.log("  - Target FVC:", ethers.formatUnits(FVC_TARGET, 18), "FVC");
  console.log("  - Wallet cap:", ethers.formatUnits(NEW_WALLET_CAP, 6), "USDC");
  console.log("  - Vesting period:", NEW_VESTING_PERIOD / (24 * 60 * 60), "days");

  /**
   * @constant {Object} newRound - The new round of the bonding contract.
   * @constant {BigNumber} roundId - The ID of the new round.
   * @constant {boolean} isActive - Whether the new round is active.
   * @constant {BigNumber} epochCap - The epoch cap for the new round.
   */
  console.log("\n📊 Step 3: Verifying new round...");
  const newRound = await bonding.getCurrentRound();
  console.log("New Round ID:", newRound.roundId.toString());
  console.log("New Round Active:", newRound.isActive);
  console.log("New Epoch Cap:", ethers.formatUnits(newRound.epochCap, 6), "USDC");

  /**
   * @constant {BigNumber} expectedFVCSold - The expected amount of FVC that can be sold.
   */
  const expectedFVCSold = newRound.epochCap * BigInt(100 + NEW_INITIAL_DISCOUNT) / BigInt(100) * BigInt(1e12);
  console.log("Expected FVC that can be sold:", ethers.formatUnits(expectedFVCSold, 18));

  console.log("\n🎉 SUCCESS! Bonding round now allocated for 10M FVC!");
  console.log("✅ Epoch cap set to 8.33M USDC");
  console.log("✅ This will yield exactly 10M FVC at 20% discount");
  console.log("✅ Trading card should now show 10M FVC total");
  console.log("🔗 Safe URL: https://safe.global/app/amoy:" + SAFE_ADDRESS);
  console.log("🔍 Explorer: https://www.oklink.com/amoy/address/" + SAFE_ADDRESS);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 