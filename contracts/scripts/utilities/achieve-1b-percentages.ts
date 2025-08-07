import { ethers } from "hardhat";

async function main() {
  console.log("🔧 Achieving 1B Total Supply with 30% Bonding, 70% Owner...");

  // Get the signer
  const [owner] = await ethers.getSigners();
  console.log("Owner address:", owner.address);

  // Contract addresses
  const FVC_ADDRESS = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";
  const BONDING_ADDRESS = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";

  // Get contract instances
  const fvc = await ethers.getContractAt("FVC", FVC_ADDRESS);
  const bonding = await ethers.getContractAt("Bonding", BONDING_ADDRESS);

  console.log("\n📊 Current State:");
  
  const currentTotalSupply = await fvc.totalSupply();
  const currentBondingBalance = await fvc.balanceOf(BONDING_ADDRESS);
  const ownerBalance = await fvc.balanceOf(owner.address);

  console.log("Current Total Supply:", ethers.formatEther(currentTotalSupply));
  console.log("Current Bonding Balance:", ethers.formatEther(currentBondingBalance));
  console.log("Current Owner Balance:", ethers.formatEther(ownerBalance));

  // Calculate what we need for 1B total supply with 30% bonding
  const TARGET_TOTAL_SUPPLY = ethers.parseEther("1000000000"); // 1B
  const TARGET_BONDING_PERCENTAGE = 30; // 30%
  const TARGET_OWNER_PERCENTAGE = 70; // 70%

  const targetBondingAmount = (TARGET_TOTAL_SUPPLY * BigInt(TARGET_BONDING_PERCENTAGE)) / 100n;
  const targetOwnerAmount = (TARGET_TOTAL_SUPPLY * BigInt(TARGET_OWNER_PERCENTAGE)) / 100n;

  console.log("\n🎯 Targets for 1B Total Supply:");
  console.log("Target Total Supply: 1,000,000,000 FVC (1B)");
  console.log("Target Bonding (30%):", ethers.formatEther(targetBondingAmount), "FVC");
  console.log("Target Owner (70%):", ethers.formatEther(targetOwnerAmount), "FVC");

  console.log("\n🚀 Calculating Required Minting...");

  // Calculate what we need to mint to achieve the targets
  const bondingDeficit = targetBondingAmount - currentBondingBalance;
  const ownerDeficit = targetOwnerAmount - ownerBalance;

  console.log("Bonding Deficit:", ethers.formatEther(bondingDeficit));
  console.log("Owner Deficit:", ethers.formatEther(ownerDeficit));

  try {
    // Step 1: Mint exactly what bonding needs for 30%
    if (bondingDeficit > 0n) {
      console.log("\n1. Minting", ethers.formatEther(bondingDeficit), "FVC to bonding...");
      const mintBondingTx = await fvc.mint(BONDING_ADDRESS, bondingDeficit);
      console.log("Mint bonding transaction hash:", mintBondingTx.hash);
      await mintBondingTx.wait();
      console.log("✅ Bonding allocation complete!");
    } else {
      console.log("\n1. Bonding already has sufficient allocation");
    }

    // Step 2: Mint exactly what owner needs for 70%
    if (ownerDeficit > 0n) {
      console.log("2. Minting", ethers.formatEther(ownerDeficit), "FVC to owner...");
      const mintOwnerTx = await fvc.mint(owner.address, ownerDeficit);
      console.log("Mint owner transaction hash:", mintOwnerTx.hash);
      await mintOwnerTx.wait();
      console.log("✅ Owner allocation complete!");
    } else {
      console.log("2. Owner already has sufficient allocation");
    }

    // Step 3: Calculate final state
    const finalTotalSupply = await fvc.totalSupply();
    const finalBondingBalance = await fvc.balanceOf(BONDING_ADDRESS);
    const finalOwnerBalance = await fvc.balanceOf(owner.address);

    console.log("\n📊 Final State:");
    console.log("Total Supply:", ethers.formatEther(finalTotalSupply));
    console.log("Bonding Balance:", ethers.formatEther(finalBondingBalance));
    console.log("Owner Balance:", ethers.formatEther(finalOwnerBalance));

    console.log("\n📈 Final Allocation Breakdown:");
    const bondingPercentage = (finalBondingBalance * 100n) / finalTotalSupply;
    const ownerPercentage = (finalOwnerBalance * 100n) / finalTotalSupply;
    
    console.log("Bonding Allocation:", bondingPercentage.toString(), "%");
    console.log("Owner (Unallocated):", ownerPercentage.toString(), "%");

    if (bondingPercentage >= 30n && ownerPercentage >= 70n) {
      console.log("\n🎉 SUCCESS: Perfect percentages achieved!");
      console.log("✅ Total supply:", ethers.formatEther(finalTotalSupply), "FVC");
      console.log("✅ Bonding has", ethers.formatEther(finalBondingBalance), "FVC (", bondingPercentage.toString(), "%)");
      console.log("✅ Owner has", ethers.formatEther(finalOwnerBalance), "FVC (", ownerPercentage.toString(), "%)");
      console.log("✅ Exactly as requested!");
    } else {
      console.log("\n⚠️ Percentages not achieved");
      console.log("📝 Bonding:", bondingPercentage.toString(), "% (target: 30%)");
      console.log("📝 Owner:", ownerPercentage.toString(), "% (target: 70%)");
    }

  } catch (error) {
    console.log("❌ Error during allocation:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
