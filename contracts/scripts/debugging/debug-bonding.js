const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Debugging Bonding Contract...");

  // Get signers
  const signers = await ethers.getSigners();
  const admin = signers[0];
  const user = signers[0]; // Use same signer for simplicity

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

  console.log("📋 Contract State:");
  console.log("Bonding address:", BONDING_ADDRESS);
  console.log("FVC address:", FVC_ADDRESS);
  console.log("USDC address:", USDC_ADDRESS);
  console.log("Safe address:", SAFE_ADDRESS);
  console.log("User address:", user.address);

  // Check bonding contract state
  console.log("\n🔍 Bonding Contract State:");
  try {
    const currentRound = await bonding.getCurrentRound();
    console.log("Current round:", currentRound);
    
    const treasury = await bonding.treasury();
    console.log("Treasury address:", treasury);
    
    const epochCap = await bonding.epochCap();
    console.log("Epoch cap:", ethers.formatUnits(epochCap, 6));
    
    const totalBonded = await bonding.totalBonded();
    console.log("Total bonded:", ethers.formatUnits(totalBonded, 6));
    
    const currentDiscount = await bonding.getCurrentDiscount();
    console.log("Current discount:", currentDiscount.toString());
    
    const isActive = currentRound.isActive;
    console.log("Round active:", isActive);
  } catch (error) {
    console.log("❌ Error reading bonding state:", error.message);
  }

  // Check user balances
  console.log("\n💰 User Balances:");
  try {
    const userUSDCBalance = await usdc.balanceOf(user.address);
    console.log("User USDC balance:", ethers.formatUnits(userUSDCBalance, 6));
    
    const userFVCBalance = await fvc.balanceOf(user.address);
    console.log("User FVC balance:", ethers.formatUnits(userFVCBalance, 18));
    
    const userBonded = await bonding.userBonded(1, user.address);
    console.log("User bonded amount:", ethers.formatUnits(userBonded, 6));
  } catch (error) {
    console.log("❌ Error reading user balances:", error.message);
  }

  // Check Safe balances
  console.log("\n🏦 Safe Balances:");
  try {
    const safeUSDCBalance = await usdc.balanceOf(SAFE_ADDRESS);
    console.log("Safe USDC balance:", ethers.formatUnits(safeUSDCBalance, 6));
    
    const safeFVCBalance = await fvc.balanceOf(SAFE_ADDRESS);
    console.log("Safe FVC balance:", ethers.formatUnits(safeFVCBalance, 18));
  } catch (error) {
    console.log("❌ Error reading Safe balances:", error.message);
  }

  // Check USDC allowance
  console.log("\n✅ USDC Allowance:");
  try {
    const allowance = await usdc.allowance(user.address, BONDING_ADDRESS);
    console.log("USDC allowance:", ethers.formatUnits(allowance, 6));
  } catch (error) {
    console.log("❌ Error reading allowance:", error.message);
  }

  // Try to estimate gas for bonding
  console.log("\n⛽ Gas Estimation:");
  try {
    const BOND_AMOUNT = ethers.parseUnits("1000", 6);
    const gasEstimate = await bonding.connect(user).bond.estimateGas(BOND_AMOUNT);
    console.log("Gas estimate for bonding:", gasEstimate.toString());
  } catch (error) {
    console.log("❌ Gas estimation failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 