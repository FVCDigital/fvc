import { ethers } from "hardhat";

/**
 * VERIFY FVC ALLOCATION
 * 
 * This script verifies the actual on-chain FVC allocation to see if the
 * 30/70 split (300M/700M) shown in the dashboard is legitimate or just graphical.
 */

async function main() {
  console.log("🔍 VERIFYING FVC ALLOCATION ON-CHAIN");
  console.log("=====================================");
  
  const FVC_ADDRESS = "0x271d4cF375eC80797BC6a5777D7cdF83feCD77A1";
  const BONDING_ADDRESS = "0x26725c6BDb619fbBd7b06ED221A6Fb544812656d";
  const TREASURY_ADDRESS = "0x7f1EE89fDB16b57930b7F53Bb998f25d917F35D9";
  
  console.log("📋 Contract Addresses:");
  console.log("FVC Token:", FVC_ADDRESS);
  console.log("Bonding Contract:", BONDING_ADDRESS);
  console.log("Treasury:", TREASURY_ADDRESS);
  
  try {
    // Get FVC contract
    const fvc = await ethers.getContractAt("FVC", FVC_ADDRESS);
    
    console.log("\n🔍 STEP 1: FVC Token Supply");
    console.log("-----------------------------");
    
    // Get total supply
    const totalSupply = await fvc.totalSupply();
    const totalSupplyFormatted = ethers.formatEther(totalSupply);
    console.log("Total Supply:", totalSupplyFormatted, "FVC");
    
    // Check if it's actually 1B
    const expectedSupply = ethers.parseEther("1000000000"); // 1B
    const isCorrectSupply = totalSupply.toString() === expectedSupply.toString();
    console.log("Is 1B Supply:", isCorrectSupply ? "✅ YES" : "❌ NO");
    
    console.log("\n🔍 STEP 2: FVC Balances by Address");
    console.log("------------------------------------");
    
    // Get balances for key addresses
    const bondingBalance = await fvc.balanceOf(BONDING_ADDRESS);
    const treasuryBalance = await fvc.balanceOf(TREASURY_ADDRESS);
    const adminBalance = await fvc.balanceOf("0xcABa97a2bb6ca2797e302C864C37632b4185d595");
    
    console.log("Bonding Contract Balance:", ethers.formatEther(bondingBalance), "FVC");
    console.log("Treasury Balance:", ethers.formatEther(treasuryBalance), "FVC");
    console.log("Admin Balance:", ethers.formatEther(adminBalance), "FVC");
    
    // Calculate percentages
    const bondingPercentage = (Number(bondingBalance) / Number(totalSupply)) * 100;
    const treasuryPercentage = (Number(treasuryBalance) / Number(totalSupply)) * 100;
    const adminPercentage = (Number(adminBalance) / Number(totalSupply)) * 100;
    
    console.log("\n📊 Allocation Percentages:");
    console.log("Bonding Contract:", bondingPercentage.toFixed(1), "%");
    console.log("Treasury:", treasuryPercentage.toFixed(1), "%");
    console.log("Admin:", adminPercentage.toFixed(1), "%");
    
    console.log("\n🔍 STEP 3: Bonding Contract State");
    console.log("-----------------------------------");
    
    try {
      const bonding = await ethers.getContractAt("Bonding", BONDING_ADDRESS);
      
      // Get bonding contract state
      const fvcAllocated = await bonding.fvcAllocated();
      const fvcSold = await bonding.fvcSold();
      const currentRound = await bonding.getCurrentRound();
      
      console.log("FVC Allocated to Bonding:", ethers.formatEther(fvcAllocated), "FVC");
      console.log("FVC Sold from Bonding:", ethers.formatEther(fvcSold), "FVC");
      console.log("FVC Available for Bonding:", ethers.formatEther(fvcAllocated - fvcSold), "FVC");
      console.log("Current Round ID:", currentRound.roundId.toString());
      console.log("Round Active:", currentRound.isActive);
      
      // Check if allocated matches balance
      const balanceMatchesAllocated = bondingBalance.toString() === fvcAllocated.toString();
      console.log("Balance matches allocated:", balanceMatchesAllocated ? "✅ YES" : "❌ NO");
      
    } catch (error) {
      console.log("❌ Cannot read bonding contract:", error.message);
    }
    
    console.log("\n🔍 STEP 4: Verify Dashboard Claims");
    console.log("-----------------------------------");
    
    // Dashboard claims:
    // - Total Supply: 1B FVC
    // - Bonding Contract: 300M FVC (30%)
    // - Unallocated: 700M FVC (70%)
    
    const expectedBonding = ethers.parseEther("300000000"); // 300M
    const expectedUnallocated = ethers.parseEther("700000000"); // 700M
    
    console.log("Dashboard Claims vs Reality:");
    console.log("1B Total Supply:", isCorrectSupply ? "✅ VERIFIED" : "❌ FALSE");
    console.log("300M Bonding (30%):", bondingBalance.toString() === expectedBonding.toString() ? "✅ VERIFIED" : "❌ FALSE");
    
    // Calculate actual unallocated (everything not in bonding)
    const actualUnallocated = totalSupply - bondingBalance;
    const unallocatedPercentage = (Number(actualUnallocated) / Number(totalSupply)) * 100;
    
    console.log("700M Unallocated (70%):", actualUnallocated.toString() === expectedUnallocated.toString() ? "✅ VERIFIED" : "❌ FALSE");
    console.log("Actual Unallocated:", ethers.formatEther(actualUnallocated), "FVC (", unallocatedPercentage.toFixed(1), "%)");
    
    console.log("\n📊 VERIFICATION SUMMARY");
    console.log("=========================");
    
    if (isCorrectSupply && bondingBalance.toString() === expectedBonding.toString() && actualUnallocated.toString() === expectedUnallocated.toString()) {
      console.log("🎉 ALL CLAIMS VERIFIED ON-CHAIN!");
      console.log("✅ The 30/70 split is legitimate, not just graphical");
      console.log("✅ Dashboard accurately reflects blockchain state");
    } else {
      console.log("🚨 VERIFICATION FAILED!");
      console.log("❌ Dashboard claims do not match on-chain reality");
      console.log("❌ The 30/70 split may be just graphical");
      
      if (!isCorrectSupply) {
        console.log("   - Total supply is not 1B FVC");
      }
      if (bondingBalance.toString() !== expectedBonding.toString()) {
        console.log("   - Bonding allocation is not 300M FVC");
      }
      if (actualUnallocated.toString() !== expectedUnallocated.toString()) {
        console.log("   - Unallocated amount is not 700M FVC");
      }
    }
    
    console.log("\n🔍 STEP 5: Where is the FVC Really?");
    console.log("-------------------------------------");
    
    // Sum up all known balances
    const knownBalances = bondingBalance + treasuryBalance + adminBalance;
    const unknownBalance = totalSupply - knownBalances;
    
    console.log("Known Balances:", ethers.formatEther(knownBalances), "FVC");
    console.log("Unknown/Other Balances:", ethers.formatEther(unknownBalance), "FVC");
    
    if (unknownBalance > BigInt(0)) {
      console.log("⚠️  There are FVC tokens in addresses not checked above");
      console.log("   This could be the 'unallocated' 700M FVC");
    }
    
  } catch (error) {
    console.error("🚨 Verification failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("🚨 Script failed:", error);
    process.exit(1);
  });
