const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying Updated Bonding Contract...");

  // Get signers
  const signers = await ethers.getSigners();
  const admin = signers[0];

  console.log("📋 Deployer:", admin.address);

  // Deploy FVC token
  console.log("\n🔧 Step 1: Deploying FVC token...");
  const FVC = await ethers.getContractFactory("FVC");
  const fvc = await FVC.deploy();
  await fvc.waitForDeployment();
  console.log("✅ FVC deployed to:", await fvc.getAddress());

  // Deploy Mock USDC
  console.log("\n🔧 Step 2: Deploying Mock USDC...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  console.log("✅ Mock USDC deployed to:", await usdc.getAddress());

  // Deploy Bonding contract
  console.log("\n🔧 Step 3: Deploying Bonding contract...");
  const Bonding = await ethers.getContractFactory("Bonding");
  const bonding = await Bonding.deploy();
  await bonding.waitForDeployment();
  console.log("✅ Bonding deployed to:", await bonding.getAddress());

  // Initialize bonding contract
  console.log("\n🔧 Step 4: Initializing bonding contract...");
  const SAFE_ADDRESS = "0x7f1EE89fDB16b57930b7F53Bb998f25d917F35D9";
  const INITIAL_DISCOUNT = 20;
  const FINAL_DISCOUNT = 10;
  const EPOCH_CAP = ethers.parseUnits("10000000", 6); // 10M USDC
  const WALLET_CAP = ethers.parseUnits("1000000", 6); // 1M USDC per wallet
  const VESTING_PERIOD = 90 * 24 * 60 * 60; // 90 days

  await bonding.initialise(
    await fvc.getAddress(),
    await usdc.getAddress(),
    SAFE_ADDRESS,
    INITIAL_DISCOUNT,
    FINAL_DISCOUNT,
    EPOCH_CAP,
    WALLET_CAP,
    VESTING_PERIOD
  );

  console.log("✅ Bonding contract initialized");

  // Set bonding contract in FVC token
  console.log("\n🔧 Step 5: Setting bonding contract in FVC token...");
  await fvc.setBondingContract(await bonding.getAddress());
  console.log("✅ Bonding contract set in FVC token");

  // Mint initial FVC to admin for testing
  console.log("\n🔧 Step 6: Minting initial FVC to admin...");
  const INITIAL_FVC = ethers.parseUnits("10000000", 18); // 10M FVC
  await fvc.mint(admin.address, INITIAL_FVC);
  console.log("✅ 10M FVC minted to admin");

  // Mint initial USDC to admin for testing
  console.log("\n🔧 Step 7: Minting initial USDC to admin...");
  const INITIAL_USDC = ethers.parseUnits("10000000", 6); // 10M USDC
  await usdc.mint(admin.address, INITIAL_USDC);
  console.log("✅ 10M USDC minted to admin");

  console.log("\n🎉 DEPLOYMENT COMPLETE!");
  console.log("📋 Contract Addresses:");
  console.log("FVC Token:", await fvc.getAddress());
  console.log("Mock USDC:", await usdc.getAddress());
  console.log("Bonding Contract:", await bonding.getAddress());
  console.log("Treasury (Safe):", SAFE_ADDRESS);

  console.log("\n📊 Initial Configuration:");
  console.log("Initial Discount:", INITIAL_DISCOUNT + "%");
  console.log("Final Discount:", FINAL_DISCOUNT + "%");
  console.log("Epoch Cap:", ethers.formatUnits(EPOCH_CAP, 6), "USDC");
  console.log("Wallet Cap:", ethers.formatUnits(WALLET_CAP, 6), "USDC");
  console.log("Vesting Period:", VESTING_PERIOD / (24 * 60 * 60), "days");

  console.log("\n🔗 Safe URL: https://safe.global/app/amoy:" + SAFE_ADDRESS);
  console.log("🔍 Explorer: https://www.oklink.com/amoy/address/" + SAFE_ADDRESS);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 