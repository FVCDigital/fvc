const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking Vesting Status...");

  // Get signers
  const signers = await ethers.getSigners();
  const admin = signers[0];

  // Load contract factories
  const Bonding = await ethers.getContractFactory("Bonding");
  const FVC = await ethers.getContractFactory("FVC");
  
  // Contract addresses
  const BONDING_ADDRESS = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";
  const FVC_ADDRESS = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";
  
  // Attach to deployed contracts
  const bonding = Bonding.attach(BONDING_ADDRESS);
  const fvc = FVC.attach(FVC_ADDRESS);

  console.log("📋 Contract Addresses:");
  console.log("Bonding:", BONDING_ADDRESS);
  console.log("FVC:", FVC_ADDRESS);
  console.log("Admin:", admin.address);

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

  // Check if admin is locked
  console.log("\n🔒 Lock Status:");
  try {
    const isLocked = await bonding.isLocked(admin.address);
    console.log("Admin is locked:", isLocked);
  } catch (error) {
    console.log("❌ Error checking lock status:", error.message);
  }

  // Check current balances
  console.log("\n💰 Current Balances:");
  const adminFVCBalance = await fvc.balanceOf(admin.address);
  const bondingFVCBalance = await fvc.balanceOf(BONDING_ADDRESS);
  
  console.log("Admin FVC Balance:", ethers.formatUnits(adminFVCBalance, 18), "FVC");
  console.log("Bonding Contract FVC Balance:", ethers.formatUnits(bondingFVCBalance, 18), "FVC");

  // Try to mint new FVC tokens to admin (these won't be locked)
  console.log("\n🔄 Minting New FVC Tokens to Admin...");
  const FVC_TO_MINT = ethers.parseUnits("10000000", 18); // 10M FVC
  
  try {
    const mintTx = await fvc.mint(admin.address, FVC_TO_MINT);
    console.log("Transaction hash:", mintTx.hash);
    
    console.log("⏳ Waiting for transaction confirmation...");
    await mintTx.wait();
    console.log("✅ Successfully minted", ethers.formatUnits(FVC_TO_MINT, 18), "FVC to admin");
  } catch (error) {
    console.log("❌ Failed to mint FVC:", error.message);
    return;
  }

  // Check new balances
  console.log("\n💰 New Balances:");
  const newAdminFVCBalance = await fvc.balanceOf(admin.address);
  console.log("New Admin FVC Balance:", ethers.formatUnits(newAdminFVCBalance, 18), "FVC");

  // Try to transfer the newly minted tokens
  console.log("\n💰 Transferring New FVC Tokens to Bonding Contract...");
  try {
    const transferTx = await fvc.transfer(BONDING_ADDRESS, FVC_TO_MINT);
    console.log("Transaction hash:", transferTx.hash);
    
    console.log("⏳ Waiting for transaction confirmation...");
    await transferTx.wait();
    console.log("✅ Successfully transferred", ethers.formatUnits(FVC_TO_MINT, 18), "FVC to bonding contract");
  } catch (error) {
    console.log("❌ Failed to transfer FVC:", error.message);
    return;
  }

  // Verify final balances
  console.log("\n🔍 Final Balances:");
  const finalBondingBalance = await fvc.balanceOf(BONDING_ADDRESS);
  const finalAdminBalance = await fvc.balanceOf(admin.address);
  
  console.log("Final Bonding Contract FVC Balance:", ethers.formatUnits(finalBondingBalance, 18), "FVC");
  console.log("Final Admin FVC Balance:", ethers.formatUnits(finalAdminBalance, 18), "FVC");

  console.log("\n✅ ALLOCATION COMPLETE!");
  console.log("The bonding contract now has 10M FVC available for bonding operations.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 