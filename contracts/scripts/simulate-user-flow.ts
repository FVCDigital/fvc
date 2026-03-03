import { ethers } from "hardhat";

/**
 * Simulate complete user flow on testnet
 * Run AFTER verify-testnet-deployment.ts passes all checks
 * 
 * Usage: yarn hardhat run scripts/simulate-user-flow.ts --network base-sepolia
 */

interface DeploymentAddresses {
  fvc: string;
  sale: string;
  staking: string;
  usdc: string;
  safe: string;
}

// Replace with actual deployed addresses
const ADDRESSES: DeploymentAddresses = {
  fvc: "0x7dA82193bf0671Bb1683Dd6488E914436827ae8e",
  sale: "0xd59b3F0EA3Daa359Ec799EB77c36a7bF8926c812",
  staking: "0x404307557837CDe827f7B4bbb5ea12bD69a6F7F5",
  usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia USDC
  safe: "0x468D5B7fb6201f7cFbbA9A08B3bF49474145F61f",
};

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("FVC USER FLOW SIMULATION");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // Validate addresses
  if (ADDRESSES.fvc === "0x0000000000000000000000000000000000000000") {
    console.error("❌ ERROR: Update ADDRESSES in script");
    process.exit(1);
  }

  const [user] = await ethers.getSigners();
  console.log("User address:", user.address);
  console.log();

  const fvc = await ethers.getContractAt("FVC", ADDRESSES.fvc);
  const sale = await ethers.getContractAt("Sale", ADDRESSES.sale);
  const staking = await ethers.getContractAt("Staking", ADDRESSES.staking);
  const usdc = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", ADDRESSES.usdc);

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1: Check USDC balance (user needs testnet USDC)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("STEP 1: Check USDC balance");
  console.log("─────────────────────────────────────────────────────────────");
  
  const usdcBalance = await usdc.balanceOf(user.address);
  console.log("USDC Balance:", ethers.formatUnits(usdcBalance, 6), "USDC");
  
  if (usdcBalance === 0n) {
    console.log("❌ No USDC - Get testnet USDC from faucet:");
    console.log("   https://faucet.circle.com/ (Base Sepolia)");
    process.exit(1);
  }
  console.log("✅ Sufficient USDC\n");

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2: Purchase FVC
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("STEP 2: Purchase FVC with USDC");
  console.log("─────────────────────────────────────────────────────────────");

  const purchaseAmount = ethers.parseUnits("5", 6); // 5 USDC
  console.log("Purchase amount:", ethers.formatUnits(purchaseAmount, 6), "USDC");

  // Check allowance
  const currentAllowance = await usdc.allowance(user.address, ADDRESSES.sale);
  if (currentAllowance < purchaseAmount) {
    console.log("Approving USDC...");
    const approveTx = await usdc.approve(ADDRESSES.sale, purchaseAmount);
    await approveTx.wait();
    console.log("✅ Approved");
  }

  // Buy FVC
  console.log("Buying FVC...");
  const rate = await sale.rate();
  const expectedFvc = (purchaseAmount * ethers.parseEther("1")) / rate;
  console.log("Expected FVC:", ethers.formatEther(expectedFvc), "FVC");

  const buyTx = await sale.buy(ADDRESSES.usdc, purchaseAmount);
  const buyReceipt = await buyTx.wait();
  console.log("✅ Purchase complete");
  console.log("   TX:", buyReceipt?.hash);

  // Wait for state to settle
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Verify balances
  const fvcBalance = await fvc.balanceOf(user.address);
  const safeUsdcBalance = await usdc.balanceOf(ADDRESSES.safe);
  console.log("FVC Balance:", ethers.formatEther(fvcBalance), "FVC");
  console.log("Safe received:", ethers.formatUnits(safeUsdcBalance, 6), "USDC");
  
  if (fvcBalance === 0n) {
    console.log("⚠️  FVC balance is 0 - transaction may still be processing");
    console.log("   Check transaction on BaseScan:");
    console.log("   https://sepolia.basescan.org/tx/" + buyReceipt?.hash);
    process.exit(1);
  }
  console.log();

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3: Stake FVC
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("STEP 3: Stake FVC");
  console.log("─────────────────────────────────────────────────────────────");

  const stakeAmount = fvcBalance; // Stake all
  console.log("Stake amount:", ethers.formatEther(stakeAmount), "FVC");

  // Approve staking contract
  console.log("Approving FVC...");
  const fvcApproveTx = await fvc.approve(ADDRESSES.staking, stakeAmount);
  await fvcApproveTx.wait();
  console.log("✅ Approved");

  // Stake
  console.log("Staking...");
  const stakeTx = await staking.stake(stakeAmount);
  const stakeReceipt = await stakeTx.wait();
  console.log("✅ Staked");
  console.log("   TX:", stakeReceipt?.hash);

  // Verify staking balance
  const stakedBalance = await staking.balanceOf(user.address);
  console.log("Staked Balance:", ethers.formatEther(stakedBalance), "FVC");
  console.log();

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 4: Check rewards (should be 0 if no notifyRewardAmount called)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("STEP 4: Check earned rewards");
  console.log("─────────────────────────────────────────────────────────────");

  const earned = await staking.earned(user.address);
  console.log("Earned rewards:", ethers.formatUnits(earned, 6), "USDC");

  const periodFinish = await staking.periodFinish();
  if (periodFinish === 0n) {
    console.log("⚠️  No rewards period active");
    console.log("   Safe must execute notifyRewardAmount()");
  } else {
    const now = Math.floor(Date.now() / 1000);
    const remaining = Number(periodFinish) - now;
    if (remaining > 0) {
      console.log("✅ Rewards period active");
      console.log("   Remaining:", (remaining / 86400).toFixed(2), "days");
    } else {
      console.log("⚠️  Rewards period ended");
    }
  }
  console.log();

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("USER FLOW SUMMARY");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("✅ Purchased", ethers.formatEther(fvcBalance), "FVC");
  console.log("✅ Staked", ethers.formatEther(stakedBalance), "FVC");
  console.log("✅ Earned", ethers.formatUnits(earned, 6), "USDC");
  console.log("═══════════════════════════════════════════════════════════════");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
