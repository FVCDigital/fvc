const { ethers } = require("hardhat");

async function main() {
  console.log("💰 Minting FVC Directly to Bonding Contract...");

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

  // Check current balances
  console.log("\n💰 Current Balances:");
  const adminFVCBalance = await fvc.balanceOf(admin.address);
  const bondingFVCBalance = await fvc.balanceOf(BONDING_ADDRESS);
  
  console.log("Admin FVC Balance:", ethers.formatUnits(adminFVCBalance, 18), "FVC");
  console.log("Bonding Contract FVC Balance:", ethers.formatUnits(bondingFVCBalance, 18), "FVC");

  // Check if bonding contract has MINTER_ROLE
  console.log("\n🔐 Checking MINTER_ROLE...");
  try {
    const MINTER_ROLE = await fvc.MINTER_ROLE();
    const hasMinterRole = await fvc.hasRole(MINTER_ROLE, BONDING_ADDRESS);
    console.log("Bonding has MINTER_ROLE:", hasMinterRole ? "✅ YES" : "❌ NO");
    
    if (!hasMinterRole) {
      console.log("🔄 Granting MINTER_ROLE to bonding contract...");
      const grantTx = await fvc.grantRole(MINTER_ROLE, BONDING_ADDRESS);
      await grantTx.wait();
      console.log("✅ Granted MINTER_ROLE to bonding contract");
    }
  } catch (error) {
    console.log("❌ Error checking/granting MINTER_ROLE:", error.message);
  }

  // Amount to mint
  const FVC_TO_MINT = ethers.parseUnits("10000000", 18); // 10M FVC
  
  console.log("\n🎯 Mint Target:");
  console.log("FVC to Mint:", ethers.formatUnits(FVC_TO_MINT, 18), "FVC");

  // Try to mint directly to bonding contract
  console.log("\n💰 Minting FVC Directly to Bonding Contract...");
  try {
    const mintTx = await fvc.mint(BONDING_ADDRESS, FVC_TO_MINT);
    console.log("Transaction hash:", mintTx.hash);
    
    console.log("⏳ Waiting for transaction confirmation...");
    await mintTx.wait();
    console.log("✅ Successfully minted", ethers.formatUnits(FVC_TO_MINT, 18), "FVC to bonding contract");
  } catch (error) {
    console.log("❌ Failed to mint FVC to bonding contract:", error.message);
    return;
  }

  // Verify mint
  console.log("\n🔍 Verifying Mint:");
  const newBondingBalance = await fvc.balanceOf(BONDING_ADDRESS);
  const newAdminBalance = await fvc.balanceOf(admin.address);
  
  console.log("New Bonding Contract FVC Balance:", ethers.formatUnits(newBondingBalance, 18), "FVC");
  console.log("New Admin FVC Balance:", ethers.formatUnits(newAdminBalance, 18), "FVC");

  // Try to call allocateFVC with 0 amount to update the state
  console.log("\n🔄 Updating contract state...");
  try {
    const allocateTx = await bonding.allocateFVC(0);
    console.log("Transaction hash:", allocateTx.hash);
    
    console.log("⏳ Waiting for transaction confirmation...");
    await allocateTx.wait();
    console.log("✅ Successfully updated contract state");
  } catch (error) {
    console.log("❌ Failed to update contract state:", error.message);
    console.log("But the FVC is now in the bonding contract");
  }

  // Check contract state variables
  try {
    const fvcAllocated = await bonding.fvcAllocated();
    const fvcSold = await bonding.fvcSold();
    const remainingFVC = await bonding.getRemainingFVC();
    
    console.log("\n📊 Contract State After Mint:");
    console.log("FVC Allocated:", ethers.formatUnits(fvcAllocated, 18), "FVC");
    console.log("FVC Sold:", ethers.formatUnits(fvcSold, 18), "FVC");
    console.log("FVC Remaining:", ethers.formatUnits(remainingFVC, 18), "FVC");
  } catch (error) {
    console.log("❌ Error reading contract state:", error.message);
  }

  console.log("\n✅ MINT COMPLETE!");
  console.log("The bonding contract now has 10M FVC available for bonding operations.");
  console.log("Note: The contract state variables may not be updated, but the FVC is in the contract.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 