import { ethers } from "hardhat";
import { Bonding, FVC, MockUSDC } from "../../typechain-types";

async function main() {
  console.log("🚀 FVC Protocol - Deploying Bonding System");
  console.log("=".repeat(60));

  try {
    const [deployer] = await ethers.getSigners();
    console.log("🧑‍💻 Deployer:", deployer.address);

    // ============ PHASE 1: DEPLOY FVC TOKEN ============
    console.log("\n📝 PHASE 1: Deploying FVC Token");
    console.log("-".repeat(40));

    const FVC = await ethers.getContractFactory("FVC");
    const fvc = await FVC.deploy("First Venture Capital", "FVC", deployer.address);
    await fvc.waitForDeployment();
    
    const fvcAddress = await fvc.getAddress();
    console.log("✅ FVC Token deployed to:", fvcAddress);

    // ============ PHASE 2: DEPLOY MOCK USDC ============
    console.log("\n💵 PHASE 2: Deploying Mock USDC");
    console.log("-".repeat(40));

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();
    
    const usdcAddress = await usdc.getAddress();
    console.log("✅ Mock USDC deployed to:", usdcAddress);

    // ============ PHASE 3: DEPLOY BONDING CONTRACT ============
    console.log("\n🔗 PHASE 3: Deploying Bonding Contract");
    console.log("-".repeat(40));

    const Bonding = await ethers.getContractFactory("Bonding");
    const bonding = await Bonding.deploy();
    await bonding.waitForDeployment();
    
    const bondingAddress = await bonding.getAddress();
    console.log("✅ Bonding Contract deployed to:", bondingAddress);

    // ============ PHASE 4: INITIALIZE BONDING CONTRACT ============
    console.log("\n⚙️  PHASE 4: Initializing Bonding Contract");
    console.log("-".repeat(40));

    // Treasury address (deployer for testing)
    const treasuryAddress = deployer.address;
    
    await bonding.initialize(fvcAddress, usdcAddress, treasuryAddress);
    console.log("✅ Bonding contract initialized");
    console.log("   Treasury:", treasuryAddress);

    // ============ PHASE 5: SETUP INITIAL STATE ============
    console.log("\n🔧 PHASE 5: Setting Up Initial State");
    console.log("-".repeat(40));

    // Mint FVC tokens to bonding contract
    const totalFVCAllocation = ethers.parseEther("225000000"); // 225M FVC
    await fvc.mint(bondingAddress, totalFVCAllocation);
    console.log("✅ Minted", ethers.formatEther(totalFVCAllocation), "FVC to bonding contract");

    // Mint USDC to deployer for testing
    const testUSDCAmount = ethers.parseUnits("1000000", 6); // 1M USDC
    await usdc.mint(deployer.address, testUSDCAmount);
    console.log("✅ Minted", ethers.formatUnits(testUSDCAmount, 6), "USDC to deployer");

    // ============ PHASE 6: START PRIVATE SALE ============
    console.log("\n🚀 PHASE 6: Starting Private Sale");
    console.log("-".repeat(40));

    const saleDuration = 30 * 24 * 60 * 60; // 30 days
    await bonding.startPrivateSale(saleDuration);
    console.log("✅ Private sale started for", Math.floor(saleDuration / (24 * 60 * 60)), "days");

    // ============ PHASE 7: VERIFICATION ============
    console.log("\n🔍 PHASE 7: Verification");
    console.log("-".repeat(40));

    // Check contract state
    const privateSaleActive = await bonding.privateSaleActive();
    const currentMilestone = await bonding.currentMilestone();
    const milestones = await bonding.getAllMilestones();
    
    console.log("Private Sale Active:", privateSaleActive);
    console.log("Current Milestone:", currentMilestone.toString());
    console.log("Total Milestones:", milestones.length);

    // Check FVC balance
    const bondingFVCBalance = await fvc.balanceOf(bondingAddress);
    console.log("Bonding Contract FVC Balance:", ethers.formatEther(bondingFVCBalance));

    // Check USDC balance
    const deployerUSDCBalance = await usdc.balanceOf(deployer.address);
    console.log("Deployer USDC Balance:", ethers.formatUnits(deployerUSDCBalance, 6));

    // ============ DEPLOYMENT SUMMARY ============
    console.log("\n🎯 DEPLOYMENT COMPLETE!");
    console.log("=".repeat(60));
    console.log("📋 Deployed Contracts:");
    console.log("FVC Token:", fvcAddress);
    console.log("Mock USDC:", usdcAddress);
    console.log("Bonding Contract:", bondingAddress);
    console.log("Treasury:", treasuryAddress);
    console.log("=".repeat(60));
    
    console.log("\n🚀 NEXT STEPS:");
    console.log("1. ✅ Contracts deployed successfully");
    console.log("2. ✅ Bonding system initialized");
    console.log("3. ✅ Private sale started");
    console.log("4. 🧪 Run tests: npx hardhat test");
    console.log("5. 🔍 Verify contracts on block explorer");
    console.log("6. 🎯 Ready for testing and mainnet deployment");

    // Save deployment addresses
    const deploymentInfo = {
      network: "hardhat",
      deployer: deployer.address,
      contracts: {
        fvc: fvcAddress,
        usdc: usdcAddress,
        bonding: bondingAddress,
        treasury: treasuryAddress
      },
      timestamp: new Date().toISOString(),
      saleDuration: saleDuration,
      totalFVCAllocation: ethers.formatEther(totalFVCAllocation)
    };

    console.log("\n💾 Deployment info saved for reference");
    console.log(JSON.stringify(deploymentInfo, null, 2));

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
