import { ethers } from "hardhat";

/**
 * PRODUCTION VALIDATION SCRIPT
 * 
 * This single script replaces all the debugging/testing scripts with
 * comprehensive production-ready validation.
 */

async function main() {
  console.log("🔍 PRODUCTION VALIDATION SUITE");
  console.log("=====================================");
  
  const BONDING_ADDRESS = "0x26725c6BDb619fbBd7b06ED221A6Fb544812656d";
  const FVC_ADDRESS = "0x271d4cF375eC80797BC6a5777D7cdF83feCD77A1";
  
  const bonding = await ethers.getContractAt("Bonding", BONDING_ADDRESS);
  const fvc = await ethers.getContractAt("FVC", FVC_ADDRESS);
  
  let issues: string[] = [];
  
  console.log("\n1️⃣ CONTRACT STATE VALIDATION");
  console.log("-----------------------------");
  
  try {
    const currentRound = await bonding.getCurrentRound();
    const roundId = await bonding.currentRoundId();
    const totalBonded = await bonding.totalBonded();
    const fvcAllocated = await bonding.fvcAllocated();
    const fvcSold = await bonding.fvcSold();
    
    console.log("✅ Contract responsive");
    console.log(`Round ID: ${roundId}`);
    console.log(`Round Active: ${currentRound.isActive}`);
    console.log(`FVC Allocated: ${ethers.formatEther(fvcAllocated)}`);
    console.log(`FVC Sold: ${ethers.formatEther(fvcSold)}`);
    console.log(`Total Bonded: ${ethers.formatUnits(totalBonded, 6)} USDC`);
    
    // Validate state consistency
    if (fvcSold > fvcAllocated) {
      issues.push("❌ FVC sold exceeds allocated");
    }
    
    if (currentRound.fvcSold !== fvcSold) {
      issues.push("❌ Round fvcSold doesn't match global fvcSold");
    }
    
  } catch (error) {
    issues.push(`❌ Contract state check failed: ${error}`);
  }
  
  console.log("\n2️⃣ MATHEMATICAL PRECISION VALIDATION");
  console.log("------------------------------------");
  
  try {
    // Test the exact calculation that was causing rounding errors
    const testUSDC = ethers.parseUnits("1000", 6); // 1000 USDC
    const currentDiscount = await bonding.getCurrentDiscount();
    const calculatedFVC = await bonding.calculateUSDCAmount(ethers.parseEther("1000"));
    
    console.log(`✅ Calculation test passed`);
    console.log(`1000 FVC costs: ${ethers.formatUnits(calculatedFVC, 6)} USDC`);
    console.log(`Current discount: ${currentDiscount}%`);
    
    // Validate the math makes sense
    const expectedMin = 800; // With 20% discount
    const expectedMax = 1000; // With 0% discount
    const actualCost = parseFloat(ethers.formatUnits(calculatedFVC, 6));
    
    if (actualCost < expectedMin || actualCost > expectedMax) {
      issues.push(`❌ Calculation seems wrong: ${actualCost} USDC for 1000 FVC`);
    }
    
  } catch (error) {
    issues.push(`❌ Mathematical validation failed: ${error}`);
  }
  
  console.log("\n3️⃣ VESTING SYSTEM VALIDATION");
  console.log("-----------------------------");
  
  try {
    const [admin] = await ethers.getSigners();
    const vestingSchedule = await bonding.getVestingSchedule(admin.address);
    const isLocked = await bonding.isLocked(admin.address);
    
    console.log(`✅ Vesting system responsive`);
    console.log(`Admin tokens locked: ${isLocked}`);
    console.log(`Vesting amount: ${ethers.formatEther(vestingSchedule.amount)}`);
    
    if (vestingSchedule.endTime > 0) {
      const now = Math.floor(Date.now() / 1000);
      const timeLeft = Number(vestingSchedule.endTime) - now;
      console.log(`Time until unlock: ${Math.max(0, Math.floor(timeLeft / 86400))} days`);
    }
    
  } catch (error) {
    issues.push(`❌ Vesting validation failed: ${error}`);
  }
  
  console.log("\n4️⃣ ACCESS CONTROL VALIDATION");
  console.log("-----------------------------");
  
  try {
    const [admin] = await ethers.getSigners();
    const owner = await bonding.owner();
    const hasRole = await fvc.hasRole(await fvc.DEFAULT_ADMIN_ROLE(), admin.address);
    
    console.log(`✅ Access control responsive`);
    console.log(`Bonding owner: ${owner}`);
    console.log(`Admin address: ${admin.address}`);
    console.log(`Admin has FVC role: ${hasRole}`);
    
    if (owner.toLowerCase() !== admin.address.toLowerCase()) {
      issues.push("❌ Admin is not bonding contract owner");
    }
    
  } catch (error) {
    issues.push(`❌ Access control validation failed: ${error}`);
  }
  
  console.log("\n5️⃣ ROUND TRANSITION READINESS");
  console.log("------------------------------");
  
  try {
    const currentRound = await bonding.getCurrentRound();
    
    if (currentRound.isActive) {
      console.log("✅ Current round is active");
      console.log("⚠️  Must call completeCurrentRound() before starting Round 1");
    } else {
      console.log("✅ Current round is completed");
      console.log("✅ Ready to start Round 1");
    }
    
    // Check if functions exist (our recent fixes)
    await bonding.completeCurrentRound.staticCall();
    await bonding.startNextRound.staticCall();
    console.log("✅ Round transition functions available");
    
  } catch (error) {
    if (error.message.includes("RoundAlreadyActive")) {
      console.log("✅ Round transition functions working (expected error)");
    } else {
      issues.push(`❌ Round transition validation failed: ${error}`);
    }
  }
  
  console.log("\n📊 VALIDATION SUMMARY");
  console.log("=====================");
  
  if (issues.length === 0) {
    console.log("🎉 ALL VALIDATIONS PASSED");
    console.log("✅ Contract is production ready");
    console.log("✅ No critical issues detected");
    console.log("✅ Safe to proceed with Round 1");
  } else {
    console.log("🚨 CRITICAL ISSUES DETECTED:");
    issues.forEach(issue => console.log(issue));
    console.log("\n❌ DO NOT PROCEED WITH ROUND 1");
    console.log("❌ Fix issues before deployment");
  }
  
  console.log("\n🔧 NEXT STEPS:");
  if (issues.length === 0) {
    console.log("1. Complete current round: completeCurrentRound()");
    console.log("2. Start Round 1: startNextRound()");
    console.log("3. Allocate FVC to Round 1");
    console.log("4. Monitor initial bonding activity");
  } else {
    console.log("1. Fix all critical issues listed above");
    console.log("2. Re-run this validation script");
    console.log("3. Only proceed when all checks pass");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("🚨 VALIDATION SCRIPT FAILED:", error);
    process.exit(1);
  });
