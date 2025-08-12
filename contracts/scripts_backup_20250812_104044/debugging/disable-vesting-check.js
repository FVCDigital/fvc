const { ethers } = require("hardhat");

async function main() {
  console.log("🔓 Temporarily Disabling Vesting Check...");

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

  // Check current bonding contract setting
  console.log("\n🔍 Current Bonding Contract Setting:");
  try {
    const currentBondingContract = await fvc.bondingContract();
    console.log("Current bonding contract:", currentBondingContract);
  } catch (error) {
    console.log("❌ Error reading bonding contract setting:", error.message);
  }

  // Temporarily set bonding contract to zero to disable vesting check
  console.log("\n🔓 Temporarily disabling vesting check...");
  try {
    const setBondingTx = await fvc.setBondingContract("0x0000000000000000000000000000000000000000");
    console.log("Transaction hash:", setBondingTx.hash);
    
    console.log("⏳ Waiting for transaction confirmation...");
    await setBondingTx.wait();
    console.log("✅ Successfully disabled vesting check");
  } catch (error) {
    console.log("❌ Failed to disable vesting check:", error.message);
    return;
  }

  // Check current balances
  console.log("\n💰 Current Balances:");
  const adminFVCBalance = await fvc.balanceOf(admin.address);
  const treasuryFVCBalance = await fvc.balanceOf(TREASURY_ADDRESS);
  
  console.log("Admin FVC Balance:", ethers.formatUnits(adminFVCBalance, 18), "FVC");
  console.log("Treasury FVC Balance:", ethers.formatUnits(treasuryFVCBalance, 18), "FVC");

  // Transfer the vested amount to treasury
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
  }

  // Re-enable vesting check by setting bonding contract back
  console.log("\n🔒 Re-enabling vesting check...");
  try {
    const setBondingTx = await fvc.setBondingContract(BONDING_ADDRESS);
    console.log("Transaction hash:", setBondingTx.hash);
    
    console.log("⏳ Waiting for transaction confirmation...");
    await setBondingTx.wait();
    console.log("✅ Successfully re-enabled vesting check");
  } catch (error) {
    console.log("❌ Failed to re-enable vesting check:", error.message);
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
  console.log("The vested FVC has been transferred to the treasury.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 