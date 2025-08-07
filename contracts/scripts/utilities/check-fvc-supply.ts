import { ethers } from "hardhat";

async function main() {
  console.log("📊 Checking FVC Supply and Allocations...");

  // Contract addresses
  const FVC_ADDRESS = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";
  const BONDING_ADDRESS = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";

  // Get contract instances
  const fvc = await ethers.getContractAt("FVC", FVC_ADDRESS);
  const bonding = await ethers.getContractAt("Bonding", BONDING_ADDRESS);

  console.log("\n🏦 FVC SUPPLY ANALYSIS:");

  // Get total supply
  const totalSupply = await fvc.totalSupply();
  console.log("Total FVC Supply:", ethers.formatEther(totalSupply));

  // Get bonding contract balance
  const bondingBalance = await fvc.balanceOf(BONDING_ADDRESS);
  console.log("Bonding Contract FVC:", ethers.formatEther(bondingBalance));

  // Get current round info
  try {
    const currentRound = await bonding.getCurrentRound();
    console.log("Current Round:", currentRound);
    
    // Get round config
    const roundConfig = await bonding.getRoundConfig(currentRound[0]);
    console.log("Round Config:", {
      fvcAllocated: ethers.formatEther(roundConfig.fvcAllocated),
      fvcSold: ethers.formatEther(roundConfig.fvcSold),
      discount: roundConfig.discount,
      isActive: roundConfig.isActive
    });
  } catch (error) {
    console.log("Could not get round info:", error.message);
  }

  // Calculate other allocations
  const otherAllocations = totalSupply - bondingBalance;
  console.log("Other Allocations:", ethers.formatEther(otherAllocations));

  console.log("\n📈 ALLOCATION BREAKDOWN:");
  console.log("Bonding Allocation:", ((bondingBalance * 100n) / totalSupply).toString(), "%");
  console.log("Other Allocations:", ((otherAllocations * 100n) / totalSupply).toString(), "%");

  // Check specific wallet balances
  const wallets = [
    "0xcABa97a2bb6ca2797e302C864C37632b4185d595", // Old wallet
    "0x5e1Da3Fb8D827Bdc5E2884A6156863b89a42Faa9", // New wallet
  ];

  console.log("\n👛 WALLET BALANCES:");
  for (const wallet of wallets) {
    const balance = await fvc.balanceOf(wallet);
    console.log(`${wallet}: ${ethers.formatEther(balance)} FVC`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
