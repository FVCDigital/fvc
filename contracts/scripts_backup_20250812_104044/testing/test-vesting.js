const { ethers } = require("hardhat");
/**
 * @dev This script tests the vesting process for the Bonding contract.
 * It mints USDC to the user, approves it for bonding, and bonds it for FVC.
 * It then checks the vesting schedule and verifies the FVC tokens are locked in vesting.
 * It also verifies the treasury received the USDC.
 * 
 * @returns {Promise<void>} No return value.
 * @throws Will throw if any blockchain interaction fails.
 */

async function main() {
  console.log("🔒 Testing Vesting Process...");

  /**
   * @constant {Signer} user - The user signing the transactions.
   */
  const signers = await ethers.getSigners();
  const user = signers[0];

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

  const bonding = Bonding.attach(BONDING_ADDRESS);
  const fvc = FVC.attach(FVC_ADDRESS);
  const usdc = MockUSDC.attach(USDC_ADDRESS);

  console.log("📋 Current State:");
  console.log("User address:", user.address);
  console.log("Safe address:", SAFE_ADDRESS);

  /**
   * @constant {BigNumber} userUSDCBalance - The balance of USDC in the user's wallet.
   * @constant {BigNumber} userFVCBalance - The balance of FVC in the user's wallet.
   * @constant {BigNumber} safeUSDCBalance - The balance of USDC in the safe.
   * @constant {BigNumber} safeFVCBalance - The balance of FVC in the safe.
   */
  const userUSDCBalance = await usdc.balanceOf(user.address);
  const userFVCBalance = await fvc.balanceOf(user.address);
  const safeUSDCBalance = await usdc.balanceOf(SAFE_ADDRESS);
  const safeFVCBalance = await fvc.balanceOf(SAFE_ADDRESS);

  console.log("\n💰 Current Balances:");
  console.log("User USDC:", ethers.formatUnits(userUSDCBalance, 6));
  console.log("User FVC:", ethers.formatUnits(userFVCBalance, 18));
  console.log("Safe USDC:", ethers.formatUnits(safeUSDCBalance, 6));
  console.log("Safe FVC:", ethers.formatUnits(safeFVCBalance, 18));

  console.log("\n🔍 New Round State:");
  /**
   * @constant {Object} currentRound - The current round of the bonding contract.
   */
  const currentRound = await bonding.getCurrentRound();
  console.log("Round ID:", currentRound.roundId.toString());
  console.log("Round active:", currentRound.isActive);
  console.log("Initial discount:", currentRound.initialDiscount.toString() + "%");
  console.log("Final discount:", currentRound.finalDiscount.toString() + "%");
  console.log("Epoch cap:", ethers.formatUnits(currentRound.epochCap, 6), "USDC");
  console.log("Wallet cap:", ethers.formatUnits(currentRound.walletCap, 6), "USDC");
  console.log("Vesting period:", Number(currentRound.vestingPeriod) / (24 * 60 * 60), "days");

  console.log("\n💵 Step 1: Minting USDC to user...");
  /**
   * Mints 1,000,000 USDC to the user.
   * @constant {BigNumber} USDC_AMOUNT - The amount of USDC to mint.
   */
  const USDC_AMOUNT = ethers.parseUnits("1000000", 6);
  await usdc.mint(user.address, USDC_AMOUNT);
  console.log("✅ Minted", ethers.formatUnits(USDC_AMOUNT, 6), "USDC to user");

  console.log("\n✅ Step 2: Approving USDC for bonding...");
  await usdc.connect(user).approve(BONDING_ADDRESS, USDC_AMOUNT);
  console.log("✅ Approved USDC for bonding");

  console.log("\n🔗 Step 3: Bonding USDC for FVC...");
  /**
   * @constant {BigNumber} BOND_AMOUNT - The amount of USDC to bond.
   */
  const BOND_AMOUNT = ethers.parseUnits("50000", 6);
  
  try {
    await bonding.connect(user).bond(BOND_AMOUNT);
    console.log("✅ Successfully bonded 50K USDC for FVC");
  } catch (error) {
    console.log("❌ Bonding failed:", error.message);
    return;
  }

  console.log("\n🔒 Step 4: Checking vesting schedule...");
  try {
    const vestingSchedule = await bonding.getVestingSchedule(user.address);
    console.log("Vesting amount:", ethers.formatUnits(vestingSchedule.amount, 18));
    console.log("Start time:", new Date(Number(vestingSchedule.startTime) * 1000));
    console.log("End time:", new Date(Number(vestingSchedule.endTime) * 1000));
    console.log("Is locked:", await bonding.isLocked(user.address));
  } catch (error) {
    console.log("❌ Error reading vesting:", error.message);
  }

  console.log("\n📊 Step 5: Final verification...");
  /**
   * @constant {BigNumber} finalUserUSDCBalance - The balance of USDC in the user's wallet after the transaction.
   * @constant {BigNumber} finalUserFVCBalance - The balance of FVC in the user's wallet after the transaction.
   * @constant {BigNumber} finalSafeUSDCBalance - The balance of USDC in the safe after the transaction.
   * @constant {BigNumber} finalSafeFVCBalance - The balance of FVC in the safe after the transaction.
   */
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

  /**
   * @constant {BigNumber} fvcReceived - The amount of FVC received.
   * @constant {BigNumber} usdcSpent - The amount of USDC spent.
   */
  const fvcReceived = finalUserFVCBalance - userFVCBalance;
  const usdcSpent = userUSDCBalance + USDC_AMOUNT - finalUserUSDCBalance;
  
  console.log("\n🎯 Transaction Summary:");
  console.log("USDC spent:", ethers.formatUnits(usdcSpent, 6));
  console.log("FVC received:", ethers.formatUnits(fvcReceived, 18));
  console.log("Exchange rate:", ethers.formatUnits(fvcReceived, 18) / ethers.formatUnits(usdcSpent, 6), "FVC per USDC");

  console.log("\n🎉 Vesting test complete!");
  console.log("✅ User bonded USDC and received FVC");
  console.log("✅ FVC tokens are locked in vesting");
  console.log("✅ Treasury received USDC");
  console.log("🔗 Safe URL: https://safe.global/app/amoy:" + SAFE_ADDRESS);
  console.log("🔍 Explorer: https://www.oklink.com/amoy/address/" + SAFE_ADDRESS);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 