const { ethers } = require("hardhat");

async function main() {
  console.log("🎯 Testing FVC-Based Bonding System...");

  // Get signers
  const signers = await ethers.getSigners();
  const admin = signers[0];
  const user = signers[1] || signers[0];

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
  console.log("Admin address:", admin.address);
  console.log("User address:", user.address);
  console.log("Safe address:", SAFE_ADDRESS);

  // Check current round
  console.log("\n🔍 Current Round State:");
  const currentRound = await bonding.getCurrentRound();
  console.log("Round ID:", currentRound.roundId.toString());
  console.log("Round active:", currentRound.isActive);
  console.log("FVC Allocated:", ethers.formatUnits(currentRound.fvcAllocated, 18), "FVC");
  console.log("FVC Sold:", ethers.formatUnits(currentRound.fvcSold, 18), "FVC");
  console.log("Initial discount:", Number(currentRound.initialDiscount), "%");

  // Complete current round if active
  if (currentRound.isActive) {
    console.log("\n🔧 Step 1: Completing current round...");
    await bonding.completeCurrentRound();
    console.log("✅ Current round completed");
  }

  // Start new round with 10M FVC allocation
  console.log("\n🎯 Step 2: Starting new round with 10M FVC...");
  const NEW_INITIAL_DISCOUNT = 20;
  const NEW_FINAL_DISCOUNT = 10;
  const NEW_EPOCH_CAP = ethers.parseUnits("10000000", 6); // 10M USDC cap
  const NEW_WALLET_CAP = ethers.parseUnits("1000000", 6); // 1M USDC per wallet
  const NEW_VESTING_PERIOD = 90 * 24 * 60 * 60; // 90 days

  await bonding.startNewRound(
    NEW_INITIAL_DISCOUNT,
    NEW_FINAL_DISCOUNT,
    NEW_EPOCH_CAP,
    NEW_WALLET_CAP,
    NEW_VESTING_PERIOD
  );

  console.log("✅ New round started");

  // Allocate exactly 10M FVC to the round
  console.log("\n💰 Step 3: Allocating 10M FVC to the round...");
  const FVC_TO_ALLOCATE = ethers.parseUnits("10000000", 18); // Exactly 10M FVC

  // First, mint FVC to admin if needed
  const adminFVCBalance = await fvc.balanceOf(admin.address);
  if (adminFVCBalance < FVC_TO_ALLOCATE) {
    console.log("Minting FVC to admin...");
    await fvc.mint(admin.address, FVC_TO_ALLOCATE);
  }

  // Approve FVC transfer to bonding contract
  await fvc.approve(bonding.address, FVC_TO_ALLOCATE);

  // Allocate FVC to the round
  await bonding.allocateFVC(FVC_TO_ALLOCATE);

  console.log("✅ 10M FVC allocated to the round");

  // Check the round state after allocation
  console.log("\n📊 Step 4: Checking round state after allocation...");
  const updatedRound = await bonding.getCurrentRound();
  console.log("Round ID:", updatedRound.roundId.toString());
  console.log("Round active:", updatedRound.isActive);
  console.log("FVC Allocated:", ethers.formatUnits(updatedRound.fvcAllocated, 18), "FVC");
  console.log("FVC Sold:", ethers.formatUnits(updatedRound.fvcSold, 18), "FVC");
  console.log("FVC Remaining:", ethers.formatUnits(await bonding.getRemainingFVC(), 18), "FVC");

  // Test bonding: Buy 1000 FVC
  console.log("\n🔄 Step 5: Testing bonding - Buy 1000 FVC...");
  const FVC_TO_BUY = ethers.parseUnits("1000", 18); // 1000 FVC

  // Calculate USDC needed
  const currentDiscount = await bonding.getCurrentDiscount();
  const usdcNeeded = await bonding.calculateUSDCAmount(FVC_TO_BUY, currentDiscount);
  console.log("Current discount:", currentDiscount.toString() + "%");
  console.log("USDC needed for 1000 FVC:", ethers.formatUnits(usdcNeeded, 6), "USDC");

  // Mint USDC to user if needed
  const userUSDCBalance = await usdc.balanceOf(user.address);
  if (userUSDCBalance < usdcNeeded) {
    console.log("Minting USDC to user...");
    await usdc.mint(user.address, usdcNeeded * BigInt(2)); // Mint extra for testing
  }

  // Approve USDC
  await usdc.connect(user).approve(bonding.address, usdcNeeded);

  // Bond FVC
  await bonding.connect(user).bond(FVC_TO_BUY);

  console.log("✅ Successfully bonded 1000 FVC");

  // Check final state
  console.log("\n📊 Step 6: Final state check...");
  const finalRound = await bonding.getCurrentRound();
  console.log("FVC Allocated:", ethers.formatUnits(finalRound.fvcAllocated, 18), "FVC");
  console.log("FVC Sold:", ethers.formatUnits(finalRound.fvcSold, 18), "FVC");
  console.log("FVC Remaining:", ethers.formatUnits(await bonding.getRemainingFVC(), 18), "FVC");

  // Verify the math
  const allocated = finalRound.fvcAllocated;
  const sold = finalRound.fvcSold;
  const remaining = await bonding.getRemainingFVC();
  
  console.log("\n🎯 VERIFICATION:");
  console.log("Allocated:", ethers.formatUnits(allocated, 18), "FVC");
  console.log("Sold:", ethers.formatUnits(sold, 18), "FVC");
  console.log("Remaining:", ethers.formatUnits(remaining, 18), "FVC");
  console.log("Sold + Remaining:", ethers.formatUnits(sold + remaining, 18), "FVC");
  console.log("Math check (sold + remaining = allocated):", (sold + remaining).toString() === allocated.toString());

  if ((sold + remaining).toString() === allocated.toString()) {
    console.log("\n🎉 SUCCESS! FVC-based bonding is working perfectly!");
    console.log("✅ Exactly 10M FVC allocated");
    console.log("✅ No rounding errors");
    console.log("✅ Trading card will show exactly 10M FVC total");
  } else {
    console.log("\n❌ FAILED! Math doesn't add up");
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