const { ethers } = require("hardhat");

async function main() {
  console.log("🔄 Completing Current Round and Starting New Round...");

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

  // Check current round state
  console.log("\n🔍 Current Round State:");
  const currentRoundId = await bonding.currentRoundId();
  console.log("Current Round ID:", currentRoundId.toString());

  // Try to complete current round first
  console.log("\n🔄 Completing Current Round...");
  try {
    const completeTx = await bonding.completeCurrentRound();
    console.log("Transaction hash:", completeTx.hash);
    
    console.log("⏳ Waiting for transaction confirmation...");
    await completeTx.wait();
    console.log("✅ Successfully completed current round");
  } catch (error) {
    console.log("❌ Failed to complete current round:", error.message);
    console.log("This might be expected if the round is already inactive");
  }

  // Start new round with custom parameters
  console.log("\n🚀 Starting New Round...");
  
  // Custom round parameters
  const INITIAL_DISCOUNT = 20; // 20%
  const FINAL_DISCOUNT = 10;   // 10%
  const EPOCH_CAP = ethers.parseUnits("10000000", 6); // 10M USDC
  const WALLET_CAP = ethers.parseUnits("1000000", 6);  // 1M USDC per wallet
  const VESTING_PERIOD = 90 * 24 * 60 * 60; // 90 days

  try {
    const startRoundTx = await bonding.startNewRound(
      INITIAL_DISCOUNT,
      FINAL_DISCOUNT,
      EPOCH_CAP,
      WALLET_CAP,
      VESTING_PERIOD
    );
    console.log("Transaction hash:", startRoundTx.hash);
    
    console.log("⏳ Waiting for transaction confirmation...");
    await startRoundTx.wait();
    console.log("✅ Successfully started custom round");
  } catch (error) {
    console.log("❌ Failed to start custom round:", error.message);
    return;
  }

  // Check new round state
  console.log("\n🔍 New Round State:");
  const newRoundId = await bonding.currentRoundId();
  console.log("New Round ID:", newRoundId.toString());

  // Check current balances
  console.log("\n💰 Current Balances:");
  const adminFVCBalance = await fvc.balanceOf(admin.address);
  const bondingFVCBalance = await fvc.balanceOf(BONDING_ADDRESS);
  
  console.log("Admin FVC Balance:", ethers.formatUnits(adminFVCBalance, 18), "FVC");
  console.log("Bonding Contract FVC Balance:", ethers.formatUnits(bondingFVCBalance, 18), "FVC");

  // Amount to allocate
  const FVC_TO_ALLOCATE = ethers.parseUnits("10000000", 18); // 10M FVC
  
  console.log("\n🎯 Allocation Target:");
  console.log("FVC to Allocate:", ethers.formatUnits(FVC_TO_ALLOCATE, 18), "FVC");

  // Check if admin has enough FVC
  if (adminFVCBalance < FVC_TO_ALLOCATE) {
    console.log("\n❌ INSUFFICIENT FVC BALANCE!");
    console.log("Admin needs:", ethers.formatUnits(FVC_TO_ALLOCATE, 18), "FVC");
    console.log("Admin has:", ethers.formatUnits(adminFVCBalance, 18), "FVC");
    console.log("Shortfall:", ethers.formatUnits(FVC_TO_ALLOCATE - adminFVCBalance, 18), "FVC");
    
    // Mint additional FVC if needed
    const shortfall = FVC_TO_ALLOCATE - adminFVCBalance;
    if (shortfall > 0) {
      console.log("\n🔄 Minting additional FVC to admin...");
      try {
        const mintTx = await fvc.mint(admin.address, shortfall);
        await mintTx.wait();
        console.log("✅ Minted", ethers.formatUnits(shortfall, 18), "FVC to admin");
      } catch (error) {
        console.log("❌ Failed to mint FVC:", error.message);
        return;
      }
    }
  }

  // Check if bonding contract is approved to spend FVC
  console.log("\n🔐 Checking FVC Approval...");
  const allowance = await fvc.allowance(admin.address, BONDING_ADDRESS);
  console.log("Current allowance:", ethers.formatUnits(allowance, 18), "FVC");

  if (allowance < FVC_TO_ALLOCATE) {
    console.log("\n🔄 Approving FVC transfer to bonding contract...");
    try {
      const approveTx = await fvc.approve(BONDING_ADDRESS, FVC_TO_ALLOCATE);
      await approveTx.wait();
      console.log("✅ Approved", ethers.formatUnits(FVC_TO_ALLOCATE, 18), "FVC for bonding contract");
    } catch (error) {
      console.log("❌ Failed to approve FVC:", error.message);
      return;
    }
  } else {
    console.log("✅ Sufficient allowance already exists");
  }

  // Allocate FVC to bonding contract
  console.log("\n💰 Allocating FVC to bonding contract...");
  try {
    const allocateTx = await bonding.allocateFVC(FVC_TO_ALLOCATE);
    console.log("Transaction hash:", allocateTx.hash);
    
    console.log("⏳ Waiting for transaction confirmation...");
    await allocateTx.wait();
    console.log("✅ Successfully allocated", ethers.formatUnits(FVC_TO_ALLOCATE, 18), "FVC to bonding contract");
  } catch (error) {
    console.log("❌ Failed to allocate FVC:", error.message);
    return;
  }

  // Verify allocation
  console.log("\n🔍 Verifying Allocation:");
  const newBondingBalance = await fvc.balanceOf(BONDING_ADDRESS);
  const newAdminBalance = await fvc.balanceOf(admin.address);
  
  console.log("New Bonding Contract FVC Balance:", ethers.formatUnits(newBondingBalance, 18), "FVC");
  console.log("New Admin FVC Balance:", ethers.formatUnits(newAdminBalance, 18), "FVC");

  // Check contract state variables
  try {
    const fvcAllocated = await bonding.fvcAllocated();
    const fvcSold = await bonding.fvcSold();
    const remainingFVC = await bonding.getRemainingFVC();
    
    console.log("\n📊 Contract State After Allocation:");
    console.log("FVC Allocated:", ethers.formatUnits(fvcAllocated, 18), "FVC");
    console.log("FVC Sold:", ethers.formatUnits(fvcSold, 18), "FVC");
    console.log("FVC Remaining:", ethers.formatUnits(remainingFVC, 18), "FVC");
  } catch (error) {
    console.log("❌ Error reading contract state:", error.message);
  }

  console.log("\n✅ ALLOCATION COMPLETE!");
  console.log("The bonding contract now has 10M FVC available for bonding operations.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 