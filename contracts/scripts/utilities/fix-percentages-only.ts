import { ethers } from "hardhat";

async function main() {
  console.log("🔧 Fixing Percentages to 30% Bonding, 70% Owner...");

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

  console.log("\n🎯 Target Percentages:");
  console.log("Bonding: 30%");
  console.log("Owner: 70%");

  console.log("\n🚀 Calculating Required Minting...");

  // Calculate what we need to mint to achieve 30% bonding
  const targetBondingAmount = (currentTotalSupply * 30n) / 100n;
  const bondingDeficit = targetBondingAmount - currentBondingBalance;

  console.log("Target Bonding Amount (30%):", ethers.formatEther(targetBondingAmount));
  console.log("Bonding Deficit:", ethers.formatEther(bondingDeficit));

  try {
    // Step 1: Mint additional tokens to bonding to reach 30%
    if (bondingDeficit > 0n) {
      console.log("\n1. Minting", ethers.formatEther(bondingDeficit), "FVC to bonding...");
      const mintBondingTx = await fvc.mint(BONDING_ADDRESS, bondingDeficit);
      console.log("Mint bonding transaction hash:", mintBondingTx.hash);
      await mintBondingTx.wait();
      console.log("✅ Bonding allocation complete!");
    } else {
      console.log("\n1. Bonding already has sufficient allocation");
    }

    // Step 2: Calculate final state
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

    if (bondingPercentage >= 30n) {
      console.log("\n🎉 SUCCESS: Perfect percentages achieved!");
      console.log("✅ Total supply:", ethers.formatEther(finalTotalSupply), "FVC");
      console.log("✅ Bonding has", ethers.formatEther(finalBondingBalance), "FVC (", bondingPercentage.toString(), "%)");
      console.log("✅ Owner has", ethers.formatEther(finalOwnerBalance), "FVC (", ownerPercentage.toString(), "%)");
      console.log("✅ Allocation matches your Option A: Aggressive Capital Raise strategy!");
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
