const { ethers } = require("hardhat");

async function main() {
  console.log("🔄 Simulating Round End for Vesting Test...");

  // Get the signer (admin)
  const [admin] = await ethers.getSigners();
  console.log("Admin address:", admin.address);

  // Contract addresses
  const BONDING_ADDRESS = "0xE80f7844A933fdBf2b7f1f79a25f36243e54E490";
  const FVC_ADDRESS = "0xbC1A71287d6131ED8699F86228cd6fF38680b01e";

  // Get contracts
  const bonding = await ethers.getContractAt("Bonding", BONDING_ADDRESS);
  const fvc = await ethers.getContractAt("FVC", FVC_ADDRESS);

  console.log("\n📊 Current Contract State:");
  
  try {
    const currentRoundId = await bonding.currentRoundId();
    console.log("Round ID:", currentRoundId.toString());
  } catch (error) {
    console.log("❌ Error getting round ID:", error.message);
  }

  try {
    const totalBonded = await bonding.totalBonded();
    console.log("Total bonded:", ethers.formatUnits(totalBonded, 6), "USDC");
  } catch (error) {
    console.log("❌ Error getting total bonded:", error.message);
  }

  // Check vesting schedules for users who bonded
  console.log("\n🔒 Checking Vesting Schedules:");
  
  // Get all users who have bonded (you can add specific addresses here)
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
      
    } catch (error) {
      console.log(`\nUser: ${userAddress} - No vesting schedule found`);
    }
  }

  console.log("\n🔧 Attempting to complete current round...");
  try {
    const completeTx = await bonding.completeCurrentRound();
    console.log("Transaction hash:", completeTx.hash);
    
    console.log("⏳ Waiting for transaction confirmation...");
    await completeTx.wait();
    console.log("✅ Successfully completed current round");
  } catch (error) {
    console.log("❌ Failed to complete current round:", error.message);
    console.log("This might be expected if the round is already inactive or there's no bonding activity");
  }

  console.log("\n🎉 Round completion simulation finished!");
  console.log("✅ Script completed successfully");
  console.log("✅ Vesting schedules have been checked");
  console.log("✅ Round completion was attempted");
  
  console.log("\n📝 Next Steps:");
  console.log("1. Users can now see their vested FVC tokens in the UI");
  console.log("2. Tokens are locked until vesting period ends");
  console.log("3. To test immediate unlock, run: npx hardhat run scripts/testing/fast-forward-vesting.js --network amoy");
  console.log("4. Or wait for the actual vesting period to complete");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 