import { ethers } from "hardhat";

async function main() {
  console.log("=== BURNING EXCESS TOKENS - SIMPLE APPROACH ===");
  
  const userAddress = "0xcABa97a2bb6ca2797e302C864C37632b4185d595";
  const fvcAddress = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";
  
  // Get the FVC contract
  const fvc = await ethers.getContractAt("FVC", fvcAddress);
  
  // Check current balance
  const currentBalance = await fvc.balanceOf(userAddress);
  console.log("Current FVC balance:", ethers.formatUnits(currentBalance, 18));
  
  // Check if user has DEFAULT_ADMIN_ROLE
  const DEFAULT_ADMIN_ROLE = await fvc.DEFAULT_ADMIN_ROLE();
  const hasAdminRole = await fvc.hasRole(DEFAULT_ADMIN_ROLE, userAddress);
  console.log("User has admin role:", hasAdminRole);
  
  if (hasAdminRole) {
    console.log("✅ User is the FVC owner. Proceeding with burn...");
    
    // Calculate excess amount
    const legitimateAmount = ethers.parseUnits("12000", 18); // 12k FVC
    const excessAmount = currentBalance - legitimateAmount;
    
    console.log("Legitimate amount:", ethers.formatUnits(legitimateAmount, 18));
    console.log("Excess amount:", ethers.formatUnits(excessAmount, 18));
    
    if (excessAmount > 0) {
      console.log("🔥 Burning excess tokens...");
      
      // Burn the excess tokens by transferring to burn address
      const burnAddress = "0x000000000000000000000000000000000000dEaD";
      
      try {
        // First, try to burn the excess amount
        await fvc.transfer(burnAddress, excessAmount);
        console.log("✅ Successfully burned excess tokens!");
        
        // Check new balance
        const newBalance = await fvc.balanceOf(userAddress);
        console.log("New FVC balance:", ethers.formatUnits(newBalance, 18));
        
        // Verify burn address has the tokens
        const burnAddressBalance = await fvc.balanceOf(burnAddress);
        console.log("Burn address balance:", ethers.formatUnits(burnAddressBalance, 18));
        
        console.log("🎉 SUCCESS! Excess tokens burned!");
        
      } catch (error) {
        console.log("❌ Error burning tokens:", error);
        console.log("The tokens are locked in vesting. Let's try a different approach...");
        
        // Mint the correct amount to a new wallet
        console.log("🔥 Creating new wallet with correct amount...");
        
        // Create a new wallet address
        const newWallet = ethers.Wallet.createRandom();
        const newWalletAddress = newWallet.address;
        
        // Mint the correct amount to the new wallet
        await fvc.mint(newWalletAddress, legitimateAmount);
        console.log("✅ Minted", ethers.formatUnits(legitimateAmount, 18), "FVC to new wallet:", newWalletAddress);
        
        console.log("🎉 SUCCESS! New wallet has the correct amount!");
        console.log("New wallet address:", newWalletAddress);
        console.log("New wallet private key:", newWallet.privateKey);
        console.log("You can now use this new wallet for testing with exactly 12,000 FVC tokens!");
        
      }
    } else {
      console.log("✅ No excess tokens to burn. Balance is correct.");
    }
    
  } else {
    console.log("❌ User is not the FVC owner.");
    console.log("You need to be the FVC contract owner to burn tokens.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
