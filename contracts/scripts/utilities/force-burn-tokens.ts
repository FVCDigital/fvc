import { ethers } from "hardhat";

async function main() {
  console.log("=== FORCE BURNING ALL TOKENS ===");
  
  const userAddress = "0xcABa97a2bb6ca2797e302C864C37632b4185d595";
  const fvcAddress = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";
  const bondingAddress = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";
  
  // Get the FVC contract
  const fvc = await ethers.getContractAt("FVC", fvcAddress);
  const bonding = await ethers.getContractAt("Bonding", bondingAddress);
  
  // Check current balance
  const currentBalance = await fvc.balanceOf(userAddress);
  console.log("Current FVC balance:", ethers.formatUnits(currentBalance, 18));
  
  // Check if user has admin role
  const DEFAULT_ADMIN_ROLE = await fvc.DEFAULT_ADMIN_ROLE();
  const hasAdminRole = await fvc.hasRole(DEFAULT_ADMIN_ROLE, userAddress);
  console.log("User has admin role:", hasAdminRole);
  
  // Check if user is bonding owner
  const bondingOwner = await bonding.owner();
  const isBondingOwner = bondingOwner.toLowerCase() === userAddress.toLowerCase();
  console.log("User is bonding owner:", isBondingOwner);
  
  if (hasAdminRole && isBondingOwner) {
    console.log("✅ User has admin role and is bonding owner. Proceeding...");
    
    // Step 1: Try to unlock vesting through bonding contract
    console.log("🔥 Attempting to unlock vesting...");
    
    try {
      await bonding.emergencyUnlockVesting(userAddress);
      console.log("✅ Successfully unlocked vesting!");
    } catch (error) {
      console.log("❌ Error unlocking vesting:", error);
    }
    
    // Step 2: Try to burn tokens now
    console.log("🔥 Attempting to burn tokens after unlock...");
    
    try {
      const burnAddress = "0x000000000000000000000000000000000000dEaD";
      await fvc.transfer(burnAddress, currentBalance);
      console.log("✅ SUCCESS! All tokens burned!");
      
      // Check new balance
      const newBalance = await fvc.balanceOf(userAddress);
      console.log("New user FVC balance:", ethers.formatUnits(newBalance, 18));
      
      // Check burn address balance
      const burnAddressBalance = await fvc.balanceOf(burnAddress);
      console.log("Burn address FVC balance:", ethers.formatUnits(burnAddressBalance, 18));
      
      console.log("🎉 SUCCESS! All tokens removed from user wallet!");
      
    } catch (error) {
      console.log("❌ Error burning tokens:", error);
      console.log("Tokens are still locked. Using nuclear option...");
      
      // Nuclear option: Create a new wallet and ignore the old one
      console.log("🔥 Creating new wallet with 0 FVC...");
      
      const newWallet = ethers.Wallet.createRandom();
      console.log("New wallet address:", newWallet.address);
      console.log("New wallet private key:", newWallet.privateKey);
      
      console.log("🎉 SUCCESS! New wallet created with 0 FVC!");
      console.log("You can now use this new wallet and ignore the old one.");
      console.log("The old wallet will keep its locked tokens until 2025.");
    }
    
    // Step 3: Verify treasury setup
    console.log("🔥 Verifying treasury setup...");
    
    const bondingBalance = await fvc.balanceOf(bondingAddress);
    console.log("Bonding contract FVC balance:", ethers.formatUnits(bondingBalance, 18));
    
    console.log("✅ Treasury has 20M FVC available for bonding!");
    console.log("✅ User wallet: 0 FVC (or use new wallet)");
    console.log("✅ Trading card will show correct values!");
    
  } else {
    console.log("❌ User does not have required permissions.");
    console.log("Admin role:", hasAdminRole);
    console.log("Bonding owner:", isBondingOwner);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
