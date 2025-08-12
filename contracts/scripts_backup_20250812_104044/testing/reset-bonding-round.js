const { ethers } = require("hardhat");

async function main() {
  console.log("🔄 Resetting Bonding Round for Complete Testing...");

  // Get signers
  const signers = await ethers.getSigners();
  const admin = signers[0];
  const user = signers[0]; // Your Amoy wallet

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

  // Check current balances
  const userUSDCBalance = await usdc.balanceOf(user.address);
  const userFVCBalance = await fvc.balanceOf(user.address);
  const safeUSDCBalance = await usdc.balanceOf(SAFE_ADDRESS);
  const safeFVCBalance = await fvc.balanceOf(SAFE_ADDRESS);

  console.log("\n💰 Current Balances:");
  console.log("User USDC:", ethers.formatUnits(userUSDCBalance, 6));
  console.log("User FVC:", ethers.formatUnits(userFVCBalance, 18));
  console.log("Safe USDC:", ethers.formatUnits(safeUSDCBalance, 6));
  console.log("Safe FVC:", ethers.formatUnits(safeFVCBalance, 18));

  // Check current bonding state
  console.log("\n🔍 Current Bonding State:");
  const currentRound = await bonding.getCurrentRound();
  const totalBonded = await bonding.totalBonded();
  const epochCap = await bonding.epochCap();
  
  console.log("Total bonded:", ethers.formatUnits(totalBonded, 6));
  console.log("Epoch cap:", ethers.formatUnits(epochCap, 6));
  console.log("Round active:", currentRound.isActive);

  // Step 1: Complete current round if active
  if (currentRound.isActive) {
    console.log("\n🔧 Step 1: Completing current round...");
    await bonding.completeCurrentRound();
    console.log("✅ Current round completed");
  }

  // Step 2: Start new round with fresh parameters
  console.log("\n🔄 Step 2: Starting new bonding round...");
  const NEW_INITIAL_DISCOUNT = 20; // 20% discount
  const NEW_FINAL_DISCOUNT = 10; // 10% discount
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
  console.log("✅ New round started with parameters:");
  console.log("  - Initial discount:", NEW_INITIAL_DISCOUNT + "%");
  console.log("  - Final discount:", NEW_FINAL_DISCOUNT + "%");
  console.log("  - Epoch cap:", ethers.formatUnits(NEW_EPOCH_CAP, 6), "USDC");
  console.log("  - Wallet cap:", ethers.formatUnits(NEW_WALLET_CAP, 6), "USDC");
  console.log("  - Vesting period:", NEW_VESTING_PERIOD / (24 * 60 * 60), "days");

  // Step 3: Mint enough USDC to user to buy all FVC
  console.log("\n💵 Step 3: Minting USDC to user for complete testing...");
  
  // Calculate how much USDC needed to buy all 10M FVC
  // At 20% discount: 1 USDC = 1.2 FVC
  // So 10M FVC = 10M / 1.2 = 8.33M USDC
  const USDC_NEEDED = ethers.parseUnits("8500000", 6); // 8.5M USDC (extra buffer)
  
  await usdc.mint(user.address, USDC_NEEDED);
  console.log("✅ Minted", ethers.formatUnits(USDC_NEEDED, 6), "USDC to user");

  // Step 4: Approve USDC for bonding
  console.log("\n✅ Step 4: Approving USDC for bonding...");
  await usdc.connect(user).approve(BONDING_ADDRESS, USDC_NEEDED);
  console.log("✅ Approved USDC for bonding");

  // Step 5: Test bonding with large amount
  console.log("\n🔗 Step 5: Testing large bonding transaction...");
  const TEST_BOND_AMOUNT = ethers.parseUnits("1000000", 6); // 1M USDC
  
  try {
    await bonding.connect(user).bond(TEST_BOND_AMOUNT);
    console.log("✅ Successfully bonded 1M USDC for FVC");
  } catch (error) {
    console.log("❌ Bonding failed:", error.message);
    return;
  }

  // Step 6: Final verification
  console.log("\n📊 Step 6: Final verification...");
  const finalUserUSDCBalance = await usdc.balanceOf(user.address);
  const finalUserFVCBalance = await fvc.balanceOf(user.address);
  const finalSafeUSDCBalance = await usdc.balanceOf(SAFE_ADDRESS);
  const finalSafeFVCBalance = await fvc.balanceOf(SAFE_ADDRESS);

  console.log("=== TREASURY VERIFICATION ===");
  console.log("Safe address:", SAFE_ADDRESS);
  console.log("Safe FVC balance:", ethers.formatUnits(finalSafeFVCBalance, 18));
  console.log("Safe USDC balance:", ethers.formatUnits(finalSafeUSDCBalance, 6));
  console.log("User FVC balance:", ethers.formatUnits(finalUserFVCBalance, 18));
  console.log("User USDC balance:", ethers.formatUnits(finalUserUSDCBalance, 6));

  // Calculate FVC received
  const fvcReceived = finalUserFVCBalance - userFVCBalance;
  const usdcSpent = userUSDCBalance + USDC_NEEDED - finalUserUSDCBalance;
  
  console.log("\n🎯 Transaction Summary:");
  console.log("USDC spent:", ethers.formatUnits(usdcSpent, 6));
  console.log("FVC received:", ethers.formatUnits(fvcReceived, 18));
  console.log("Exchange rate:", ethers.formatUnits(fvcReceived, 18) / ethers.formatUnits(usdcSpent, 6), "FVC per USDC");

  // Check vesting schedule
  console.log("\n🔒 Vesting Schedule:");
  try {
    const vestingSchedule = await bonding.getVestingSchedule(user.address);
    console.log("Vesting amount:", ethers.formatUnits(vestingSchedule.amount, 18));
    console.log("Start time:", new Date(Number(vestingSchedule.startTime) * 1000));
    console.log("End time:", new Date(Number(vestingSchedule.endTime) * 1000));
    console.log("Is locked:", await bonding.isLocked(user.address));
  } catch (error) {
    console.log("❌ Error reading vesting:", error.message);
  }

  console.log("\n🎉 Bonding round reset complete!");
  console.log("✅ New round started with fresh parameters");
  console.log("✅ User has enough USDC to test complete vesting");
  console.log("✅ Treasury ready for full testing");
  console.log("🔗 Safe URL: https://safe.global/app/amoy:" + SAFE_ADDRESS);
  console.log("🔍 Explorer: https://www.oklink.com/amoy/address/" + SAFE_ADDRESS);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 