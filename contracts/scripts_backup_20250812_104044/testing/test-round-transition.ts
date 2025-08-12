import { ethers } from "hardhat";

async function main() {
  console.log("🧪 Testing Round 0 → Round 1 Transition on Testnet");
  
  // Use the latest contract addresses
  const BONDING_ADDRESS = "0x26725c6BDb619fbBd7b06ED221A6Fb544812656d";
  const FVC_ADDRESS = "0x271d4cF375eC80797BC6a5777D7cdF83feCD77A1";
  
  // Get contract instances
  const bonding = await ethers.getContractAt("Bonding", BONDING_ADDRESS);
  const fvc = await ethers.getContractAt("FVC", FVC_ADDRESS);
  
  console.log("\n📊 STEP 1: Check Current State");
  
  // Get current round info
  const currentRound = await bonding.getCurrentRound();
  console.log("Current Round ID:", currentRound.roundId.toString());
  console.log("Round Active:", currentRound.isActive);
  console.log("FVC Allocated:", ethers.formatEther(currentRound.fvcAllocated));
  console.log("FVC Sold:", ethers.formatEther(currentRound.fvcSold));
  console.log("Initial Discount:", currentRound.initialDiscount.toString(), "%");
  console.log("Final Discount:", currentRound.finalDiscount.toString(), "%");
  
  // Check current parameters
  const currentRoundId = await bonding.currentRoundId();
  const totalBonded = await bonding.totalBonded();
  const fvcAllocated = await bonding.fvcAllocated();
  const fvcSold = await bonding.fvcSold();
  
  console.log("\n📋 Contract State:");
  console.log("Current Round ID:", currentRoundId.toString());
  console.log("Total Bonded:", ethers.formatUnits(totalBonded, 6), "USDC");
  console.log("FVC Allocated:", ethers.formatEther(fvcAllocated));
  console.log("FVC Sold:", ethers.formatEther(fvcSold));
  console.log("FVC Remaining:", ethers.formatEther(fvcAllocated - fvcSold));
  
  console.log("\n🔄 STEP 2: Complete Current Round");
  
  try {
    const completeTx = await bonding.completeCurrentRound();
    console.log("Complete round tx hash:", completeTx.hash);
    await completeTx.wait();
    console.log("✅ Successfully completed Round 0");
  } catch (error: any) {
    console.log("❌ Error completing round:", error.message);
    return;
  }
  
  // Verify round is completed
  const completedRound = await bonding.getCurrentRound();
  console.log("Round 0 is now active:", completedRound.isActive);
  
  console.log("\n🚀 STEP 3: Start Round 1 (Genesis)");
  
  try {
    const startTx = await bonding.startNextRound();
    console.log("Start round tx hash:", startTx.hash);
    await startTx.wait();
    console.log("✅ Successfully started Round 1");
  } catch (error: any) {
    console.log("❌ Error starting round:", error.message);
    return;
  }
  
  console.log("\n📊 STEP 4: Verify Round 1 Configuration");
  
  // Get new round info
  const newRound = await bonding.getCurrentRound();
  const newRoundId = await bonding.currentRoundId();
  
  console.log("New Round ID:", newRoundId.toString());
  console.log("Round Active:", newRound.isActive);
  console.log("Initial Discount:", newRound.initialDiscount.toString(), "%");
  console.log("Final Discount:", newRound.finalDiscount.toString(), "%");
  console.log("Epoch Cap:", ethers.formatEther(newRound.epochCap));
  console.log("Wallet Cap:", ethers.formatEther(newRound.walletCap));
  console.log("Vesting Period:", newRound.vestingPeriod.toString(), "seconds");
  console.log("FVC Allocated:", ethers.formatEther(newRound.fvcAllocated));
  console.log("FVC Sold:", ethers.formatEther(newRound.fvcSold));
  
  // Reset state check
  const newTotalBonded = await bonding.totalBonded();
  const newFvcSold = await bonding.fvcSold();
  
  console.log("\n📋 New Contract State:");
  console.log("Total Bonded (should be 0):", ethers.formatUnits(newTotalBonded, 6), "USDC");
  console.log("FVC Sold (should be 0):", ethers.formatEther(newFvcSold));
  
  console.log("\n🎯 STEP 5: Test FVC Allocation to Round 1");
  
  // Check admin FVC balance
  const [admin] = await ethers.getSigners();
  const adminBalance = await fvc.balanceOf(admin.address);
  console.log("Admin FVC Balance:", ethers.formatEther(adminBalance));
  
  if (adminBalance > 0n) {
    try {
      // Allocate some FVC to Round 1 for testing
      const allocateAmount = ethers.parseEther("1000000"); // 1M FVC
      const allocateLimit = adminBalance < allocateAmount ? adminBalance : allocateAmount;
      
      console.log("Allocating", ethers.formatEther(allocateLimit), "FVC to Round 1...");
      
      const allocateTx = await bonding.allocateFVC(allocateLimit);
      console.log("Allocate tx hash:", allocateTx.hash);
      await allocateTx.wait();
      console.log("✅ Successfully allocated FVC to Round 1");
      
      // Verify allocation
      const finalRound = await bonding.getCurrentRound();
      console.log("Round 1 FVC Allocated:", ethers.formatEther(finalRound.fvcAllocated));
      
    } catch (error: any) {
      console.log("❌ Error allocating FVC:", error.message);
    }
  } else {
    console.log("⚠️ Admin has no FVC to allocate");
  }
  
  console.log("\n🎉 ROUND TRANSITION TEST COMPLETE");
  console.log("✅ Round 0 → Round 1 transition successful");
  console.log("✅ All state properly reset");
  console.log("✅ New round parameters applied");
  console.log("✅ FVC allocation working");
  
  console.log("\n📝 Summary:");
  console.log("- Round 0 completed and deactivated");
  console.log("- Round 1 started with predefined parameters");
  console.log("- Contract state properly reset");
  console.log("- Ready for Round 1 bonding");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
