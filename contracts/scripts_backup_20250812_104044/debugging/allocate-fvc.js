const { ethers } = require("hardhat");

async function main() {
  // Addresses
  const BONDING_ADDRESS = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";
  const FVC_ADDRESS = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";
  const ADMIN = (await ethers.getSigners())[0];

  // Amount to allocate (e.g., 100,000 FVC)
  const FVC_TO_ALLOCATE = ethers.parseUnits("100000", 18);

  // Get contract instances
  const fvc = await ethers.getContractAt("FVC", FVC_ADDRESS);
  const bonding = await ethers.getContractAt("Bonding", BONDING_ADDRESS);

  // Approve bonding contract to transfer FVC
  const approveTx = await fvc.approve(BONDING_ADDRESS, FVC_TO_ALLOCATE);
  console.log("Approve tx hash:", approveTx.hash);
  await approveTx.wait();
  console.log("✅ Approved bonding contract to spend FVC");

  // Allocate FVC to bonding contract
  const allocTx = await bonding.allocateFVC(FVC_TO_ALLOCATE);
  console.log("Allocate tx hash:", allocTx.hash);
  await allocTx.wait();
  console.log(`✅ Allocated ${ethers.formatUnits(FVC_TO_ALLOCATE, 18)} FVC to bonding contract.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 