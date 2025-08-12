import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Verifying FVC Distribution...");

  // Get the signer
  const [owner] = await ethers.getSigners();
  console.log("Owner address:", owner.address);

  // Contract addresses
  const FVC_ADDRESS = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";
  const BONDING_ADDRESS = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";

  // Get contract instances
  const fvc = await ethers.getContractAt("FVC", FVC_ADDRESS);

  console.log("\n📊 FVC SUPPLY ANALYSIS:");

  // Get total supply
  const totalSupply = await fvc.totalSupply();
  console.log("Total FVC Supply:", ethers.formatEther(totalSupply));

  // Check bonding contract balance
  const bondingBalance = await fvc.balanceOf(BONDING_ADDRESS);
  console.log("Bonding Contract FVC:", ethers.formatEther(bondingBalance));

  // Check owner balance
  const ownerBalance = await fvc.balanceOf(owner.address);
  console.log("Owner FVC:", ethers.formatEther(ownerBalance));

  // Check other known wallets
  const knownWallets = [
    "0x5e1Da3Fb8D827Bdc5E2884A6156863b89a42Faa9", // New wallet
  ];

  console.log("\n👛 KNOWN WALLET BALANCES:");
  let totalKnownBalance = 0n;
  
  for (const wallet of knownWallets) {
    const balance = await fvc.balanceOf(wallet);
    console.log(`${wallet}: ${ethers.formatEther(balance)} FVC`);
    totalKnownBalance += balance;
  }

  // Calculate unaccounted balance
  const totalAccounted = bondingBalance + ownerBalance + totalKnownBalance;
  const unaccounted = totalSupply - totalAccounted;

  console.log("\n📈 DISTRIBUTION BREAKDOWN:");
  console.log("Bonding Contract:", ethers.formatEther(bondingBalance), "FVC");
  console.log("Owner:", ethers.formatEther(ownerBalance), "FVC");
  console.log("Known Wallets:", ethers.formatEther(totalKnownBalance), "FVC");
  console.log("Unaccounted:", ethers.formatEther(unaccounted), "FVC");
  console.log("Total Accounted:", ethers.formatEther(totalAccounted), "FVC");
  console.log("Total Supply:", ethers.formatEther(totalSupply), "FVC");

  console.log("\n🎯 ALLOCATION SUMMARY:");
  const bondingPercentage = (bondingBalance * 100n) / totalSupply;
  const ownerPercentage = (ownerBalance * 100n) / totalSupply;
  const knownPercentage = (totalKnownBalance * 100n) / totalSupply;
  const unaccountedPercentage = (unaccounted * 100n) / totalSupply;

  console.log("Bonding (10M target):", bondingPercentage.toString(), "%");
  console.log("Owner:", ownerPercentage.toString(), "%");
  console.log("Known Wallets:", knownPercentage.toString(), "%");
  console.log("Unaccounted:", unaccountedPercentage.toString(), "%");

  // Verify if we have exactly 10M in bonding
  const BONDING_TARGET = ethers.parseEther("10000000"); // 10M
  if (bondingBalance === BONDING_TARGET) {
    console.log("\n✅ Bonding allocation is correct (10M FVC)");
  } else {
    console.log("\n⚠️ Bonding allocation is", ethers.formatEther(bondingBalance), "FVC (should be 10M)");
  }

  // Check if total is 1B
  const EXPECTED_TOTAL = ethers.parseEther("1000000000"); // 1B
  if (totalSupply === EXPECTED_TOTAL) {
    console.log("✅ Total supply is correct (1B FVC)");
  } else {
    console.log("⚠️ Total supply is", ethers.formatEther(totalSupply), "FVC (should be 1B)");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
