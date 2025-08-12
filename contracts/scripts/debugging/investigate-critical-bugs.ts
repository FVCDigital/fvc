import { ethers } from "hardhat";

/**
 * INVESTIGATE CRITICAL BUGS
 * 
 * This script investigates the specific critical issues found in production validation:
 * 1. State inconsistency: round fvcSold vs global fvcSold
 * 2. Round transition function failures
 */

async function main() {
  console.log("🔍 INVESTIGATING CRITICAL BUGS");
  console.log("================================");
  
  const BONDING_ADDRESS = "0x26725c6BDb619fbBd7b06ED221A6Fb544812656d";
  const FVC_ADDRESS = "0x271d4cF375eC80797BC6a5777D7cdF83feCD77A1";
  
  console.log("📋 Contract Addresses:");
  console.log("Bonding:", BONDING_ADDRESS);
  console.log("FVC:", FVC_ADDRESS);
  
  // Get signers
  const [admin] = await ethers.getSigners();
  console.log("Admin:", admin.address);
  
  try {
    // Try to get basic contract info first
    console.log("\n🔍 STEP 1: Basic Contract Info");
    console.log("-------------------------------");
    
    const bonding = await ethers.getContractAt("Bonding", BONDING_ADDRESS);
    const fvc = await ethers.getContractAt("FVC", FVC_ADDRESS);
    
    console.log("✅ Contracts loaded successfully");
    
    // Check owner
    const owner = await bonding.owner();
    console.log("Bonding owner:", owner);
    console.log("Admin is owner:", owner === admin.address);
    
    // Check current round ID
    const currentRoundId = await bonding.currentRoundId();
    console.log("Current round ID:", currentRoundId.toString());
    
  } catch (error) {
    console.log("❌ Failed to load contracts:", error.message);
    return;
  }
  
  try {
    console.log("\n🔍 STEP 2: Investigate State Inconsistency");
    console.log("-------------------------------------------");
    
    const bonding = await ethers.getContractAt("Bonding", BONDING_ADDRESS);
    
    // Get global values
    const globalFvcSold = await bonding.fvcSold();
    const globalTotalBonded = await bonding.totalBonded();
    const globalFvcAllocated = await bonding.fvcAllocated();
    
    console.log("Global fvcSold:", ethers.formatEther(globalFvcSold));
    console.log("Global totalBonded:", ethers.formatUnits(globalTotalBonded, 6));
    console.log("Global fvcAllocated:", ethers.formatEther(globalFvcAllocated));
    
    // Try to get round-specific data
    const currentRoundId = await bonding.currentRoundId();
    console.log("Current round ID:", currentRoundId.toString());
    
    // Try to access round data directly
    try {
      const round = await bonding.rounds(currentRoundId);
      console.log("Round data:", round);
      
      if (round.fvcSold !== globalFvcSold) {
        console.log("🚨 STATE INCONSISTENCY DETECTED!");
        console.log("Round fvcSold:", ethers.formatEther(round.fvcSold));
        console.log("Global fvcSold:", ethers.formatEther(globalFvcSold));
        console.log("Difference:", ethers.formatEther(round.fvcSold - globalFvcSold));
      }
    } catch (roundError) {
      console.log("❌ Cannot access round data:", roundError.message);
      console.log("This suggests the contract structure has changed");
    }
    
  } catch (error) {
    console.log("❌ State investigation failed:", error.message);
  }
  
  try {
    console.log("\n🔍 STEP 3: Test Round Transition Functions");
    console.log("--------------------------------------------");
    
    const bonding = await ethers.getContractAt("Bonding", BONDING_ADDRESS);
    
    // Check if functions exist
    console.log("Checking function availability...");
    
    // Test completeCurrentRound
    try {
      const completeGas = await bonding.completeCurrentRound.estimateGas();
      console.log("✅ completeCurrentRound available, gas estimate:", completeGas.toString());
    } catch (error) {
      console.log("❌ completeCurrentRound failed:", error.message);
    }
    
    // Test startNextRound
    try {
      const startGas = await bonding.startNextRound.estimateGas();
      console.log("✅ startNextRound available, gas estimate:", startGas.toString());
    } catch (error) {
      console.log("❌ startNextRound failed:", error.message);
    }
    
  } catch (error) {
    console.log("❌ Function testing failed:", error.message);
  }
  
  try {
    console.log("\n🔍 STEP 4: Check Contract Code");
    console.log("-------------------------------");
    
    // Get contract bytecode to see if it matches our expectations
    const code = await ethers.provider.getCode(BONDING_ADDRESS);
    console.log("Contract has code:", code !== "0x");
    console.log("Code length:", code.length, "characters");
    
    if (code === "0x") {
      console.log("🚨 CRITICAL: Contract has no code!");
    } else if (code.length < 1000) {
      console.log("⚠️  WARNING: Contract code seems too short");
    } else {
      console.log("✅ Contract has substantial code");
    }
    
  } catch (error) {
    console.log("❌ Code check failed:", error.message);
  }
  
  console.log("\n📊 INVESTIGATION SUMMARY");
  console.log("=========================");
  console.log("Check the output above for specific error messages");
  console.log("and state inconsistencies that need to be fixed.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("🚨 Investigation failed:", error);
    process.exit(1);
  });
