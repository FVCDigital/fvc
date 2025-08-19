import { ethers, upgrades } from "hardhat";

async function main() {
  console.log("🚀 Deploying FVC Vesting System...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)));

  // Get FVC token address (adjust based on your deployment)
  const FVC_TOKEN_ADDRESS = process.env.FVC_TOKEN_ADDRESS || "0x..."; // Replace with actual FVC token address
  
  if (FVC_TOKEN_ADDRESS === "0x...") {
    throw new Error("Please set FVC_TOKEN_ADDRESS in your .env file");
  }

  // Deploy FVCVestingFactory
  console.log("\n📦 Deploying FVCVestingFactory...");
  const FVCVestingFactory = await ethers.getContractFactory("FVCVestingFactory");
  const vestingFactory = await FVCVestingFactory.deploy(
    FVC_TOKEN_ADDRESS,
    deployer.address // Factory admin
  );
  await vestingFactory.waitForDeployment();
  
  const factoryAddress = await vestingFactory.getAddress();
  console.log("✅ FVCVestingFactory deployed to:", factoryAddress);

  // Verification info
  console.log("\n📝 Deployment Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🏭 FVCVestingFactory:", factoryAddress);
  console.log("🪙 FVC Token:", FVC_TOKEN_ADDRESS);
  console.log("👤 Factory Admin:", deployer.address);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Save deployment addresses to file
  const deploymentInfo = {
    vestingFactory: factoryAddress,
    fvcToken: FVC_TOKEN_ADDRESS,
    admin: deployer.address,
    network: (await ethers.provider.getNetwork()).name,
    deployedAt: new Date().toISOString()
  };

  // In a real project, you'd save this to a JSON file
  console.log("\n💾 Save this info for frontend integration:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  console.log("\n🎯 Next Steps:");
  console.log("1. Grant SALE_ROLE to your SaleAdmin contract:");
  console.log(`   vestingFactory.grantSaleRole("SALE_ADMIN_ADDRESS")`);
  console.log("2. Approve FVC tokens for the factory");
  console.log("3. Test creating a vesting wallet");
  
  console.log("\n✅ Deployment Complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
