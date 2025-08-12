const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting new deployment setup...\n");
  
  // Get the admin wallet (first signer)
  const [admin] = await ethers.getSigners();
  console.log("Admin address:", admin.address);
  
  // Update these addresses after running the deployment scripts
  const FVC_ADDRESS = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057"; // Update with new address
  const BONDING_ADDRESS = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9"; // Update with new address
  
  console.log("Using addresses:");
  console.log("FVC:", FVC_ADDRESS);
  console.log("Bonding:", BONDING_ADDRESS);
  console.log("");

  // Get contract instances
  const fvc = await ethers.getContractAt("FVC", FVC_ADDRESS);
  const bonding = await ethers.getContractAt("Bonding", BONDING_ADDRESS);

  // Step 1: Set bonding contract in FVC
  console.log("📝 Step 1: Setting bonding contract in FVC...");
  try {
    const setBondingTx = await fvc.setBondingContract(BONDING_ADDRESS);
    console.log("Set bonding contract tx hash:", setBondingTx.hash);
    await setBondingTx.wait();
    console.log("✅ Bonding contract address set in FVC contract.\n");
  } catch (error) {
    console.log("⚠️  Bonding contract already set or error:", error.message);
  }

  // Step 2: Start a new round
  console.log("🔄 Step 2: Starting new round...");
  try {
    const initialDiscount = 20; // 20%
    const finalDiscount = 10; // 10%
    const epochCap = ethers.parseUnits("10000000", 18); // 10M FVC
    const walletCap = ethers.parseUnits("1000000", 18); // 1M FVC per wallet
    const vestingPeriod = 90 * 24 * 60 * 60; // 90 days

    const startRoundTx = await bonding.startNewRound(
      initialDiscount,
      finalDiscount,
      epochCap,
      walletCap,
      vestingPeriod
    );
    console.log("Start new round tx hash:", startRoundTx.hash);
    await startRoundTx.wait();
    console.log("✅ New round started.\n");
  } catch (error) {
    console.log("⚠️  Round already started or error:", error.message);
  }

  // Step 3: Mint FVC to admin wallet
  console.log("💰 Step 3: Minting FVC to admin wallet...");
  try {
    const FVC_TO_MINT = ethers.parseUnits("1000000", 18); // 1M FVC
    
    // Check if admin has MINTER_ROLE
    const MINTER_ROLE = await fvc.MINTER_ROLE();
    const hasMinterRole = await fvc.hasRole(MINTER_ROLE, admin.address);
    
    if (!hasMinterRole) {
      console.log("Granting MINTER_ROLE to admin...");
      const grantTx = await fvc.grantRole(MINTER_ROLE, admin.address);
      console.log("Grant MINTER_ROLE tx hash:", grantTx.hash);
      await grantTx.wait();
      console.log("✅ MINTER_ROLE granted to admin");
    }

    const mintTx = await fvc.mint(admin.address, FVC_TO_MINT);
    console.log("Mint tx hash:", mintTx.hash);
    await mintTx.wait();
    console.log(`✅ Successfully minted ${ethers.formatUnits(FVC_TO_MINT, 18)} FVC to admin wallet.\n`);
  } catch (error) {
    console.log("⚠️  Minting failed or already minted:", error.message);
  }

  // Step 4: Allocate FVC to bonding contract
  console.log("📊 Step 4: Allocating FVC to bonding contract...");
  try {
    const FVC_TO_ALLOCATE = ethers.parseUnits("100000", 18); // 100K FVC
    
    // Check admin balance
    const adminBalance = await fvc.balanceOf(admin.address);
    console.log(`Admin FVC balance: ${ethers.formatUnits(adminBalance, 18)} FVC`);
    
    if (adminBalance < FVC_TO_ALLOCATE) {
      console.log("❌ Insufficient balance. Minting more FVC...");
      const additionalMint = FVC_TO_ALLOCATE - adminBalance;
      const mintTx = await fvc.mint(admin.address, additionalMint);
      await mintTx.wait();
      console.log(`✅ Minted additional ${ethers.formatUnits(additionalMint, 18)} FVC`);
    }

    // Approve bonding contract to transfer FVC
    const approveTx = await fvc.approve(BONDING_ADDRESS, FVC_TO_ALLOCATE);
    console.log("Approve tx hash:", approveTx.hash);
    await approveTx.wait();
    console.log("✅ Approved bonding contract to spend FVC");

    // Allocate FVC to bonding contract
    const allocTx = await bonding.allocateFVC(FVC_TO_ALLOCATE);
    console.log("Allocate tx hash:", allocTx.hash);
    await allocTx.wait();
    console.log(`✅ Allocated ${ethers.formatUnits(FVC_TO_ALLOCATE, 18)} FVC to bonding contract.\n`);
  } catch (error) {
    console.log("⚠️  Allocation failed:", error.message);
  }

  // Step 5: Display final status
  console.log("📋 Step 5: Final status check...");
  try {
    const currentRound = await bonding.getCurrentRound();
    const adminBalance = await fvc.balanceOf(admin.address);
    const bondingBalance = await fvc.balanceOf(BONDING_ADDRESS);
    
    console.log("\n=== FINAL STATUS ===");
    console.log("Current Round:", currentRound.roundId.toString());
    console.log("Round Active:", currentRound.isActive);
    console.log("FVC Allocated:", ethers.formatUnits(currentRound.fvcAllocated, 18));
    console.log("FVC Sold:", ethers.formatUnits(currentRound.fvcSold, 18));
    console.log("Admin FVC Balance:", ethers.formatUnits(adminBalance, 18));
    console.log("Bonding Contract FVC Balance:", ethers.formatUnits(bondingBalance, 18));
    console.log("==================\n");
    
    console.log("🎉 Setup complete! Your testnet deployment is ready.");
    console.log("You can now test bonding functionality in your dApp.");
  } catch (error) {
    console.log("⚠️  Status check failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
