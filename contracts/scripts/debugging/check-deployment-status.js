const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking deployment status...\n");
  
  // Get the admin wallet (first signer)
  const [admin] = await ethers.getSigners();
  console.log("Admin address:", admin.address);
  
  // Update these addresses after running the deployment scripts
  const FVC_ADDRESS = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057"; // Update with new address
  const BONDING_ADDRESS = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9"; // Update with new address
  const USDC_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
  
  console.log("Contract addresses:");
  console.log("FVC:", FVC_ADDRESS);
  console.log("Bonding:", BONDING_ADDRESS);
  console.log("USDC:", USDC_ADDRESS);
  console.log("");

  try {
    // Get contract instances
    const fvc = await ethers.getContractAt("FVC", FVC_ADDRESS);
    const bonding = await ethers.getContractAt("Bonding", BONDING_ADDRESS);
    const usdc = await ethers.getContractAt("MockUSDC", USDC_ADDRESS);

    // Check FVC contract
    console.log("📋 FVC Contract Status:");
    const fvcName = await fvc.name();
    const fvcSymbol = await fvc.symbol();
    const fvcDecimals = await fvc.decimals();
    const fvcTotalSupply = await fvc.totalSupply();
    const fvcAdminBalance = await fvc.balanceOf(admin.address);
    const fvcBondingBalance = await fvc.balanceOf(BONDING_ADDRESS);
    
    console.log(`  Name: ${fvcName}`);
    console.log(`  Symbol: ${fvcSymbol}`);
    console.log(`  Decimals: ${fvcDecimals}`);
    console.log(`  Total Supply: ${ethers.formatUnits(fvcTotalSupply, 18)} FVC`);
    console.log(`  Admin Balance: ${ethers.formatUnits(fvcAdminBalance, 18)} FVC`);
    console.log(`  Bonding Contract Balance: ${ethers.formatUnits(fvcBondingBalance, 18)} FVC`);

    // Check bonding contract
    console.log("\n📋 Bonding Contract Status:");
    const currentRound = await bonding.getCurrentRound();
    const currentDiscount = await bonding.getCurrentDiscount();
    const fvcToken = await bonding.fvcToken();
    const usdcToken = await bonding.usdcToken();
    const treasury = await bonding.treasury();
    
    console.log(`  FVC Token: ${fvcToken}`);
    console.log(`  USDC Token: ${usdcToken}`);
    console.log(`  Treasury: ${treasury}`);
    console.log(`  Current Round: ${currentRound.roundId.toString()}`);
    console.log(`  Round Active: ${currentRound.isActive}`);
    console.log(`  Current Discount: ${currentDiscount.toString()}%`);
    console.log(`  Initial Discount: ${currentRound.initialDiscount.toString()}%`);
    console.log(`  Final Discount: ${currentRound.finalDiscount.toString()}%`);
    console.log(`  Epoch Cap: ${ethers.formatUnits(currentRound.epochCap, 18)} FVC`);
    console.log(`  Wallet Cap: ${ethers.formatUnits(currentRound.walletCap, 18)} FVC`);
    console.log(`  FVC Allocated: ${ethers.formatUnits(currentRound.fvcAllocated, 18)} FVC`);
    console.log(`  FVC Sold: ${ethers.formatUnits(currentRound.fvcSold, 18)} FVC`);
    console.log(`  Total Bonded: ${ethers.formatUnits(currentRound.totalBonded, 6)} USDC`);

    // Check USDC contract
    console.log("\n📋 USDC Contract Status:");
    const usdcName = await usdc.name();
    const usdcSymbol = await usdc.symbol();
    const usdcDecimals = await usdc.decimals();
    const usdcTotalSupply = await usdc.totalSupply();
    const usdcAdminBalance = await usdc.balanceOf(admin.address);
    
    console.log(`  Name: ${usdcName}`);
    console.log(`  Symbol: ${usdcSymbol}`);
    console.log(`  Decimals: ${usdcDecimals}`);
    console.log(`  Total Supply: ${ethers.formatUnits(usdcTotalSupply, 6)} USDC`);
    console.log(`  Admin Balance: ${ethers.formatUnits(usdcAdminBalance, 6)} USDC`);

    // Check roles and permissions
    console.log("\n📋 Permissions Status:");
    const MINTER_ROLE = await fvc.MINTER_ROLE();
    const adminHasMinterRole = await fvc.hasRole(MINTER_ROLE, admin.address);
    const bondingHasMinterRole = await fvc.hasRole(MINTER_ROLE, BONDING_ADDRESS);
    
    console.log(`  Admin has MINTER_ROLE: ${adminHasMinterRole}`);
    console.log(`  Bonding has MINTER_ROLE: ${bondingHasMinterRole}`);

    // Check bonding contract in FVC
    try {
      const bondingContractInFVC = await fvc.bondingContract();
      console.log(`  Bonding contract set in FVC: ${bondingContractInFVC === BONDING_ADDRESS}`);
    } catch (error) {
      console.log(`  Bonding contract set in FVC: false (function not available)`);
    }

    // Summary
    console.log("\n🎯 DEPLOYMENT SUMMARY:");
    if (currentRound.isActive && currentRound.fvcAllocated > 0) {
      console.log("✅ Deployment is READY for testing!");
      console.log("✅ Bonding round is active");
      console.log("✅ FVC tokens are allocated");
      console.log("✅ Contracts are properly configured");
    } else {
      console.log("⚠️  Deployment needs setup:");
      if (!currentRound.isActive) console.log("  - Start a new round");
      if (currentRound.fvcAllocated === 0) console.log("  - Allocate FVC to bonding contract");
    }

    console.log("\n💡 Next steps:");
    console.log("1. Test bonding functionality in your dApp");
    console.log("2. Run bonding transactions to verify everything works");
    console.log("3. Check the UI shows correct stats");

  } catch (error) {
    console.error("❌ Error checking deployment status:", error.message);
    console.log("\n💡 Make sure to:");
    console.log("1. Update contract addresses in this script");
    console.log("2. Run the deployment scripts first");
    console.log("3. Run the setup script to configure everything");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
