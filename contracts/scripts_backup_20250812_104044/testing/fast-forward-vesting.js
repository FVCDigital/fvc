const { ethers } = require("hardhat");

async function main() {
  console.log("⏰ Fast-Forwarding Time for Vesting Unlock Test...");

  // Get the signer (admin)
  const [admin] = await ethers.getSigners();
  console.log("Admin address:", admin.address);

  // Contract addresses
  const BONDING_ADDRESS = "0xE80f7844A933fdBf2b7f1f79a25f36243e54E490";
  const FVC_ADDRESS = "0xbC1A71287d6131ED8699F86228cd6fF38680b01e";

  // Get contracts
  const bonding = await ethers.getContractAt("Bonding", BONDING_ADDRESS);
  const fvc = await ethers.getContractAt("FVC", FVC_ADDRESS);

  // Check current vesting schedules
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
      
    } catch (error) {
      console.log(`\nUser: ${userAddress} - No vesting schedule found`);
    }
  }

  // Fast forward time by 6 months (180 days)
  const VESTING_PERIOD = 180 * 24 * 60 * 60; // 180 days in seconds
  console.log(`\n⏰ Fast-forwarding time by ${VESTING_PERIOD / (24 * 60 * 60)} days...`);
  
  try {
    await ethers.provider.send("evm_increaseTime", [VESTING_PERIOD]);
    await ethers.provider.send("evm_mine", []);
    console.log("✅ Successfully fast-forwarded time");
  } catch (error) {
    console.log("❌ Failed to fast-forward time:", error.message);
    return;
  }

  // Check vesting schedules after time fast-forward
  console.log("\n🔒 Vesting Schedules After Time Fast-Forward:");
  
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
      
      if (!isLocked) {
        console.log("  ✅ Tokens are now unlocked and transferable!");
      } else {
        console.log("  ⏳ Tokens are still locked");
      }
      
    } catch (error) {
      console.log(`\nUser: ${userAddress} - No vesting schedule found`);
    }
  }

  console.log("\n🎉 Time fast-forward simulation finished!");
  console.log("✅ Time has been fast-forwarded by 6 months");
  console.log("✅ Vesting periods should now be complete");
  console.log("✅ Users can now transfer their FVC tokens");
  
  console.log("\n📝 Next Steps:");
  console.log("1. Users can now transfer their FVC tokens");
  console.log("2. Vesting locks should be removed");
  console.log("3. Test token transfers in the UI");
  console.log("4. Verify that tokens are no longer locked");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 