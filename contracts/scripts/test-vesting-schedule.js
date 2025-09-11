const { ethers } = require("hardhat");

async function main() {
  const testAddress = "0xcABa97a2bb6ca2797e302C864C37632b4185d595";
  
  // Vesting contract address (from the dapp)
  const vestingContractAddress = "0xaf656599C1AA60C9Eb49e0B8ccB76E7C18d35AdB";
  
  // Vesting contract ABI (minimal)
  const vestingABI = [
    {
      "inputs": [{"internalType": "address", "name": "", "type": "address"}],
      "name": "vestingSchedules",
      "outputs": [
        {"internalType": "uint256", "name": "totalAmount", "type": "uint256"},
        {"internalType": "uint256", "name": "releasedAmount", "type": "uint256"},
        {"internalType": "uint256", "name": "startTime", "type": "uint256"},
        {"internalType": "uint256", "name": "cliffTime", "type": "uint256"},
        {"internalType": "uint256", "name": "endTime", "type": "uint256"}
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "address", "name": "beneficiary", "type": "address"}],
      "name": "calculateVestedAmount",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    }
  ];
  
  try {
    const vestingContract = await ethers.getContractAt(vestingABI, vestingContractAddress);
    
    console.log("Testing vesting schedule for address:", testAddress);
    console.log("Vesting contract:", vestingContractAddress);
    
    // Get vesting schedule
    const vestingSchedule = await vestingContract.vestingSchedules(testAddress);
    console.log("\nVesting Schedule:");
    console.log("Total Amount:", ethers.formatUnits(vestingSchedule.totalAmount, 18));
    console.log("Released Amount:", ethers.formatUnits(vestingSchedule.releasedAmount, 18));
    console.log("Start Time:", new Date(Number(vestingSchedule.startTime) * 1000).toISOString());
    console.log("Cliff Time:", new Date(Number(vestingSchedule.cliffTime) * 1000).toISOString());
    console.log("End Time:", new Date(Number(vestingSchedule.endTime) * 1000).toISOString());
    
    // Calculate vesting progress
    const now = Math.floor(Date.now() / 1000);
    const startTime = Number(vestingSchedule.startTime);
    const endTime = Number(vestingSchedule.endTime);
    
    console.log("\nCurrent Time:", new Date(now * 1000).toISOString());
    
    if (vestingSchedule.totalAmount > 0n) {
      if (now >= endTime) {
        console.log("Vesting Progress: 100% (Fully vested)");
      } else if (now <= startTime) {
        console.log("Vesting Progress: 0% (Not started)");
      } else {
        const totalDuration = endTime - startTime;
        const elapsed = now - startTime;
        const progress = (elapsed / totalDuration) * 100;
        console.log("Vesting Progress:", progress.toFixed(2) + "%");
      }
    } else {
      console.log("No vesting schedule found for this address");
    }
    
    // Get vested amount
    const vestedAmount = await vestingContract.calculateVestedAmount(testAddress);
    console.log("Vested Amount:", ethers.formatUnits(vestedAmount, 18));
    
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

