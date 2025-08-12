const { ethers } = require("hardhat");

async function main() {
  // User and contract addresses
  const user = "0xcABa97a2bb6ca2797e302C864C37632b4185d595";
  const FVC_ADDRESS = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";
  const BURN_ADDRESS = "0x000000000000000000000000000000000000dEaD";

  // Get signer (must be the user, or impersonate in local fork)
  const [signer] = await ethers.getSigners();
  if (signer.address.toLowerCase() !== user.toLowerCase()) {
    console.log(`Signer address (${signer.address}) does not match user address (${user})`);
    return;
  }

  // Get FVC contract
  const fvc = await ethers.getContractAt("FVC", FVC_ADDRESS);

  // Get user's FVC balance
  const balance = await fvc.balanceOf(user);
  console.log(`User FVC balance: ${ethers.formatUnits(balance, 18)} FVC`);
  if (balance == 0n) {
    console.log("No FVC to burn.");
    return;
  }

  // Transfer all FVC to burn address
  const tx = await fvc.transfer(BURN_ADDRESS, balance);
  console.log("Burn tx hash:", tx.hash);
  await tx.wait();
  console.log("✅ Burn complete. All FVC sent to burn address.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 