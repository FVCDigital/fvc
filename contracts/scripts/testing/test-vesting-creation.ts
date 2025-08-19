import { ethers } from "hardhat";

async function main() {
  console.log("🧪 Testing FVC Vesting Wallet Creation...");

  const [deployer, investor1, investor2] = await ethers.getSigners();
  
  // Contract addresses (update these after deployment)
  const FVC_TOKEN_ADDRESS = process.env.FVC_TOKEN_ADDRESS || "";
  const VESTING_FACTORY_ADDRESS = process.env.VESTING_FACTORY_ADDRESS || "";
  
  if (!FVC_TOKEN_ADDRESS || !VESTING_FACTORY_ADDRESS) {
    console.log("❌ Please set FVC_TOKEN_ADDRESS and VESTING_FACTORY_ADDRESS in .env");
    return;
  }

  // Get contract instances
  const fvcToken = await ethers.getContractAt("IFVC", FVC_TOKEN_ADDRESS);
  const vestingFactory = await ethers.getContractAt("FVCVestingFactory", VESTING_FACTORY_ADDRESS);

  console.log("\n📊 Initial State:");
  console.log("Deployer FVC balance:", ethers.formatEther(await fvcToken.balanceOf(deployer.address)));
  console.log("Total vesting wallets:", await vestingFactory.getTotalVestingWallets());

  // Test 1: Create single vesting wallet
  console.log("\n🧪 Test 1: Creating single vesting wallet...");
  
  const vestingAmount = ethers.parseEther("10000"); // 10,000 FVC tokens
  
  // Approve factory to spend FVC tokens
  console.log("Approving FVC tokens for factory...");
  await fvcToken.connect(deployer).approve(VESTING_FACTORY_ADDRESS, vestingAmount);
  
  // Create vesting wallet
  console.log("Creating vesting wallet for investor1...");
  const tx1 = await vestingFactory.connect(deployer).createVestingWallet(
    investor1.address,
    vestingAmount
  );
  const receipt1 = await tx1.wait();
  
  // Get the created vesting wallet address from events
  const vestingWalletAddress = receipt1.logs[0].args[1]; // Assuming it's the second argument
  console.log("✅ Vesting wallet created:", vestingWalletAddress);

  // Test 2: Check vesting wallet info
  console.log("\n🧪 Test 2: Checking vesting wallet info...");
  
  const vestingWallet = await ethers.getContractAt("FVCVestingWallet", vestingWalletAddress);
  
  console.log("Beneficiary:", await vestingWallet.owner());
  console.log("Total allocation:", ethers.formatEther(await vestingWallet.totalFVCAllocation()));
  console.log("Cliff passed:", await vestingWallet.isCliffPassed());
  console.log("Vesting progress:", await vestingWallet.getVestingProgress(), "%");
  console.log("Releasable now:", ethers.formatEther(await vestingWallet.releasableFVC()));

  // Test 3: Batch creation
  console.log("\n🧪 Test 3: Batch vesting wallet creation...");
  
  const batchBeneficiaries = [investor1.address, investor2.address];
  const batchAmounts = [ethers.parseEther("5000"), ethers.parseEther("7500")];
  const totalBatchAmount = ethers.parseEther("12500");
  
  // Approve batch amount
  await fvcToken.connect(deployer).approve(VESTING_FACTORY_ADDRESS, totalBatchAmount);
  
  // Create batch
  const tx2 = await vestingFactory.connect(deployer).createVestingWalletsBatch(
    batchBeneficiaries,
    batchAmounts
  );
  await tx2.wait();
  
  console.log("✅ Batch vesting wallets created!");

  // Test 4: Check factory statistics
  console.log("\n📊 Final Statistics:");
  console.log("Total vesting wallets:", await vestingFactory.getTotalVestingWallets());
  console.log("Total vesting tokens:", ethers.formatEther(await vestingFactory.totalVestingTokens()));
  
  // Check investor1's wallets
  const investor1Wallets = await vestingFactory.getBeneficiaryWallets(investor1.address);
  console.log("Investor1 vesting wallets:", investor1Wallets.length);

  console.log("\n✅ All tests completed successfully!");
  
  console.log("\n🎯 Next Steps:");
  console.log("1. Wait 6 months for cliff to pass");
  console.log("2. Call releaseFVC() to claim vested tokens");
  console.log("3. Integrate with your dapp frontend");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
