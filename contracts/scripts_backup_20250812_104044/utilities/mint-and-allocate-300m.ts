import { ethers } from "hardhat";

async function main() {
  console.log("🔧 Minting Additional FVC and Allocating 300M to Bonding...");

  // Get the signer
  const [owner] = await ethers.getSigners();
  console.log("Owner address:", owner.address);

  // Contract addresses (existing on testnet)
  const FVC_ADDRESS = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";
  const BONDING_ADDRESS = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";

  // Get contract instances
  const fvc = await ethers.getContractAt("FVC", FVC_ADDRESS);
  const bonding = await ethers.getContractAt("Bonding", BONDING_ADDRESS);

  console.log("\n📊 Current State:");
  
  // Check current balances
  const currentTotalSupply = await fvc.totalSupply();
  const currentBondingBalance = await fvc.balanceOf(BONDING_ADDRESS);
  const currentOwnerBalance = await fvc.balanceOf(owner.address);

  console.log("Total Supply:", ethers.formatEther(currentTotalSupply));
  console.log("Current Bonding Balance:", ethers.formatEther(currentBondingBalance));
  console.log("Current Owner Balance:", ethers.formatEther(currentOwnerBalance));

  // Calculate target allocation
  const TARGET_BONDING_ALLOCATION = ethers.parseEther("300000000"); // 300M
  const additionalNeeded = TARGET_BONDING_ALLOCATION - currentBondingBalance;

  console.log("\n🎯 Target Allocation:");
  console.log("Target Bonding Allocation: 300,000,000 FVC (30%)");
  console.log("Additional FVC Needed:", ethers.formatEther(additionalNeeded));

  if (additionalNeeded <= 0n) {
    console.log("\n✅ Bonding already has 300M or more FVC");
    return;
  }

  console.log("\n🚀 Minting and Allocating FVC...");

  try {
    // Step 1: Mint additional FVC to owner
    console.log("1. Minting", ethers.formatEther(additionalNeeded), "FVC to owner...");
    const mintTx = await fvc.mint(owner.address, additionalNeeded);
    console.log("Mint transaction hash:", mintTx.hash);
    await mintTx.wait();
    console.log("✅ Additional FVC minted to owner!");

    // Step 2: Transfer to bonding
    console.log("2. Transferring", ethers.formatEther(additionalNeeded), "FVC to bonding...");
    const transferTx = await fvc.transfer(BONDING_ADDRESS, additionalNeeded);
    console.log("Transfer transaction hash:", transferTx.hash);
    await transferTx.wait();
    console.log("✅ FVC transferred to bonding!");

    // Verify final state
    console.log("\n📊 Final State:");
    const newTotalSupply = await fvc.totalSupply();
    const newBondingBalance = await fvc.balanceOf(BONDING_ADDRESS);
    const newOwnerBalance = await fvc.balanceOf(owner.address);

    console.log("Total Supply:", ethers.formatEther(newTotalSupply));
    console.log("Bonding Balance:", ethers.formatEther(newBondingBalance));
    console.log("Owner Balance:", ethers.formatEther(newOwnerBalance));

    console.log("\n📈 Final Allocation Breakdown:");
    const bondingPercentage = (newBondingBalance * 100n) / newTotalSupply;
    const ownerPercentage = (newOwnerBalance * 100n) / newTotalSupply;
    
    console.log("Bonding Allocation:", bondingPercentage.toString(), "%");
    console.log("Owner (Unallocated):", ownerPercentage.toString(), "%");

    if (newBondingBalance >= TARGET_BONDING_ALLOCATION) {
      console.log("\n🎉 SUCCESS: 300M FVC allocated to bonding!");
      console.log("✅ Bonding now has", ethers.formatEther(newBondingBalance), "FVC");
      console.log("✅ Owner has", ethers.formatEther(newOwnerBalance), "FVC for future allocations");
      console.log("✅ Total supply increased to", ethers.formatEther(newTotalSupply), "FVC");
    } else {
      console.log("\n⚠️ Bonding allocation incomplete");
      console.log("📝 Bonding has", ethers.formatEther(newBondingBalance), "FVC (target: 300M)");
    }

    console.log("\n📋 Future Reallocation Options:");
    console.log("- Transfer from bonding to owner for reallocation");
    console.log("- Allocate to staking rewards (when staking contract exists)");
    console.log("- Allocate to team & partners (when vesting contracts exist)");
    console.log("- Allocate to treasury reserves");
    console.log("- Allocate to ecosystem development");

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
