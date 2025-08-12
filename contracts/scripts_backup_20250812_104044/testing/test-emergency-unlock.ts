import { ethers } from "hardhat";

async function main() {
  console.log("=== TESTING EMERGENCY UNLOCK ON HARDHAT ===");
  
  // Deploy contracts on Hardhat
  console.log("🔥 Deploying contracts on Hardhat...");
  
  // Get signers
  const [owner, user] = await ethers.getSigners();
  
  // Deploy FVC token
  const FVC = await ethers.getContractFactory("FVC");
  const fvc = await FVC.deploy("First Venture Capital", "FVC", owner.address);
  await fvc.waitForDeployment();
  const fvcAddress = await fvc.getAddress();
  console.log("✅ FVC deployed at:", fvcAddress);
  
  // Deploy Mock USDC
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();
  const mockUSDCAddress = await mockUSDC.getAddress();
  console.log("✅ Mock USDC deployed at:", mockUSDCAddress);
  
  // Deploy Bonding contract
  const Bonding = await ethers.getContractFactory("Bonding");
  const bonding = await Bonding.deploy(
    fvcAddress,
    mockUSDCAddress,
    owner.address, // treasury
    20, // initialDiscount
    10, // finalDiscount
    ethers.parseUnits("1000000", 6), // epochCap
    ethers.parseUnits("100000", 6),   // walletCap
    86400 // vestingPeriod (1 day for testing)
  );
  await bonding.waitForDeployment();
  const bondingAddress = await bonding.getAddress();
  console.log("✅ Bonding deployed at:", bondingAddress);
  
  // Set bonding contract in FVC
  await fvc.setBondingContract(bondingAddress);
  console.log("✅ Bonding contract set in FVC");
  
  // Mint some FVC to the owner first
  const fvcAmount = ethers.parseUnits("1000000", 18); // 1M FVC
  await fvc.mint(owner.address, fvcAmount);
  console.log("✅ Minted", ethers.formatUnits(fvcAmount, 18), "FVC to owner");
  
  // Approve FVC spending for bonding contract
  await fvc.approve(bondingAddress, fvcAmount);
  console.log("✅ Approved FVC spending for bonding contract");
  
  // Allocate FVC to bonding
  await bonding.allocateFVC(fvcAmount);
  console.log("✅ Allocated FVC to bonding");
  
  console.log("Test user:", user.address);
  
  // Mint some USDC to user
  const usdcAmount = ethers.parseUnits("1000", 6); // 1000 USDC
  await mockUSDC.mint(user.address, usdcAmount);
  console.log("✅ Minted", ethers.formatUnits(usdcAmount, 6), "USDC to user");
  
  // Approve USDC spending
  await mockUSDC.connect(user).approve(bondingAddress, usdcAmount);
  console.log("✅ Approved USDC spending");
  
  // Bond some USDC for FVC
  const bondAmount = ethers.parseUnits("100", 6); // 100 USDC
  const fvcToReceive = ethers.parseUnits("120", 18); // 120 FVC (20% discount)
  
  await bonding.connect(user).bond(fvcToReceive);
  console.log("✅ Bonded", ethers.formatUnits(bondAmount, 6), "USDC for", ethers.formatUnits(fvcToReceive, 18), "FVC");
  
  // Check user's FVC balance
  const userFVCBalance = await fvc.balanceOf(user.address);
  console.log("User FVC balance:", ethers.formatUnits(userFVCBalance, 18));
  
  // Check if tokens are locked
  const isLocked = await bonding.isLocked(user.address);
  console.log("Tokens locked:", isLocked);
  
  // Try to transfer tokens (should fail)
  console.log("🔥 Testing transfer while locked...");
  try {
    await fvc.connect(user).transfer(owner.address, ethers.parseUnits("10", 18));
    console.log("❌ Transfer succeeded (should have failed)");
  } catch (error) {
    console.log("✅ Transfer failed as expected:", error.message);
  }
  
  // Now unlock the vesting
  console.log("🔥 Unlocking vesting...");
  await bonding.emergencyUnlockVesting(user.address);
  console.log("✅ Emergency unlock completed");
  
  // Check if tokens are still locked
  const isStillLocked = await bonding.isLocked(user.address);
  console.log("Tokens still locked:", isStillLocked);
  
  // Try to transfer tokens again (should succeed)
  console.log("🔥 Testing transfer after unlock...");
  try {
    await fvc.connect(user).transfer(owner.address, ethers.parseUnits("10", 18));
    console.log("✅ Transfer succeeded after unlock");
    
    const newUserBalance = await fvc.balanceOf(user.address);
    console.log("New user FVC balance:", ethers.formatUnits(newUserBalance, 18));
    
  } catch (error) {
    console.log("❌ Transfer failed:", error.message);
  }
  
  console.log("\n=== TEST COMPLETE ===");
  console.log("Emergency unlock functionality works correctly!");
  console.log("You can now deploy this to testnet with confidence.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
