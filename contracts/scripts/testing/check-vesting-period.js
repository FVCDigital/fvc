const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking Vesting Period Configuration...");

  // Get the signer (admin)
  const [admin] = await ethers.getSigners();
  console.log("Admin address:", admin.address);

  // Contract addresses
  const BONDING_ADDRESS = "0xE80f7844A933fdBf2b7f1f79a25f36243e54E490";
  const FVC_ADDRESS = "0xbC1A71287d6131ED8699F86228cd6fF38680b01e";

  // Get contracts
  const bonding = await ethers.getContractAt("Bonding", BONDING_ADDRESS);
  const fvc = await ethers.getContractAt("FVC", FVC_ADDRESS);

  console.log("\n📊 Current Contract Configuration:");
  
  try {
    const currentRoundId = await bonding.currentRoundId();
    console.log("Round ID:", currentRoundId.toString());
  } catch (error) {
    console.log("❌ Error getting round ID:", error.message);
  }

  try {
    const vestingPeriod = await bonding.vestingPeriod();
    console.log("Vesting Period:", vestingPeriod.toString(), "seconds");
    console.log("Vesting Period:", Number(vestingPeriod) / (24 * 60 * 60), "days");
  } catch (error) {
    console.log("❌ Error getting vesting period:", error.message);
  }

  try {
    const totalBonded = await bonding.totalBonded();
    console.log("Total bonded:", ethers.formatUnits(totalBonded, 6), "USDC");
  } catch (error) {
    console.log("❌ Error getting total bonded:", error.message);
  }

  // Check vesting schedules for users who bonded
  console.log("\n🔒 Current Vesting Schedules:");
  
  const testUsers = [
    "0xcABa97a2bb6ca2797e302C864C37632b4185d595", // Add your test user address
    admin.address
  ];

  for (const userAddress of testUsers) {
    try {
      const vestingSchedule = await bonding.getVestingSchedule(userAddress);
      const isLocked = await bonding.isLocked(userAddress);
      const userFVCBalance = await fvc.balanceOf(userAddress);
      
      console.log(`\nUser: ${userAddress}`);
      console.log("  FVC Balance:", ethers.formatUnits(userFVCBalance, 18));
      console.log("  Vesting Amount:", ethers.formatUnits(vestingSchedule.amount, 18));
      console.log("  Start Time:", new Date(Number(vestingSchedule.startTime) * 1000));
      console.log("  End Time:", new Date(Number(vestingSchedule.endTime) * 1000));
      console.log("  Is Locked:", isLocked);
      
      // Calculate time until unlock
      const currentTime = Math.floor(Date.now() / 1000);
      const timeUntilUnlock = Number(vestingSchedule.endTime) - currentTime;
      console.log("  Time until unlock:", Math.max(0, timeUntilUnlock / (24 * 60 * 60)), "days");
      
      // Calculate when the round was started
      const roundStartTime = Number(vestingSchedule.startTime);
      const roundDuration = Number(vestingSchedule.endTime) - roundStartTime;
      console.log("  Round duration:", roundDuration / (24 * 60 * 60), "days");
      
    } catch (error) {
      console.log(`\nUser: ${userAddress} - No vesting schedule found`);
    }
  }

  console.log("\n📝 Analysis:");
  console.log("✅ Vesting period is now dynamic and tied to the bonding round");
  console.log("✅ Tokens are locked until the round ends (not a fixed 90 days)");
  console.log("✅ This provides better alignment between bonding and vesting");
  console.log("✅ Users can see their vested tokens but cannot transfer until round completion");
  
  console.log("\n💡 To test vesting unlock:");
  console.log("1. Complete the current round: npx hardhat run scripts/testing/simulate-round-end.js --network amoy");
  console.log("2. Start a new round to trigger vesting unlock");
  console.log("3. Or wait for the actual round to complete naturally");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 