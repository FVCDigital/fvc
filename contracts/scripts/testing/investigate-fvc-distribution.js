const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Investigating FVC Distribution...");

  /**
   * @constant {Signer[]} signers - The signers available.
   * @constant {Signer} user - The user signing the transactions.
   */
  const signers = await ethers.getSigners();
  const user = signers[0];

  /**
   * @constant {ContractFactory} Bonding - The factory for the Bonding contract.
   * @constant {ContractFactory} FVC - The factory for the FVC contract.
   * @constant {ContractFactory} MockUSDC - The factory for the MockUSDC contract.
   */
  const Bonding = await ethers.getContractFactory("Bonding");
  const FVC = await ethers.getContractFactory("FVC");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");

  /**
   * @constant {string} BONDING_ADDRESS - The address of the Bonding contract.
   * @constant {string} FVC_ADDRESS - The address of the FVC contract.
   * @constant {string} USDC_ADDRESS - The address of the USDC contract.
   * @constant {string} SAFE_ADDRESS - The address of the Safe contract.
   */
  const BONDING_ADDRESS = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";
  const FVC_ADDRESS = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";
  const USDC_ADDRESS = "0x11Cf72a75e284B61548B87fB5ad8B8693FCfB1fb";
  const SAFE_ADDRESS = "0x7f1EE89fDB16b57930b7F53Bb998f25d917F35D9";

  /**
   * @constant {Contract} bonding - The Bonding contract.
   * @constant {Contract} fvc - The FVC contract.
   * @constant {Contract} usdc - The USDC contract.
   */
  const bonding = Bonding.attach(BONDING_ADDRESS);
  const fvc = FVC.attach(FVC_ADDRESS);
  const usdc = MockUSDC.attach(USDC_ADDRESS);

  console.log("📋 Contract Addresses:");
  console.log("FVC Token:", FVC_ADDRESS);
  console.log("Bonding Contract:", BONDING_ADDRESS);
  console.log("Safe Treasury:", SAFE_ADDRESS);
  console.log("User Wallet:", user.address);

  console.log("\n📊 FVC Token Supply:");
  /**
   * @constant {BigNumber} totalSupply - The total supply of FVC tokens.
   */
  const totalSupply = await fvc.totalSupply();
  console.log("Total FVC Supply:", ethers.formatUnits(totalSupply, 18));

  console.log("\n💰 FVC Balances:");
  /**
   * @constant {BigNumber} userFVCBalance - The balance of FVC tokens in the user's wallet.
   * @constant {BigNumber} safeFVCBalance - The balance of FVC tokens in the safe.
   * @constant {BigNumber} bondingFVCBalance - The balance of FVC tokens in the bonding contract.
   * @constant {BigNumber} treasuryFVCBalance - The balance of FVC tokens in the treasury.
   */
  const userFVCBalance = await fvc.balanceOf(user.address);
  const safeFVCBalance = await fvc.balanceOf(SAFE_ADDRESS);
  const bondingFVCBalance = await fvc.balanceOf(BONDING_ADDRESS);
  const treasuryFVCBalance = await fvc.balanceOf(await bonding.treasury());

  console.log("User FVC Balance:", ethers.formatUnits(userFVCBalance, 18));
  console.log("Safe FVC Balance:", ethers.formatUnits(safeFVCBalance, 18));
  console.log("Bonding Contract FVC Balance:", ethers.formatUnits(bondingFVCBalance, 18));
  console.log("Treasury FVC Balance:", ethers.formatUnits(treasuryFVCBalance, 18));

  /**
   * @constant {BigNumber} MINTER_ROLE - The MINTER_ROLE of the FVC contract.
   * @constant {boolean} hasMinterRole - Whether the user has the MINTER_ROLE.
   * @constant {boolean} hasMinterRoleSafe - Whether the safe has the MINTER_ROLE.
   * @constant {boolean} hasMinterRoleBonding - Whether the bonding contract has the MINTER_ROLE.
   */
  console.log("\n👑 Minter Permissions:");
  const MINTER_ROLE = await fvc.MINTER_ROLE();
  const hasMinterRole = await fvc.hasRole(MINTER_ROLE, user.address);
  const hasMinterRoleSafe = await fvc.hasRole(MINTER_ROLE, SAFE_ADDRESS);
  const hasMinterRoleBonding = await fvc.hasRole(MINTER_ROLE, BONDING_ADDRESS);

  console.log("User has MINTER_ROLE:", hasMinterRole);
  console.log("Safe has MINTER_ROLE:", hasMinterRoleSafe);
  console.log("Bonding has MINTER_ROLE:", hasMinterRoleBonding);

  console.log("\n🔍 Bonding Contract State:");
  /**
   * @constant {Object} currentRound - The current round of the bonding contract.
   * @constant {BigNumber} totalBonded - The total amount of USDC bonded.
   * @constant {BigNumber} userBonded - The amount of USDC bonded by the user.
   */
  const currentRound = await bonding.getCurrentRound();
  const totalBonded = await bonding.totalBonded();
  const userBonded = await bonding.userBonded(currentRound.roundId, user.address);

  console.log("Current Round ID:", currentRound.roundId.toString());
  console.log("Total Bonded:", ethers.formatUnits(totalBonded, 6), "USDC");
  console.log("User Bonded:", ethers.formatUnits(userBonded, 6), "USDC");

  console.log("\n🔒 Vesting Schedule:");
  try {
    /**
     * @constant {Object} vestingSchedule - The vesting schedule for the user.
     * @constant {BigNumber} vestingSchedule.amount - The amount of FVC tokens vested.
     * @constant {BigNumber} vestingSchedule.startTime - The start time of the vesting schedule.
     * @constant {BigNumber} vestingSchedule.endTime - The end time of the vesting schedule.
     */
    const vestingSchedule = await bonding.getVestingSchedule(user.address);
    console.log("Vesting Amount:", ethers.formatUnits(vestingSchedule.amount, 18));
    console.log("Start Time:", new Date(Number(vestingSchedule.startTime) * 1000));
    console.log("End Time:", new Date(Number(vestingSchedule.endTime) * 1000));
    console.log("Is Locked:", await bonding.isLocked(user.address));
  } catch (error) {
    console.log("❌ Error reading vesting:", error.message);
  }

  console.log("\n📈 FVC Minting Analysis:");
  console.log("Expected Treasury FVC: 10,000,000");
  console.log("Actual Treasury FVC:", ethers.formatUnits(safeFVCBalance, 18));
  console.log("User FVC from Bonding:", ethers.formatUnits(userFVCBalance, 18));
  console.log("Total FVC in System:", ethers.formatUnits(totalSupply, 18));

  /**
   * @constant {BigNumber} expectedTreasuryFVC - The expected amount of FVC tokens in the treasury.
   * @constant {BigNumber} actualTreasuryFVC - The actual amount of FVC tokens in the treasury.
   * @constant {BigNumber} userFVCFromBonding - The amount of FVC tokens from bonding transactions.
   */
  const expectedTreasuryFVC = ethers.parseUnits("10000000", 18);
  const actualTreasuryFVC = safeFVCBalance;
  const userFVCFromBonding = userFVCBalance;

  console.log("\n🎯 Analysis:");
  if (actualTreasuryFVC.toString() === expectedTreasuryFVC.toString()) {
    console.log("✅ Treasury has correct 10M FVC");
  } else {
    console.log("❌ Treasury missing FVC. Expected:", ethers.formatUnits(expectedTreasuryFVC, 18));
    console.log("   Actual:", ethers.formatUnits(actualTreasuryFVC, 18));
  }

  console.log("User FVC from bonding transactions:", ethers.formatUnits(userFVCFromBonding, 18));
  console.log("This explains why user has FVC - it's from bonding, not treasury minting");

  console.log("\n🔍 Root Cause:");
  console.log("1. Treasury was supposed to get 10M FVC minted to it");
  console.log("2. User has FVC from bonding transactions (60K FVC)");
  console.log("3. Need to verify if 10M FVC was actually minted to treasury");
  console.log("4. Check if minting script actually executed successfully");

  console.log("\n🔗 Safe URL: https://safe.global/app/amoy:" + SAFE_ADDRESS);
  console.log("🔍 Explorer: https://www.oklink.com/amoy/address/" + SAFE_ADDRESS);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 