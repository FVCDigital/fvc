import { ethers } from "hardhat";

async function main() {
  console.log("Checking Actual Vesting Contract State");
  console.log("=====================================");
  
  const deployments = require("./deployments-amoy.json");
  const [admin] = await ethers.getSigners();
  
  const fvcToken = await ethers.getContractAt("FVC", deployments.contracts.fvcToken);
  const vestingContract = await ethers.getContractAt("FVCVesting", deployments.contracts.vestingContract);
  
  // Check contract balance
  const contractBalance = await fvcToken.balanceOf(deployments.contracts.vestingContract);
  console.log(`Vesting Contract FVC Balance: ${ethers.formatEther(contractBalance)} FVC`);
  
  // Check total vesting tokens
  const totalVesting = await vestingContract.totalVestingTokens();
  console.log(`Total Vesting Tokens: ${ethers.formatEther(totalVesting)} FVC`);
  
  // Check number of beneficiaries
  const beneficiaryCount = await vestingContract.getBeneficiaryCount();
  console.log(`Number of Beneficiaries: ${beneficiaryCount}`);
  
  // Check admin's vesting schedule using the getter
  const adminSchedule = await vestingContract.vestingSchedules(admin.address);
  console.log("\nAdmin Vesting Schedule (raw data):");
  console.log(`Total Amount: ${ethers.formatEther(adminSchedule.totalAmount)} FVC`);
  console.log(`Released Amount: ${ethers.formatEther(adminSchedule.releasedAmount)} FVC`);
  console.log(`Start Time: ${adminSchedule.startTime} (${new Date(Number(adminSchedule.startTime) * 1000).toLocaleString()})`);
  console.log(`Cliff Time: ${adminSchedule.cliffTime} (${new Date(Number(adminSchedule.cliffTime) * 1000).toLocaleString()})`);
  console.log(`End Time: ${adminSchedule.endTime} (${new Date(Number(adminSchedule.endTime) * 1000).toLocaleString()})`);
  
  // Check if cliff has passed
  const isCliffPassed = await vestingContract.isCliffPassed(admin.address);
  console.log(`\nCliff Passed: ${isCliffPassed}`);
  
  // Check releasable amount
  const releasable = await vestingContract.getReleasableAmount(admin.address);
  console.log(`Releasable Amount: ${ethers.formatEther(releasable)} FVC`);
  
  // Check calculated vested amount
  const vestedAmount = await vestingContract.calculateVestedAmount(admin.address);
  console.log(`Vested Amount: ${ethers.formatEther(vestedAmount)} FVC`);
}

main().catch(console.error);
