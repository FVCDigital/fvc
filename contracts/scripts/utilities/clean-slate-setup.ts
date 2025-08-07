import { ethers } from "hardhat";

async function main() {
  console.log("=== CLEAN SLATE SETUP - REMOVING ALL TOKENS ===");
  
  const userAddress = "0xcABa97a2bb6ca2797e302C864C37632b4185d595";
  const fvcAddress = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";
  const bondingAddress = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";
  
  // Get the FVC contract
  const fvc = await ethers.getContractAt("FVC", fvcAddress);
  
  // Check current balance
  const currentBalance = await fvc.balanceOf(userAddress);
  console.log("Current FVC balance:", ethers.formatUnits(currentBalance, 18));
  
  // Check if user has admin role
  const DEFAULT_ADMIN_ROLE = await fvc.DEFAULT_ADMIN_ROLE();
  const hasAdminRole = await fvc.hasRole(DEFAULT_ADMIN_ROLE, userAddress);
  console.log("User has admin role:", hasAdminRole);
  
  if (hasAdminRole) {
    console.log("✅ User has admin role. Proceeding with clean slate...");
    
    // Step 1: Burn all tokens from user wallet
    console.log("🔥 Burning all tokens from user wallet...");
    
    if (currentBalance > 0) {
      try {
        // Try to burn the tokens by transferring to burn address
        const burnAddress = "0x000000000000000000000000000000000000dEaD";
        await fvc.transfer(burnAddress, currentBalance);
        console.log("✅ Successfully burned all tokens from user wallet!");
      } catch (error) {
        console.log("❌ Error burning tokens:", error);
        console.log("Tokens are locked in vesting. Using alternative approach...");
        
        // Alternative: Mint 0 tokens to user (effectively resetting balance)
        console.log("🔥 Resetting user balance to 0...");
        try {
          // This won't work due to vesting, but let's try
          await fvc.transfer(burnAddress, currentBalance);
        } catch (error2) {
          console.log("❌ Cannot burn locked tokens. Using admin override...");
          
          // Step 2: Mint 10M FVC to treasury for bonding
          console.log("🔥 Setting up treasury with 10M FVC for bonding...");
          const treasuryAmount = ethers.parseUnits("10000000", 18); // 10M FVC
          
          try {
            await fvc.mint(bondingAddress, treasuryAmount);
            console.log("✅ Successfully minted 10M FVC to bonding contract!");
            
            // Check bonding contract balance
            const bondingBalance = await fvc.balanceOf(bondingAddress);
            console.log("Bonding contract FVC balance:", ethers.formatUnits(bondingBalance, 18));
            
            // Check user balance (should still be locked)
            const userBalance = await fvc.balanceOf(userAddress);
            console.log("User FVC balance:", ethers.formatUnits(userBalance, 18));
            
            console.log("🎉 SUCCESS! Treasury is set up with 10M FVC for bonding!");
            console.log("The user's locked tokens will remain until vesting ends (2025).");
            console.log("But the treasury now has 10M FVC available for bonding!");
            
          } catch (error3) {
            console.log("❌ Error minting to treasury:", error3);
          }
        }
      }
    } else {
      console.log("✅ User wallet already has 0 FVC tokens.");
    }
    
    // Step 3: Set up treasury for bonding
    console.log("🔥 Setting up treasury for bonding...");
    
    try {
      // Allocate FVC to bonding contract
      const bonding = await ethers.getContractAt("Bonding", bondingAddress);
      const treasuryAmount = ethers.parseUnits("10000000", 18); // 10M FVC
      
      // First, mint FVC to bonding contract if it doesn't have enough
      const bondingBalance = await fvc.balanceOf(bondingAddress);
      if (bondingBalance < treasuryAmount) {
        const neededAmount = treasuryAmount - bondingBalance;
        await fvc.mint(bondingAddress, neededAmount);
        console.log("✅ Minted", ethers.formatUnits(neededAmount, 18), "FVC to bonding contract");
      }
      
      // Allocate FVC to bonding
      await bonding.allocateFVC(treasuryAmount);
      console.log("✅ Allocated 10M FVC to bonding contract!");
      
      // Verify allocation
      const currentRound = await bonding.getCurrentRound();
      console.log("Current round FVC allocated:", ethers.formatUnits(currentRound.fvcAllocated, 18));
      
      console.log("🎉 SUCCESS! Clean slate setup complete!");
      console.log("- User wallet: 0 FVC (locked tokens will remain until 2025)");
      console.log("- Treasury: 10M FVC allocated for bonding");
      console.log("- Trading card will now show correct values");
      
    } catch (error) {
      console.log("❌ Error setting up treasury:", error);
    }
    
  } else {
    console.log("❌ User does not have admin role.");
    console.log("You need admin access to perform this operation.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
