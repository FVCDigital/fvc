const { ethers } = require("hardhat");

async function main() {
  console.log("🎯 Finding Integer Epoch Cap for Exact 10M FVC...");

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
  console.log("Current epoch cap:", ethers.formatUnits(currentRound.epochCap, 6), "USDC");

  // Complete current round if active
  if (currentRound.isActive) {
    console.log("\n🔧 Step 1: Completing current round...");
    await bonding.completeCurrentRound();
    console.log("✅ Current round completed");
  }

  // Find integer epoch cap that gives exactly 10M FVC
  console.log("\n🧮 Step 2: Finding integer epoch cap...");
  const targetFVCCapacity = ethers.parseUnits("10000000", 18); // 10M FVC
  const discountMultiplier = BigInt(120); // 100 + 20%
  
  // Try different epoch caps to find one that gives exactly 10M FVC
  let bestEpochCap = BigInt(0);
  let bestFVCCapacity = BigInt(0);
  let minDifference = BigInt(Number.MAX_SAFE_INTEGER);

  for (let i = 8333000; i <= 8334000; i++) {
    const testEpochCap = ethers.parseUnits(i.toString(), 6);
    const testFVCCapacity = testEpochCap * discountMultiplier / BigInt(100) * BigInt(1e12);
    const difference = testFVCCapacity > targetFVCCapacity 
      ? testFVCCapacity - targetFVCCapacity 
      : targetFVCCapacity - testFVCCapacity;
    
    if (difference < minDifference) {
      minDifference = difference;
      bestEpochCap = testEpochCap;
      bestFVCCapacity = testFVCCapacity;
    }
  }

  console.log("Best epoch cap found:", ethers.formatUnits(bestEpochCap, 6), "USDC");
  console.log("Best FVC capacity:", ethers.formatUnits(bestFVCCapacity, 18));
  console.log("Difference from target:", ethers.formatUnits(minDifference, 18));

  // If we didn't find a good one, use the original calculation
  if (bestEpochCap === BigInt(0)) {
    console.log("Using fallback calculation...");
    bestEpochCap = ethers.parseUnits("8333333", 6);
    bestFVCCapacity = bestEpochCap * discountMultiplier / BigInt(100) * BigInt(1e12);
    minDifference = bestFVCCapacity > targetFVCCapacity 
      ? bestFVCCapacity - targetFVCCapacity 
      : targetFVCCapacity - bestFVCCapacity;
    
    console.log("Fallback epoch cap:", ethers.formatUnits(bestEpochCap, 6), "USDC");
    console.log("Fallback FVC capacity:", ethers.formatUnits(bestFVCCapacity, 18));
    console.log("Fallback difference:", ethers.formatUnits(minDifference, 18));
  }

  // Set new round with best epoch cap
  console.log("\n🎯 Step 3: Setting new round with best epoch cap...");
  const NEW_INITIAL_DISCOUNT = 20;
  const NEW_FINAL_DISCOUNT = 10;
  const NEW_EPOCH_CAP = bestEpochCap;
  const NEW_WALLET_CAP = ethers.parseUnits("1000000", 6);
  const NEW_VESTING_PERIOD = 90 * 24 * 60 * 60;

  await bonding.startNewRound(
    NEW_INITIAL_DISCOUNT,
    NEW_FINAL_DISCOUNT,
    NEW_EPOCH_CAP,
    NEW_WALLET_CAP,
    NEW_VESTING_PERIOD
  );

  console.log("✅ New round started with best parameters:");
  console.log("  - Initial discount:", NEW_INITIAL_DISCOUNT + "%");
  console.log("  - Final discount:", NEW_FINAL_DISCOUNT + "%");
  console.log("  - Epoch cap:", ethers.formatUnits(NEW_EPOCH_CAP, 6), "USDC");
  console.log("  - Target FVC:", ethers.formatUnits(targetFVCCapacity, 18), "FVC");
  console.log("  - Actual FVC:", ethers.formatUnits(bestFVCCapacity, 18), "FVC");
  console.log("  - Wallet cap:", ethers.formatUnits(NEW_WALLET_CAP, 6), "USDC");
  console.log("  - Vesting period:", NEW_VESTING_PERIOD / (24 * 60 * 60), "days");

  // Verify the new round
  console.log("\n📊 Step 4: Verifying new round...");
  const newRound = await bonding.getCurrentRound();
  console.log("New Round ID:", newRound.roundId.toString());
  console.log("New Round Active:", newRound.isActive);
  console.log("New Epoch Cap:", ethers.formatUnits(newRound.epochCap, 6), "USDC");

  // Calculate expected FVC from the new cap
  const expectedFVCSold = newRound.epochCap * BigInt(100 + NEW_INITIAL_DISCOUNT) / BigInt(100) * BigInt(1e12);
  console.log("Expected FVC that can be sold:", ethers.formatUnits(expectedFVCSold, 18));

  // Final verification
  const difference = expectedFVCSold > targetFVCCapacity 
    ? expectedFVCSold - targetFVCCapacity 
    : targetFVCCapacity - expectedFVCSold;
  
  console.log("\n🎯 FINAL VERIFICATION:");
  console.log("Expected FVC:", ethers.formatUnits(expectedFVCSold, 18));
  console.log("Target FVC:", ethers.formatUnits(targetFVCCapacity, 18));
  console.log("Difference:", ethers.formatUnits(difference, 18));
  console.log("Difference is minimal:", difference < ethers.parseUnits("1", 18));

  if (difference < ethers.parseUnits("1", 18)) {
    console.log("\n🎉 SUCCESS! Near-exact 10M FVC allocation achieved!");
    console.log("✅ Rounding error minimized");
    console.log("✅ Trading card will show very close to 10M FVC total");
    console.log("✅ FVC Bought + FVC Remaining ≈ 10,000,000 FVC");
  } else {
    console.log("\n❌ FAILED! Still have significant rounding errors");
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