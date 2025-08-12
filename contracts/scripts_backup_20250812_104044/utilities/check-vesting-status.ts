import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Checking Vesting Status...");

  // Get the signer
  const [owner] = await ethers.getSigners();
  console.log("Owner address:", owner.address);

  // Contract addresses
  const FVC_ADDRESS = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";
  const BONDING_ADDRESS = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";

  // Get contract instances
  const fvc = await ethers.getContractAt("FVC", FVC_ADDRESS);
  const bonding = await ethers.getContractAt("Bonding", BONDING_ADDRESS);

  console.log("\n📊 Current Balances:");
  
  const totalSupply = await fvc.totalSupply();
  const ownerBalance = await fvc.balanceOf(owner.address);
  const bondingBalance = await fvc.balanceOf(BONDING_ADDRESS);

  console.log("Total Supply:", ethers.formatEther(totalSupply));
  console.log("Owner Balance:", ethers.formatEther(ownerBalance));
  console.log("Bonding Balance:", ethers.formatEther(bondingBalance));

  console.log("\n🔍 Checking Vesting Schedule...");
  
  try {
    const vestingSchedule = await bonding.getVestingSchedule(owner.address);
    console.log("Vesting Schedule:", {
      amount: ethers.formatEther(vestingSchedule.amount),
      startTime: new Date(Number(vestingSchedule.startTime) * 1000).toISOString(),
      endTime: new Date(Number(vestingSchedule.endTime) * 1000).toISOString()
    });
  } catch (error) {
    console.log("Could not get vesting schedule:", error.message);
  }

  console.log("\n🧪 Testing Transfer of Small Amount...");
  
  try {
    // Try to transfer a small amount to test if tokens are locked
    const testAmount = ethers.parseEther("1000"); // 1000 FVC
    console.log("Testing transfer of 1000 FVC to bonding...");
    
    const transferTx = await fvc.transfer(BONDING_ADDRESS, testAmount);
    console.log("Transfer transaction hash:", transferTx.hash);
    await transferTx.wait();
    console.log("✅ Transfer successful! Tokens are not locked");
    
    // Transfer back
    console.log("Transferring back to owner...");
    const transferBackTx = await fvc.transfer(owner.address, testAmount);
    await transferBackTx.wait();
    console.log("✅ Transfer back successful!");
    
  } catch (error) {
    console.log("❌ Transfer failed:", error.message);
    console.log("📝 Tokens are locked in vesting");
  }

  console.log("\n💡 Solution Options:");
  console.log("1. Wait for vesting to end (November 2025)");
  console.log("2. Deploy new contracts without vesting restrictions");
  console.log("3. Use a different wallet that doesn't have vesting");
  console.log("4. Modify the vesting contract (if possible)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
