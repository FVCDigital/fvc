import { ethers } from "hardhat";

async function main() {
  // Contract addresses
  const fvcAddress = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";
  const bondingAddress = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";
  const userAddress = "0xcABa97a2bb6ca2797e302C864C37632b4185d595";
  
  // Get the FVC contract
  const fvc = await ethers.getContractAt("FVC", fvcAddress);
  const bonding = await ethers.getContractAt("Bonding", bondingAddress);
  
  console.log("=== FIXING WALLET FVC BALANCE ===");
  console.log("User address:", userAddress);
  console.log("FVC contract:", fvcAddress);
  console.log("Bonding contract:", bondingAddress);
  
  // Check current FVC balance
  const currentBalance = await fvc.balanceOf(userAddress);
  console.log("Current FVC balance:", ethers.formatUnits(currentBalance, 18));
  
  // Check vesting schedule
  const vestingSchedule = await bonding.getVestingSchedule(userAddress);
  const vestingAmount = vestingSchedule.amount;
  console.log("Vesting amount:", ethers.formatUnits(vestingAmount, 18));
  
  // Check if user has admin role on bonding contract
  try {
    const adminRole = await bonding.DEFAULT_ADMIN_ROLE();
    const hasAdminRole = await bonding.hasRole(adminRole, userAddress);
    console.log("Has admin role:", hasAdminRole);
    
    if (hasAdminRole) {
      console.log("✅ User has admin role. Can modify vesting schedule.");
      
      // Set vesting amount to 0 to remove the 12k FVC
      console.log("🔥 Setting vesting amount to 0...");
      const setVestingTx = await bonding.setVestingSchedule(userAddress, 0, 0, 0);
      await setVestingTx.wait();
      
      console.log("✅ Successfully set vesting amount to 0");
      
      // Check new vesting schedule
      const newVestingSchedule = await bonding.getVestingSchedule(userAddress);
      console.log("New vesting amount:", ethers.formatUnits(newVestingSchedule.amount, 18));
      
    } else {
      console.log("❌ User doesn't have admin role. Cannot modify vesting schedule.");
      console.log("You need to be the contract owner to fix this.");
    }
    
  } catch (error) {
    console.log("❌ Error checking admin role:", error);
    console.log("The bonding contract might not have role-based access control.");
  }
  
  // Check if user is the contract owner
  try {
    const owner = await bonding.owner();
    console.log("Bonding contract owner:", owner);
    
    if (owner.toLowerCase() === userAddress.toLowerCase()) {
      console.log("✅ User is the contract owner. Can modify vesting schedule.");
      
      // Set vesting amount to 0 to remove the 12k FVC
      console.log("🔥 Setting vesting amount to 0...");
      const setVestingTx = await bonding.setVestingSchedule(userAddress, 0, 0, 0);
      await setVestingTx.wait();
      
      console.log("✅ Successfully set vesting amount to 0");
      
      // Check new vesting schedule
      const newVestingSchedule = await bonding.getVestingSchedule(userAddress);
      console.log("New vesting amount:", ethers.formatUnits(newVestingSchedule.amount, 18));
      
    } else {
      console.log("❌ User is not the contract owner.");
      console.log("You need to be the contract owner to fix this.");
    }
    
  } catch (error) {
    console.log("❌ Error checking owner:", error);
    console.log("The bonding contract might not have an owner function.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
