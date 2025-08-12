const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 Testing Bonding with Fixed Issues...");

  // Get signers
  const signers = await ethers.getSigners();
  const user = signers[0];

  // Load contract factories
  const Bonding = await ethers.getContractFactory("Bonding");
  const FVC = await ethers.getContractFactory("FVC");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");

  // Get deployed contract addresses
  const BONDING_ADDRESS = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";
  const FVC_ADDRESS = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";
  const USDC_ADDRESS = "0x11Cf72a75e284B61548B87fB5ad8B8693FCfB1fb";
  const SAFE_ADDRESS = "0x7f1EE89fDB16b57930b7F53Bb998f25d917F35D9";

  // Load deployed contracts
  const bonding = Bonding.attach(BONDING_ADDRESS);
  const fvc = FVC.attach(FVC_ADDRESS);
  const usdc = MockUSDC.attach(USDC_ADDRESS);

  console.log("📋 Current State:");
  console.log("User address:", user.address);
  console.log("Safe address:", SAFE_ADDRESS);

  // Check current balances
  const userUSDCBalance = await usdc.balanceOf(user.address);
  const userFVCBalance = await fvc.balanceOf(user.address);
  const safeUSDCBalance = await usdc.balanceOf(SAFE_ADDRESS);
  const safeFVCBalance = await fvc.balanceOf(SAFE_ADDRESS);

  console.log("\n💰 Current Balances:");
  console.log("User USDC:", ethers.formatUnits(userUSDCBalance, 6));
  console.log("User FVC:", ethers.formatUnits(userFVCBalance, 18));
  console.log("Safe USDC:", ethers.formatUnits(safeUSDCBalance, 6));
  console.log("Safe FVC:", ethers.formatUnits(safeFVCBalance, 18));

  // Check current allowance
  const currentAllowance = await usdc.allowance(user.address, BONDING_ADDRESS);
  console.log("Current USDC allowance:", ethers.formatUnits(currentAllowance, 6));

  // Approve USDC for bonding (if needed)
  if (currentAllowance < ethers.parseUnits("1000", 6)) {
    console.log("\n✅ Approving USDC for bonding...");
    const APPROVE_AMOUNT = ethers.parseUnits("10000", 6); // 10K USDC
    await usdc.connect(user).approve(BONDING_ADDRESS, APPROVE_AMOUNT);
    console.log("✅ Approved USDC for bonding");
  }

  // Test bonding with smaller amount
  console.log("\n🔗 Testing bonding transaction...");
  const BOND_AMOUNT = ethers.parseUnits("100", 6); // 100 USDC (smaller amount)
  
  try {
    await bonding.connect(user).bond(BOND_AMOUNT);
    console.log("✅ Successfully bonded 100 USDC for FVC");
  } catch (error) {
    console.log("❌ Bonding failed:", error.message);
    return;
  }

  // Check final balances
  console.log("\n📊 Final Verification:");
  const finalUserUSDCBalance = await usdc.balanceOf(user.address);
  const finalUserFVCBalance = await fvc.balanceOf(user.address);
  const finalSafeUSDCBalance = await usdc.balanceOf(SAFE_ADDRESS);
  const finalSafeFVCBalance = await fvc.balanceOf(SAFE_ADDRESS);

  console.log("=== TREASURY VERIFICATION ===");
  console.log("Safe address:", SAFE_ADDRESS);
  console.log("Safe FVC balance:", ethers.formatUnits(finalSafeFVCBalance, 18));
  console.log("Safe USDC balance:", ethers.formatUnits(finalSafeUSDCBalance, 6));
  console.log("User FVC balance:", ethers.formatUnits(finalUserFVCBalance, 18));
  console.log("User USDC balance:", ethers.formatUnits(finalUserUSDCBalance, 6));

  // Calculate FVC received
  const fvcReceived = finalUserFVCBalance - userFVCBalance;
  const usdcSpent = userUSDCBalance - finalUserUSDCBalance;
  
  console.log("\n🎯 Transaction Summary:");
  console.log("USDC spent:", ethers.formatUnits(usdcSpent, 6));
  console.log("FVC received:", ethers.formatUnits(fvcReceived, 18));
  console.log("Exchange rate:", ethers.formatUnits(fvcReceived, 18) / ethers.formatUnits(usdcSpent, 6), "FVC per USDC");

  console.log("\n🎉 Treasury test complete!");
  console.log("🔗 Safe URL: https://safe.global/app/amoy:" + SAFE_ADDRESS);
  console.log("🔍 Explorer: https://www.oklink.com/amoy/address/" + SAFE_ADDRESS);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 