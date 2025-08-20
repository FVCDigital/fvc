import { ethers } from "hardhat";

async function main() {
  console.log("Finding Actual Beneficiary in Vesting Contract");
  console.log("==============================================");
  
  const deployments = require("./deployments-amoy.json");
  const [admin] = await ethers.getSigners();
  
  const vestingContract = await ethers.getContractAt("FVCVesting", deployments.contracts.vestingContract);
  
  // Get the beneficiary address
  const beneficiaryAddress = await vestingContract.getBeneficiaryAt(0);
  console.log(`Beneficiary Address: ${beneficiaryAddress}`);
  console.log(`Admin Address: ${admin.address}`);
  console.log(`Are they the same: ${beneficiaryAddress.toLowerCase() === admin.address.toLowerCase()}`);
  
  // Get the actual beneficiary's schedule
  const schedule = await vestingContract.vestingSchedules(beneficiaryAddress);
  console.log("\nActual Beneficiary Vesting Schedule:");
  console.log(`Total Amount: ${ethers.formatEther(schedule.totalAmount)} FVC`);
  console.log(`Released Amount: ${ethers.formatEther(schedule.releasedAmount)} FVC`);
  console.log(`Start Time: ${new Date(Number(schedule.startTime) * 1000).toLocaleString()}`);
  console.log(`Cliff Time: ${new Date(Number(schedule.cliffTime) * 1000).toLocaleString()}`);
  console.log(`End Time: ${new Date(Number(schedule.endTime) * 1000).toLocaleString()}`);
  
  // Check current status
  const isCliffPassed = await vestingContract.isCliffPassed(beneficiaryAddress);
  const releasable = await vestingContract.getReleasableAmount(beneficiaryAddress);
  const vestedAmount = await vestingContract.calculateVestedAmount(beneficiaryAddress);
  
  console.log(`\nCurrent Status:`);
  console.log(`Cliff Passed: ${isCliffPassed}`);
  console.log(`Releasable Amount: ${ethers.formatEther(releasable)} FVC`);
  console.log(`Vested Amount: ${ethers.formatEther(vestedAmount)} FVC`);
  
  // Try to release tokens for this beneficiary
  if (releasable > 0) {
    console.log("\nAttempting to release tokens...");
    try {
      const releaseTx = await vestingContract.releaseFor(beneficiaryAddress);
      await releaseTx.wait();
      console.log("SUCCESS: Tokens released!");
      
      // Check new state
      const newReleasable = await vestingContract.getReleasableAmount(beneficiaryAddress);
      const newSchedule = await vestingContract.vestingSchedules(beneficiaryAddress);
      console.log(`New Released Amount: ${ethers.formatEther(newSchedule.releasedAmount)} FVC`);
      console.log(`New Releasable Amount: ${ethers.formatEther(newReleasable)} FVC`);
      
    } catch (error) {
      console.log("Failed to release:", error.message);
    }
  } else {
    console.log("\nNo tokens currently releasable (cliff period)");
  }
}

main().catch(console.error);
