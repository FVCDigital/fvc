import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying SimpleFVCVesting...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)));

  // Get FVC token address (adjust based on your deployment)
  const FVC_TOKEN_ADDRESS = process.env.FVC_TOKEN_ADDRESS || "0x..."; // Replace with actual FVC token address
  
  if (FVC_TOKEN_ADDRESS === "0x...") {
    console.log("⚠️  Warning: Using placeholder FVC token address");
    console.log("   Set FVC_TOKEN_ADDRESS in your .env file for production");
  }

  // Deploy SimpleFVCVesting
  console.log("\n📦 Deploying SimpleFVCVesting...");
  const SimpleFVCVesting = await ethers.getContractFactory("SimpleFVCVesting");
  const vestingContract = await SimpleFVCVesting.deploy(
    FVC_TOKEN_ADDRESS,
    deployer.address // Vesting admin
  );
  await vestingContract.waitForDeployment();
  
  const vestingAddress = await vestingContract.getAddress();
  console.log("✅ SimpleFVCVesting deployed to:", vestingAddress);

  // Get contract info
  const totalVesting = await vestingContract.totalVestingTokens();
  const beneficiaryCount = await vestingContract.getBeneficiaryCount();
  
  console.log("\n📊 Contract State:");
  console.log("Total vesting tokens:", ethers.formatEther(totalVesting));
  console.log("Beneficiary count:", beneficiaryCount.toString());

  // Verification info
  console.log("\n📝 Deployment Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🏭 SimpleFVCVesting:", vestingAddress);
  console.log("🪙 FVC Token:", FVC_TOKEN_ADDRESS);
  console.log("👤 Vesting Admin:", deployer.address);
  console.log("⏰ Cliff Duration: 6 months");
  console.log("📈 Vesting Duration: 12 months after cliff");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Save deployment info
  const deploymentInfo = {
    vestingContract: vestingAddress,
    fvcToken: FVC_TOKEN_ADDRESS,
    admin: deployer.address,
    cliffDuration: "180 days", // 6 months
    vestingDuration: "365 days", // 12 months after cliff
    network: (await ethers.provider.getNetwork()).name,
    deployedAt: new Date().toISOString()
  };

  console.log("\n💾 Deployment Info (save for frontend):");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  console.log("\n🎯 Next Steps:");
  console.log("1. Grant SALE_ROLE to your SaleAdmin contract:");
  console.log(`   vestingContract.grantSaleRole("SALE_ADMIN_ADDRESS")`);
  console.log("2. Test creating a vesting schedule:");
  console.log(`   vestingContract.createVestingSchedule("INVESTOR_ADDRESS", amount)`);
  console.log("3. Integrate with your sale contract");
  
  console.log("\n🧪 Test Commands:");
  console.log("npx hardhat run scripts/testing/test-simple-vesting.ts --network amoy");
  
  console.log("\n✅ Deployment Complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
