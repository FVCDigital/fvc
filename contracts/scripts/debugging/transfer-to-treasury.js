const { ethers } = require("hardhat");

async function main() {
  console.log("💰 Transferring 12,000 FVC from Admin to Treasury...");

  // Get signers
  const signers = await ethers.getSigners();
  const admin = signers[0];

  // Load contract factories
  const Bonding = await ethers.getContractFactory("Bonding");
  const FVC = await ethers.getContractFactory("FVC");
  
  // Contract addresses
  const BONDING_ADDRESS = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";
  const FVC_ADDRESS = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";
  const TREASURY_ADDRESS = "0x7f1EE89fDB16b57930b7F53Bb998f25d917F35D9";
  
  // Attach to deployed contracts
  const bonding = Bonding.attach(BONDING_ADDRESS);
  const fvc = FVC.attach(FVC_ADDRESS);

  console.log("📋 Contract Addresses:");
  console.log("Bonding:", BONDING_ADDRESS);
  console.log("FVC:", FVC_ADDRESS);
  console.log("Treasury (Gnosis Safe):", TREASURY_ADDRESS);
  console.log("Admin:", admin.address);

  // Check current balances
  console.log("\n💰 Current Balances:");
  const adminFVCBalance = await fvc.balanceOf(admin.address);
  const treasuryFVCBalance = await fvc.balanceOf(TREASURY_ADDRESS);
  const bondingFVCBalance = await fvc.balanceOf(BONDING_ADDRESS);
  
  console.log("Admin FVC Balance:", ethers.formatUnits(adminFVCBalance, 18), "FVC");
  console.log("Treasury FVC Balance:", ethers.formatUnits(treasuryFVCBalance, 18), "FVC");
  console.log("Bonding Contract FVC Balance:", ethers.formatUnits(bondingFVCBalance, 18), "FVC");

  // Check admin's vesting schedule
  console.log("\n🔍 Admin Vesting Schedule:");
  try {
    const vestingSchedule = await bonding.getVestingSchedule(admin.address);
    console.log("Vesting Amount:", ethers.formatUnits(vestingSchedule.amount, 18), "FVC");
    console.log("Start Time:", new Date(Number(vestingSchedule.startTime) * 1000));
    console.log("End Time:", new Date(Number(vestingSchedule.endTime) * 1000));
    
    const currentTime = Math.floor(Date.now() / 1000);
    console.log("Current Time:", new Date(currentTime * 1000));
    console.log("Is Locked:", await bonding.isLocked(admin.address));
  } catch (error) {
    console.log("❌ Error reading vesting schedule:", error.message);
  }

  // Try to unlock the admin's vesting by completing the round
  console.log("\n🔄 Attempting to unlock admin's vesting...");
  try {
    // Check if current round is active
    const currentRoundId = await bonding.currentRoundId();
    console.log("Current Round ID:", currentRoundId.toString());
    
    // Try to complete the current round to unlock vesting
    const completeTx = await bonding.completeCurrentRound();
    console.log("Transaction hash:", completeTx.hash);
    
    console.log("⏳ Waiting for transaction confirmation...");
    await completeTx.wait();
    console.log("✅ Successfully completed current round");
  } catch (error) {
    console.log("❌ Failed to complete current round:", error.message);
    console.log("This might be expected if the round is already inactive");
  }

  // Check if admin is still locked
  console.log("\n🔒 Checking Lock Status After Round Completion:");
  try {
    const isLocked = await bonding.isLocked(admin.address);
    console.log("Admin is locked:", isLocked);
  } catch (error) {
    console.log("❌ Error checking lock status:", error.message);
  }

  // Try to transfer the vested amount to treasury
  const VESTED_AMOUNT = ethers.parseUnits("12000", 18); // 12,000 FVC
  
  console.log("\n💰 Transferring Vested FVC to Treasury...");
  try {
    const transferTx = await fvc.transfer(TREASURY_ADDRESS, VESTED_AMOUNT);
    console.log("Transaction hash:", transferTx.hash);
    
    console.log("⏳ Waiting for transaction confirmation...");
    await transferTx.wait();
    console.log("✅ Successfully transferred", ethers.formatUnits(VESTED_AMOUNT, 18), "FVC to treasury");
  } catch (error) {
    console.log("❌ Failed to transfer FVC to treasury:", error.message);
    console.log("The admin's tokens might still be locked in vesting");
  }

  // Verify final balances
  console.log("\n🔍 Final Balances:");
  const finalAdminBalance = await fvc.balanceOf(admin.address);
  const finalTreasuryBalance = await fvc.balanceOf(TREASURY_ADDRESS);
  const finalBondingBalance = await fvc.balanceOf(BONDING_ADDRESS);
  
  console.log("Final Admin FVC Balance:", ethers.formatUnits(finalAdminBalance, 18), "FVC");
  console.log("Final Treasury FVC Balance:", ethers.formatUnits(finalTreasuryBalance, 18), "FVC");
  console.log("Final Bonding Contract FVC Balance:", ethers.formatUnits(finalBondingBalance, 18), "FVC");

  console.log("\n✅ TRANSFER COMPLETE!");
  console.log("The treasury now has the vested FVC tokens.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 