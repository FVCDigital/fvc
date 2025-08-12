const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Debugging Initialization...");

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

  // Test parameters
  console.log("\n🔧 Step 4: Testing initialization parameters...");
  const SAFE_ADDRESS = "0x7f1EE89fDB16b57930b7F53Bb998f25d917F35D9";
  const INITIAL_DISCOUNT = 20;
  const FINAL_DISCOUNT = 10;
  const EPOCH_CAP = ethers.parseUnits("10000000", 6); // 10M USDC
  const WALLET_CAP = ethers.parseUnits("1000000", 6); // 1M USDC per wallet
  const VESTING_PERIOD = 90 * 24 * 60 * 60; // 90 days

  console.log("FVC Address:", await fvc.getAddress());
  console.log("USDC Address:", await usdc.getAddress());
  console.log("Safe Address:", SAFE_ADDRESS);
  console.log("Initial Discount:", INITIAL_DISCOUNT);
  console.log("Final Discount:", FINAL_DISCOUNT);
  console.log("Epoch Cap:", ethers.formatUnits(EPOCH_CAP, 6));
  console.log("Wallet Cap:", ethers.formatUnits(WALLET_CAP, 6));
  console.log("Vesting Period:", VESTING_PERIOD);

  // Check if discount range is valid
  if (INITIAL_DISCOUNT <= FINAL_DISCOUNT) {
    console.log("❌ ERROR: Initial discount must be greater than final discount");
    console.log("Initial:", INITIAL_DISCOUNT, "Final:", FINAL_DISCOUNT);
    return;
  }

  if (VESTING_PERIOD == 0) {
    console.log("❌ ERROR: Vesting period cannot be zero");
    return;
  }

  console.log("✅ Parameters are valid");

  // Try to initialize with try-catch
  console.log("\n🔧 Step 5: Attempting initialization...");
  try {
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
    console.log("✅ Initialization successful!");
  } catch (error) {
    console.log("❌ Initialization failed:", error.message);
    
    // Try to get more details about the error
    try {
      const tx = await bonding.initialise.populateTransaction(
        await fvc.getAddress(),
        await usdc.getAddress(),
        SAFE_ADDRESS,
        INITIAL_DISCOUNT,
        FINAL_DISCOUNT,
        EPOCH_CAP,
        WALLET_CAP,
        VESTING_PERIOD
      );
      console.log("Transaction data:", tx.data);
    } catch (populateError) {
      console.log("Populate transaction failed:", populateError.message);
    }
  }

  console.log("\n🔗 Safe URL: https://safe.global/app/amoy:" + SAFE_ADDRESS);
  console.log("🔍 Explorer: https://www.oklink.com/amoy/address/" + SAFE_ADDRESS);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 