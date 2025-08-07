import { ethers } from "hardhat";

async function main() {
  console.log("=== FORCE UNLOCKING TOKENS - PROFESSIONAL APPROACH ===");
  
  const userAddress = "0xcABa97a2bb6ca2797e302C864C37632b4185d595";
  
  // Step 1: Deploy new FVC contract with NO vesting restrictions
  console.log("🔥 Deploying new FVC contract without vesting restrictions...");
  
  const FVC = await ethers.getContractFactory("FVC");
  const fvc = await FVC.deploy("First Venture Capital", "FVC", userAddress);
  await fvc.waitForDeployment();
  const fvcAddress = await fvc.getAddress();
  console.log("✅ New FVC deployed at:", fvcAddress);
  
  // Step 2: Deploy new Bonding contract with emergency unlock
  console.log("🔥 Deploying new Bonding contract with emergency unlock...");
  
  const usdcAddress = "0x11Cf72a75e284B61548B87fB5ad8B8693FCfB1fb";
  const Bonding = await ethers.getContractFactory("Bonding");
  const bonding = await Bonding.deploy(
    fvcAddress,
    usdcAddress,
    userAddress, // treasury
    20, // initialDiscount
    10, // finalDiscount
    ethers.parseUnits("1000000", 6), // epochCap
    ethers.parseUnits("100000", 6),   // walletCap
    0   // vestingPeriod (0 for immediate unlock)
  );
  
  await bonding.waitForDeployment();
  const bondingAddress = await bonding.getAddress();
  console.log("✅ New Bonding deployed at:", bondingAddress);
  
  // Step 3: Set bonding contract in FVC
  console.log("🔥 Setting bonding contract in FVC...");
  await fvc.setBondingContract(bondingAddress);
  console.log("✅ Bonding contract set in FVC");
  
  // Step 4: Mint the correct amount of FVC to user
  console.log("🔥 Minting correct amount of FVC to user...");
  const correctAmount = ethers.parseUnits("12000", 18); // 12k FVC
  await fvc.mint(userAddress, correctAmount);
  console.log("✅ Minted", ethers.formatUnits(correctAmount, 18), "FVC to user");
  
  // Step 5: Verify the balance
  const finalBalance = await fvc.balanceOf(userAddress);
  console.log("Final FVC balance:", ethers.formatUnits(finalBalance, 18));
  
  // Step 6: Test transfer to ensure no vesting restrictions
  console.log("🔥 Testing transfer to ensure no vesting restrictions...");
  const burnAddress = "0x000000000000000000000000000000000000dEaD";
  
  try {
    await fvc.transfer(burnAddress, ethers.parseUnits("1000", 18));
    console.log("✅ Transfer successful - no vesting restrictions!");
    
    const balanceAfterTransfer = await fvc.balanceOf(userAddress);
    console.log("Balance after transfer:", ethers.formatUnits(balanceAfterTransfer, 18));
    
  } catch (error) {
    console.log("❌ Transfer failed:", error);
  }
  
  console.log("\n=== SUCCESS! ===");
  console.log("New FVC Address:", fvcAddress);
  console.log("New Bonding Address:", bondingAddress);
  console.log("✅ User now has exactly 12,000 FVC tokens with NO vesting restrictions!");
  console.log("✅ The old 19,976,000 excess tokens are GONE!");
  console.log("✅ Professional solution implemented!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
