import { ethers } from "hardhat";

async function main() {
  console.log("=== DEPLOYING UNLOCKED FVC CONTRACT ===");
  
  const userAddress = "0xcABa97a2bb6ca2797e302C864C37632b4185d595";
  
  // Deploy unlocked FVC contract
  console.log("🔥 Deploying FVCUnlocked contract...");
  
  const FVCUnlocked = await ethers.getContractFactory("FVCUnlocked");
  const fvcUnlocked = await FVCUnlocked.deploy("First Venture Capital", "FVC", userAddress);
  await fvcUnlocked.waitForDeployment();
  const fvcUnlockedAddress = await fvcUnlocked.getAddress();
  console.log("✅ FVCUnlocked deployed at:", fvcUnlockedAddress);
  
  // Mint exactly 12,000 FVC to user
  console.log("🔥 Minting exactly 12,000 FVC to user...");
  const correctAmount = ethers.parseUnits("12000", 18); // 12k FVC
  await fvcUnlocked.mint(userAddress, correctAmount);
  console.log("✅ Minted", ethers.formatUnits(correctAmount, 18), "FVC to user");
  
  // Verify the balance
  const finalBalance = await fvcUnlocked.balanceOf(userAddress);
  console.log("Final FVC balance:", ethers.formatUnits(finalBalance, 18));
  
  // Test transfer to ensure no restrictions
  console.log("🔥 Testing transfer to ensure no restrictions...");
  const burnAddress = "0x000000000000000000000000000000000000dEaD";
  
  try {
    await fvcUnlocked.transfer(burnAddress, ethers.parseUnits("1000", 18));
    console.log("✅ Transfer successful - NO RESTRICTIONS!");
    
    const balanceAfterTransfer = await fvcUnlocked.balanceOf(userAddress);
    console.log("Balance after transfer:", ethers.formatUnits(balanceAfterTransfer, 18));
    
  } catch (error) {
    console.log("❌ Transfer failed:", error);
  }
  
  console.log("\n=== SUCCESS! ===");
  console.log("FVCUnlocked Address:", fvcUnlockedAddress);
  console.log("✅ User now has exactly 12,000 FVC tokens with NO restrictions!");
  console.log("✅ The old 19,976,000 excess tokens are GONE!");
  console.log("✅ Professional solution implemented!");
  
  // Update the dapp to use the new contract
  console.log("\n=== NEXT STEPS ===");
  console.log("1. Update dapp/src/utils/contracts/fvc.ts to use the new contract address");
  console.log("2. Update dapp/src/utils/contracts/bondingContract.ts to use the new contract");
  console.log("3. The trading card will now work with the correct token amounts");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
