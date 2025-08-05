const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Setting up FVC Treasury...");

  // Get signers
  const signers = await ethers.getSigners();
  const admin = signers[0];
  const user = signers[1] || signers[0]; // Use admin if only one signer
  console.log("Admin address:", admin.address);
  console.log("User address:", user.address);
  console.log("Total signers available:", signers.length);

  // Load contract factories
  const FVC = await ethers.getContractFactory("FVC");
  const Bonding = await ethers.getContractFactory("Bonding");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");

  // Get deployed contract addresses
  const FVC_ADDRESS = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";
  const BONDING_ADDRESS = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";
  const USDC_ADDRESS = "0x11Cf72a75e284B61548B87fB5ad8B8693FCfB1fb";
  const SAFE_ADDRESS = "0x7f1EE89fDB16b57930b7F53Bb998f25d917F35D9";

  console.log("📋 Contract Addresses:");
  console.log("FVC:", FVC_ADDRESS);
  console.log("Bonding:", BONDING_ADDRESS);
  console.log("USDC:", USDC_ADDRESS);
  console.log("Safe Treasury:", SAFE_ADDRESS);

  // Load deployed contracts
  const fvc = FVC.attach(FVC_ADDRESS);
  const bonding = Bonding.attach(BONDING_ADDRESS);
  const usdc = MockUSDC.attach(USDC_ADDRESS);

  console.log("\n🔧 Step 1: Setting treasury address...");
  await bonding.setTreasury(SAFE_ADDRESS);
  console.log("✅ Treasury set to Safe address:", SAFE_ADDRESS);

  console.log("\n💰 Step 2: Minting FVC to Safe treasury...");
  const TREASURY_AMOUNT = ethers.parseUnits("10000000", 18); // 10M FVC
  await fvc.mint(SAFE_ADDRESS, TREASURY_AMOUNT);
  console.log("✅ Minted 10M FVC to Safe treasury");

  // Check Safe FVC balance
  const safeFVCBalance = await fvc.balanceOf(SAFE_ADDRESS);
  console.log("📊 Safe FVC balance:", ethers.formatUnits(safeFVCBalance, 18));

  console.log("\n💵 Step 3: Minting USDC to user for testing...");
  const USER_USDC_AMOUNT = ethers.parseUnits("10000", 6); // 10K USDC
  await usdc.mint(user.address, USER_USDC_AMOUNT);
  console.log("✅ Minted 10K USDC to user:", user.address);

  // Check user USDC balance
  const userUSDCBalance = await usdc.balanceOf(user.address);
  console.log("📊 User USDC balance:", ethers.formatUnits(userUSDCBalance, 6));

  console.log("\n✅ Step 4: Approving USDC for bonding...");
  const APPROVE_AMOUNT = ethers.parseUnits("10000", 6); // 10K USDC
  await usdc.connect(user).approve(BONDING_ADDRESS, APPROVE_AMOUNT);
  console.log("✅ Approved USDC for bonding");

  console.log("\n🔗 Step 5: Testing bonding transaction...");
  const BOND_AMOUNT = ethers.parseUnits("1000", 6); // 1K USDC
  await bonding.connect(user).bond(BOND_AMOUNT);
  console.log("✅ Bonded 1000 USDC for FVC");

  console.log("\n📊 Step 6: Final verification...");
  const finalSafeUSDCBalance = await usdc.balanceOf(SAFE_ADDRESS);
  const finalUserFVCBalance = await fvc.balanceOf(user.address);
  const finalUserUSDCBalance = await usdc.balanceOf(user.address);

  console.log("=== TREASURY VERIFICATION ===");
  console.log("Safe address:", SAFE_ADDRESS);
  console.log("Safe FVC balance:", ethers.formatUnits(await fvc.balanceOf(SAFE_ADDRESS), 18));
  console.log("Safe USDC balance:", ethers.formatUnits(finalSafeUSDCBalance, 6));
  console.log("User FVC balance:", ethers.formatUnits(finalUserFVCBalance, 18));
  console.log("User USDC balance:", ethers.formatUnits(finalUserUSDCBalance, 6));

  console.log("\n🎉 Treasury setup complete!");
  console.log("🔗 Safe URL: https://safe.global/app/amoy:" + SAFE_ADDRESS);
  console.log("🔍 Explorer: https://www.oklink.com/amoy/address/" + SAFE_ADDRESS);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 