const { ethers } = require("hardhat");

async function main() {
  const BONDING_ADDRESS = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";
  const bonding = await ethers.getContractAt("Bonding", BONDING_ADDRESS);

  // Example parameters (adjust as needed)
  const initialDiscount = 20; // 20%
  const finalDiscount = 10; // 10%
  const epochCap = ethers.parseUnits("100000", 18); // 100,000 FVC
  const walletCap = ethers.parseUnits("10000", 18); // 10,000 FVC per wallet
  const vestingPeriod = 60 * 60 * 24 * 90; // 90 days

  const tx = await bonding.startNewRound(
    initialDiscount,
    finalDiscount,
    epochCap,
    walletCap,
    vestingPeriod
  );
  console.log("startNewRound tx hash:", tx.hash);
  await tx.wait();
  console.log("✅ New round started.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 