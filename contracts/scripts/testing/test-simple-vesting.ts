import { ethers } from "hardhat";

async function main() {
  console.log("🧪 Testing SimpleFVCVesting...");

  const [deployer, investor1, investor2, investor3] = await ethers.getSigners();
  
  // Contract addresses (update these after deployment)
  const FVC_TOKEN_ADDRESS = process.env.FVC_TOKEN_ADDRESS || "";
  const VESTING_CONTRACT_ADDRESS = process.env.VESTING_CONTRACT_ADDRESS || "";
  
  if (!FVC_TOKEN_ADDRESS || !VESTING_CONTRACT_ADDRESS) {
    console.log("❌ Please set FVC_TOKEN_ADDRESS and VESTING_CONTRACT_ADDRESS in .env");
    console.log("   Or deploy first using: npx hardhat run scripts/deployment/deploy-simple-vesting.ts");
    return;
  }

  // Get contract instances
  const fvcToken = await ethers.getContractAt("IERC20", FVC_TOKEN_ADDRESS);
  const vestingContract = await ethers.getContractAt("SimpleFVCVesting", VESTING_CONTRACT_ADDRESS);

  console.log("\n📊 Initial State:");
  const deployerBalance = await fvcToken.balanceOf(deployer.address);
  console.log("Deployer FVC balance:", ethers.formatEther(deployerBalance));
  console.log("Total vesting tokens:", ethers.formatEther(await vestingContract.totalVestingTokens()));
  console.log("Beneficiary count:", await vestingContract.getBeneficiaryCount());

  // Test 1: Grant SALE_ROLE to deployer (simulating SaleAdmin)
  console.log("\n🧪 Test 1: Granting SALE_ROLE...");
  try {
    const tx1 = await vestingContract.connect(deployer).grantSaleRole(deployer.address);
    await tx1.wait();
    console.log("✅ SALE_ROLE granted to deployer");
  } catch (error) {
    console.log("ℹ️  SALE_ROLE might already be granted or other issue:", error.message);
  }

  // Test 2: Create single vesting schedule
  console.log("\n🧪 Test 2: Creating single vesting schedule...");
  
  const vestingAmount1 = ethers.parseEther("10000"); // 10,000 FVC tokens
  
  // Check if deployer has enough balance
  if (deployerBalance < vestingAmount1) {
    console.log("❌ Insufficient FVC balance for testing");
    console.log("   Need:", ethers.formatEther(vestingAmount1));
    console.log("   Have:", ethers.formatEther(deployerBalance));
    return;
  }
  
  // Approve vesting contract to spend FVC tokens
  console.log("Approving FVC tokens for vesting contract...");
  await fvcToken.connect(deployer).approve(VESTING_CONTRACT_ADDRESS, vestingAmount1);
  
  // Create vesting schedule
  console.log("Creating vesting schedule for investor1...");
  const tx2 = await vestingContract.connect(deployer).createVestingSchedule(
    investor1.address,
    vestingAmount1
  );
  await tx2.wait();
  console.log("✅ Vesting schedule created for investor1");

  // Test 3: Check vesting schedule details
  console.log("\n🧪 Test 3: Checking vesting schedule details...");
  
  const schedule = await vestingContract.vestingSchedules(investor1.address);
  console.log("Total amount:", ethers.formatEther(schedule.totalAmount));
  console.log("Released amount:", ethers.formatEther(schedule.releasedAmount));
  console.log("Start time:", new Date(Number(schedule.startTime) * 1000).toISOString());
  console.log("Cliff time:", new Date(Number(schedule.cliffTime) * 1000).toISOString());
  console.log("End time:", new Date(Number(schedule.endTime) * 1000).toISOString());

  // Test 4: Check vesting calculations
  console.log("\n🧪 Test 4: Checking vesting calculations...");
  
  const vestedAmount = await vestingContract.calculateVestedAmount(investor1.address);
  const releasableAmount = await vestingContract.getReleasableAmount(investor1.address);
  const vestingProgress = await vestingContract.getVestingProgress(investor1.address);
  const cliffPassed = await vestingContract.isCliffPassed(investor1.address);
  
  console.log("Vested amount:", ethers.formatEther(vestedAmount));
  console.log("Releasable amount:", ethers.formatEther(releasableAmount));
  console.log("Vesting progress:", vestingProgress.toString() + "%");
  console.log("Cliff passed:", cliffPassed);

  // Test 5: Try to release tokens (should fail if cliff not passed)
  console.log("\n🧪 Test 5: Testing token release...");
  
  if (releasableAmount > 0) {
    try {
      const tx3 = await vestingContract.connect(investor1).release();
      await tx3.wait();
      console.log("✅ Tokens released successfully");
      
      // Check investor1's balance
      const investor1Balance = await fvcToken.balanceOf(investor1.address);
      console.log("Investor1 FVC balance:", ethers.formatEther(investor1Balance));
    } catch (error) {
      console.log("❌ Token release failed:", error.message);
    }
  } else {
    console.log("ℹ️  No tokens available for release (cliff not passed or already released)");
  }

  // Test 6: Batch creation
  console.log("\n🧪 Test 6: Testing batch vesting creation...");
  
  const batchBeneficiaries = [investor2.address, investor3.address];
  const batchAmounts = [ethers.parseEther("5000"), ethers.parseEther("7500")];
  const totalBatchAmount = ethers.parseEther("12500");
  
  // Check if enough balance for batch
  const currentBalance = await fvcToken.balanceOf(deployer.address);
  if (currentBalance >= totalBatchAmount) {
    // Approve batch amount
    await fvcToken.connect(deployer).approve(VESTING_CONTRACT_ADDRESS, totalBatchAmount);
    
    // Create batch
    const tx4 = await vestingContract.connect(deployer).createVestingSchedulesBatch(
      batchBeneficiaries,
      batchAmounts
    );
    await tx4.wait();
    
    console.log("✅ Batch vesting schedules created!");
  } else {
    console.log("ℹ️  Insufficient balance for batch creation test");
    console.log("   Need:", ethers.formatEther(totalBatchAmount));
    console.log("   Have:", ethers.formatEther(currentBalance));
  }

  // Test 7: Final statistics
  console.log("\n📊 Final Statistics:");
  const finalTotalVesting = await vestingContract.totalVestingTokens();
  const finalBeneficiaryCount = await vestingContract.getBeneficiaryCount();
  
  console.log("Total vesting tokens:", ethers.formatEther(finalTotalVesting));
  console.log("Total beneficiaries:", finalBeneficiaryCount.toString());
  
  // List all beneficiaries
  console.log("\n👥 Beneficiaries:");
  for (let i = 0; i < finalBeneficiaryCount; i++) {
    const beneficiary = await vestingContract.getBeneficiaryAt(i);
    const beneficiarySchedule = await vestingContract.vestingSchedules(beneficiary);
    console.log(`${i + 1}. ${beneficiary} - ${ethers.formatEther(beneficiarySchedule.totalAmount)} FVC`);
  }

  console.log("\n✅ All tests completed!");
  
  console.log("\n🎯 Real-World Usage:");
  console.log("1. Deploy this contract");
  console.log("2. Grant SALE_ROLE to your SaleAdmin contract");
  console.log("3. When investors buy tokens, call createVestingSchedule()");
  console.log("4. Investors can call release() after cliff period");
  console.log("5. Build a frontend to show vesting progress");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
