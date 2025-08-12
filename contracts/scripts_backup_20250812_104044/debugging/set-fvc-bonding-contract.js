const { ethers } = require("hardhat");

async function main() {
  const FVC_ADDRESS = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";
  const BONDING_ADDRESS = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";
  const fvc = await ethers.getContractAt("FVC", FVC_ADDRESS);

  const tx = await fvc.setBondingContract(BONDING_ADDRESS);
  console.log("setBondingContract tx hash:", tx.hash);
  await tx.wait();
  console.log("✅ Bonding contract address set in FVC contract.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 