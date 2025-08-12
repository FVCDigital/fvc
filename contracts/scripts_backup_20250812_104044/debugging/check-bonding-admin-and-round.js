const { ethers } = require("hardhat");

async function main() {
  const BONDING_ADDRESS = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";
  const bonding = await ethers.getContractAt("Bonding", BONDING_ADDRESS);

  // Try to get owner/admin (if Ownable or AccessControl)
  let admin;
  try {
    admin = await bonding.owner();
    console.log("Bonding contract owner:", admin);
  } catch (e) {
    try {
      admin = await bonding.hasRole(await bonding.DEFAULT_ADMIN_ROLE(), (await ethers.getSigners())[0].address);
      console.log("Is current signer admin?", admin);
    } catch (e2) {
      console.log("Could not determine admin/owner.");
    }
  }

  // Get current round status
  try {
    const round = await bonding.getCurrentRound();
    console.log("Current round isActive:", round.isActive);
    console.log("Current round ID:", round.roundId.toString());
  } catch (e) {
    console.log("Could not fetch current round.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 