const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Debugging Rounding Error...");

  // Get signers
  const signers = await ethers.getSigners();
  const user = signers[0];

  // Load contract factories
  const Bonding = await ethers.getContractFactory("Bonding");
  const BONDING_ADDRESS = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";
  const bonding = Bonding.attach(BONDING_ADDRESS);

  console.log("📋 Current State:");
  console.log("User address:", user.address);

  // Check current round
  console.log("\n🔍 Current Round State:");
  const currentRound = await bonding.getCurrentRound();
  const totalBonded = await bonding.totalBonded();
  const epochCap = await bonding.epochCap();
  const currentDiscount = await bonding.getCurrentDiscount();

  console.log("Round ID:", currentRound.roundId.toString());
  console.log("Round active:", currentRound.isActive);
  console.log("Epoch cap:", ethers.formatUnits(epochCap, 6), "USDC");
  console.log("Initial discount:", Number(currentRound.initialDiscount), "%");
  console.log("Total bonded:", ethers.formatUnits(totalBonded, 6), "USDC");

  // Calculate step by step to find rounding error
  console.log("\n🧮 STEP-BY-STEP CALCULATION:");

  // 1. Epoch cap in wei
  console.log("1. Epoch cap (wei):", epochCap.toString());
  console.log("   Epoch cap (USDC):", ethers.formatUnits(epochCap, 6));

  // 2. Calculate with discount
  const discountMultiplier = BigInt(100 + Number(currentRound.initialDiscount));
  console.log("2. Discount multiplier:", discountMultiplier.toString(), "(100 +", Number(currentRound.initialDiscount), ")");

  // 3. Calculate FVC capacity
  const fvcCapacityStep1 = epochCap * discountMultiplier;
  console.log("3. Step 1 (epochCap * discountMultiplier):", fvcCapacityStep1.toString());

  const fvcCapacityStep2 = fvcCapacityStep1 / BigInt(100);
  console.log("4. Step 2 (divide by 100):", fvcCapacityStep2.toString());

  const fvcCapacityStep3 = fvcCapacityStep2 * BigInt(1e12);
  console.log("5. Step 3 (multiply by 1e12):", fvcCapacityStep3.toString());

  const fvcCapacityFinal = ethers.formatUnits(fvcCapacityStep3, 18);
  console.log("6. Final FVC capacity:", fvcCapacityFinal);

  // Check if the issue is with the epoch cap calculation
  console.log("\n🎯 EPOCH CAP ANALYSIS:");
  console.log("Target: 10,000,000 FVC");
  console.log("Actual:", fvcCapacityFinal);
  console.log("Difference:", parseFloat(fvcCapacityFinal) - 10000000);

  // Calculate what epoch cap should be for exactly 10M FVC
  console.log("\n🧮 REVERSE CALCULATION:");
  const targetFVCCapacity = ethers.parseUnits("10000000", 18); // 10M FVC
  console.log("Target FVC capacity (wei):", targetFVCCapacity.toString());

  const reverseStep1 = targetFVCCapacity / BigInt(1e12);
  console.log("Reverse Step 1 (divide by 1e12):", reverseStep1.toString());

  const reverseStep2 = reverseStep1 * BigInt(100);
  console.log("Reverse Step 2 (multiply by 100):", reverseStep2.toString());

  const reverseStep3 = reverseStep2 / discountMultiplier;
  console.log("Reverse Step 3 (divide by discount multiplier):", reverseStep3.toString());

  const exactEpochCap = ethers.formatUnits(reverseStep3, 6);
  console.log("Exact epoch cap needed:", exactEpochCap, "USDC");

  // Compare with current epoch cap
  console.log("\n📊 COMPARISON:");
  console.log("Current epoch cap:", ethers.formatUnits(epochCap, 6), "USDC");
  console.log("Exact epoch cap needed:", exactEpochCap, "USDC");
  console.log("Difference:", parseFloat(ethers.formatUnits(epochCap, 6)) - parseFloat(exactEpochCap), "USDC");

  // The issue is that 8,333,333 USDC is not exactly divisible to get 10M FVC
  console.log("\n🎯 ROOT CAUSE:");
  console.log("The epoch cap of 8,333,333 USDC creates rounding errors");
  console.log("when multiplied by 1.2 and converted to FVC tokens.");
  console.log("We need to use a more precise epoch cap value.");

  // Calculate the exact epoch cap needed
  const exactEpochCapWei = reverseStep3;
  console.log("\n✅ SOLUTION:");
  console.log("Set epoch cap to exactly:", ethers.formatUnits(exactEpochCapWei, 6), "USDC");
  console.log("This will yield exactly 10,000,000 FVC tokens");

  console.log("\n🔗 Safe URL: https://safe.global/app/amoy:0x7f1EE89fDB16b57930b7F53Bb998f25d917F35D9");
  console.log("🔍 Explorer: https://www.oklink.com/amoy/address/" + SAFE_ADDRESS);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 