import { ethers } from "hardhat";

async function main() {
  // Contract addresses
  const fvcAddress = "0xbC1A71287d6131ED8699F86228cd6fF38680b01e";
  const bondingAddress = "0xE80f7844A933fdBf2b7f1f79a25f36243e54E490";
  const userAddress = "0xcABa97a2bb6ca2797e302C864C37632b4185d595"; // Your wallet
  
  // Get the FVC contract
  const fvc = await ethers.getContractAt("FVC", fvcAddress);
  
  // Get the bonding contract
  const bonding = await ethers.getContractAt("Bonding", bondingAddress);
  
  console.log("=== CHECKING USER FVC BALANCE ===");
  console.log("User address:", userAddress);
  console.log("FVC contract:", fvcAddress);
  
  // Check FVC balance
  const fvcBalance = await fvc.balanceOf(userAddress);
  console.log("FVC balance:", ethers.formatUnits(fvcBalance, 18));
  
  // Check if user has any vesting schedule
  const vestingSchedule = await bonding.getVestingSchedule(userAddress);
  console.log("Vesting amount:", ethers.formatUnits(vestingSchedule.amount, 18));
  console.log("Vesting start time:", new Date(Number(vestingSchedule.startTime) * 1000));
  console.log("Vesting end time:", new Date(Number(vestingSchedule.endTime) * 1000));
  
  // Check if tokens are locked
  const isLocked = await bonding.isLocked(userAddress);
  console.log("Tokens locked:", isLocked);
  
  // Check total supply
  const totalSupply = await fvc.totalSupply();
  console.log("Total FVC supply:", ethers.formatUnits(totalSupply, 18));
  
  if (fvcBalance > 0) {
    console.log("\n✅ FVC tokens found! Dashboard should show them.");
  } else {
    console.log("\n❌ No FVC tokens found. Let's check the bonding transaction.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 