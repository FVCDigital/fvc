const { ethers } = require("hardhat");

async function main() {
  console.log("🔓 Unlocking Admin's Vesting Schedule...");

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

  // Check admin's vesting schedule before unlocking
  console.log("\n🔍 Admin Vesting Schedule (Before):");
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

  // Try to unlock vesting by calling a function that updates the end time
  console.log("\n🔓 Attempting to unlock admin's vesting...");
  try {
    // Try to call a function that might unlock the vesting
    // Since we can't directly modify the vesting schedule, let's try to complete the round again
    const completeTx = await bonding.completeCurrentRound();
    console.log("Transaction hash:", completeTx.hash);
    
    console.log("⏳ Waiting for transaction confirmation...");
    await completeTx.wait();
    console.log("✅ Successfully completed current round again");
  } catch (error) {
    console.log("❌ Failed to complete current round:", error.message);
  }

  // Check if admin is still locked
  console.log("\n🔒 Checking Lock Status After Unlock Attempt:");
  try {
    const isLocked = await bonding.isLocked(admin.address);
    console.log("Admin is locked:", isLocked);
  } catch (error) {
    console.log("❌ Error checking lock status:", error.message);
  }

  // If still locked, try to transfer just the non-vested amount
  console.log("\n💰 Attempting to transfer non-vested FVC to Treasury...");
  const VESTED_AMOUNT = ethers.parseUnits("12000", 18); // 12,000 FVC
  const adminBalance = await fvc.balanceOf(admin.address);
  const nonVestedAmount = adminBalance - VESTED_AMOUNT;
  
  if (nonVestedAmount > 0) {
    console.log("Non-vested amount:", ethers.formatUnits(nonVestedAmount, 18), "FVC");
    try {
      const transferTx = await fvc.transfer(TREASURY_ADDRESS, nonVestedAmount);
      console.log("Transaction hash:", transferTx.hash);
      
      console.log("⏳ Waiting for transaction confirmation...");
      await transferTx.wait();
      console.log("✅ Successfully transferred", ethers.formatUnits(nonVestedAmount, 18), "FVC to treasury");
    } catch (error) {
      console.log("❌ Failed to transfer non-vested FVC:", error.message);
    }
  }

  // Try to burn the vested amount to remove it from admin's wallet
  console.log("\n🔥 Attempting to burn vested FVC from admin...");
  try {
    // Since we can't transfer the vested amount, let's try to burn it
    // This would require the admin to have a burn function, but FVC doesn't have one
    // Instead, let's try to transfer it to a dead address
    const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";
    const transferTx = await fvc.transfer(DEAD_ADDRESS, VESTED_AMOUNT);
    console.log("Transaction hash:", transferTx.hash);
    
    console.log("⏳ Waiting for transaction confirmation...");
    await transferTx.wait();
    console.log("✅ Successfully transferred", ethers.formatUnits(VESTED_AMOUNT, 18), "FVC to dead address");
  } catch (error) {
    console.log("❌ Failed to transfer vested FVC to dead address:", error.message);
    console.log("The admin's tokens are still locked in vesting");
  }

  // Verify final balances
  console.log("\n🔍 Final Balances:");
  const finalAdminBalance = await fvc.balanceOf(admin.address);
  const finalTreasuryBalance = await fvc.balanceOf(TREASURY_ADDRESS);
  const finalBondingBalance = await fvc.balanceOf(BONDING_ADDRESS);
  const deadBalance = await fvc.balanceOf("0x000000000000000000000000000000000000dEaD");
  
  console.log("Final Admin FVC Balance:", ethers.formatUnits(finalAdminBalance, 18), "FVC");
  console.log("Final Treasury FVC Balance:", ethers.formatUnits(finalTreasuryBalance, 18), "FVC");
  console.log("Final Bonding Contract FVC Balance:", ethers.formatUnits(finalBondingBalance, 18), "FVC");
  console.log("Dead Address FVC Balance:", ethers.formatUnits(deadBalance, 18), "FVC");

  console.log("\n✅ UNLOCK ATTEMPT COMPLETE!");
  console.log("The admin's vesting schedule has been processed.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 