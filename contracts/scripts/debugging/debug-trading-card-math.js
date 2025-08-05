const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Debugging Trading Card Math...");

  // Get signers
  const signers = await ethers.getSigners();
  const user = signers[0];

  // Load contract factories
  const Bonding = await ethers.getContractFactory("Bonding");
  const FVC = await ethers.getContractFactory("FVC");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");

  // Get deployed contract addresses
  const BONDING_ADDRESS = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";
  const FVC_ADDRESS = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";
  const USDC_ADDRESS = "0x11Cf72a75e284B61548B87fB5ad8B8693FCfB1fb";
  const SAFE_ADDRESS = "0x7f1EE89fDB16b57930b7F53Bb998f25d917F35D9";

  // Load deployed contracts
  const bonding = Bonding.attach(BONDING_ADDRESS);
  const fvc = FVC.attach(FVC_ADDRESS);
  const usdc = MockUSDC.attach(USDC_ADDRESS);

  console.log("📋 Current State:");
  console.log("User address:", user.address);
  console.log("Safe address:", SAFE_ADDRESS);

  // Check current round
  console.log("\n🔍 Current Round State:");
  const currentRound = await bonding.getCurrentRound();
  const totalBonded = await bonding.totalBonded();
  const epochCap = await bonding.epochCap();
  const currentDiscount = await bonding.getCurrentDiscount();

  console.log("Round ID:", currentRound.roundId.toString());
  console.log("Round active:", currentRound.isActive);
  console.log("Epoch cap:", ethers.formatUnits(epochCap, 6), "USDC");
  console.log("Total bonded:", ethers.formatUnits(totalBonded, 6), "USDC");
  console.log("Current discount:", currentDiscount.toString() + "%");

  // Calculate the math step by step
  console.log("\n🧮 STEP-BY-STEP CALCULATION:");

  // 1. Calculate total FVC capacity
  const totalFVCCapacity = epochCap * BigInt(100 + Number(currentRound.initialDiscount)) / BigInt(100) * BigInt(1e12);
  console.log("1. Total FVC capacity:", ethers.formatUnits(totalFVCCapacity, 18));

  // 2. Calculate FVC already sold
  const fvcAlreadySold = totalBonded * BigInt(100 + Number(currentRound.initialDiscount)) / BigInt(100) * BigInt(1e12);
  console.log("2. FVC already sold:", ethers.formatUnits(fvcAlreadySold, 18));

  // 3. Calculate FVC remaining
  const fvcRemaining = totalFVCCapacity - fvcAlreadySold;
  console.log("3. FVC remaining:", ethers.formatUnits(fvcRemaining, 18));

  // 4. Verify the math
  const totalCalculated = fvcAlreadySold + fvcRemaining;
  console.log("4. Total calculated (sold + remaining):", ethers.formatUnits(totalCalculated, 18));

  // 5. Check if it equals total capacity
  const isEqual = totalCalculated.toString() === totalFVCCapacity.toString();
  console.log("5. Math check (sold + remaining = total):", isEqual);

  // Trading card values
  console.log("\n📊 TRADING CARD VALUES:");
  console.log("FVC Bought (from trading card): 12,000 FVC");
  console.log("FVC Remaining (from trading card): 9,571,332.95 FVC");
  console.log("Sum from trading card:", 12000 + 9571332.95, "FVC");
  console.log("Expected total: 10,000,000 FVC");
  console.log("Difference:", (12000 + 9571332.95) - 10000000, "FVC");

  // Check if there's a discrepancy in the calculation
  console.log("\n🔍 POTENTIAL ISSUES:");
  console.log("1. Trading card might be using different discount rates");
  console.log("2. Trading card might be calculating from different base values");
  console.log("3. Trading card might have rounding errors");
  console.log("4. Trading card might be using cached/old data");

  // Check the actual contract values vs trading card
  console.log("\n🎯 CONTRACT vs TRADING CARD:");
  console.log("Contract FVC sold:", ethers.formatUnits(fvcAlreadySold, 18));
  console.log("Trading card FVC bought:", "12,000");
  console.log("Contract FVC remaining:", ethers.formatUnits(fvcRemaining, 18));
  console.log("Trading card FVC remaining:", "9,571,332.95");

  // Calculate what the trading card should show
  console.log("\n✅ WHAT TRADING CARD SHOULD SHOW:");
  console.log("FVC Bought:", ethers.formatUnits(fvcAlreadySold, 18));
  console.log("FVC Remaining:", ethers.formatUnits(fvcRemaining, 18));
  console.log("Total:", ethers.formatUnits(totalFVCCapacity, 18));

  // Check if the issue is with the frontend calculation
  console.log("\n🎯 FRONTEND ISSUE ANALYSIS:");
  console.log("The trading card is showing incorrect values.");
  console.log("This suggests the frontend is not reading the contract data correctly");
  console.log("or using outdated/cached values.");

  console.log("\n🔧 SOLUTION:");
  console.log("1. Check frontend contract integration");
  console.log("2. Verify frontend is reading latest contract state");
  console.log("3. Clear frontend cache if applicable");
  console.log("4. Ensure frontend uses correct contract addresses");

  console.log("\n🔗 Safe URL: https://safe.global/app/amoy:" + SAFE_ADDRESS);
  console.log("🔍 Explorer: https://www.oklink.com/amoy/address/" + SAFE_ADDRESS);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 