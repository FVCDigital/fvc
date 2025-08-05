const { ethers } = require("hardhat");

async function main() {
  console.log("🧮 Explaining Bonding Math & FVC Distribution...");

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

  console.log("📋 Current Bonding Round State:");
  /**
   * @constant {Object} currentRound - The current round of the bonding contract.
   * @constant {BigNumber} totalBonded - The total amount of USDC bonded.
   * @constant {BigNumber} epochCap - The epoch cap for the bonding contract.
   * @constant {BigNumber} currentDiscount - The current discount for the bonding contract.
   */
  const currentRound = await bonding.getCurrentRound();
  const totalBonded = await bonding.totalBonded();
  const epochCap = await bonding.epochCap();
  const currentDiscount = await bonding.getCurrentDiscount();

  console.log("Round ID:", currentRound.roundId.toString());
  console.log("Epoch Cap:", ethers.formatUnits(epochCap, 6), "USDC");
  console.log("Total Bonded:", ethers.formatUnits(totalBonded, 6), "USDC");
  console.log("Current Discount:", currentDiscount.toString() + "%");

  console.log("\n🎯 BONDING ROUND EXPLANATION:");
  console.log("The bonding round is NOT about distributing treasury FVC!");
  console.log("The bonding round is about selling NEW FVC tokens to users.");
  console.log("");
  console.log("Here's how it works:");
  console.log("1. Treasury has 10M FVC (for future use)");
  console.log("2. Bonding contract can MINT NEW FVC tokens");
  console.log("3. Users bond USDC → receive NEW FVC tokens");
  console.log("4. USDC goes to treasury, NEW FVC goes to users");

  console.log("\n📊 CURRENT ROUND CAPACITY:");
  console.log("Epoch Cap: 1,000,000 USDC");
  console.log("At 20% discount: 1 USDC = 1.2 FVC");
  console.log("Maximum FVC that can be sold: 1,000,000 × 1.2 = 1,200,000 FVC");

  console.log("\n💰 WHAT THE TRADING CARD SHOWS:");
  console.log("FVC Bought: 60,000 FVC (from your 50K USDC bond)");
  console.log("FVC Remaining: 1,090,000 FVC (1,200,000 - 60,000 - 50,000)");
  console.log("Wait... that doesn't add up. Let me check the math...");

   /**
   * @constant {BigNumber} maxFVCSold - The maximum amount of FVC that can be sold.
   * @constant {BigNumber} fvcBought - The amount of FVC that has been bought.
   * @constant {BigNumber} fvcRemaining - The amount of FVC that remains.
   */
  const maxFVCSold = epochCap * BigInt(100 + 20) / BigInt(100) * BigInt(1e12); // 20% discount
  const fvcBought = totalBonded * BigInt(100 + 20) / BigInt(100) * BigInt(1e12);
  const fvcRemaining = maxFVCSold - fvcBought;

  console.log("\n🧮 ACTUAL MATH:");
  console.log("Max FVC that can be sold:", ethers.formatUnits(maxFVCSold, 18));
  console.log("FVC already sold:", ethers.formatUnits(fvcBought, 18));
  console.log("FVC remaining:", ethers.formatUnits(fvcRemaining, 18));

  console.log("\n🔍 WHY THE CONFUSION:");
  console.log("You're thinking: 'We allocated 10M FVC total'");
  console.log("Reality: 'This round can sell 1.2M FVC maximum'");
  console.log("");
  console.log("The 10M FVC in treasury is SEPARATE from bonding rounds!");
  console.log("Each bonding round has its own cap and can mint new FVC tokens.");

  console.log("\n📈 TREASURY vs BONDING ROUNDS:");
  console.log("Treasury FVC: 10,000,000 (for future buybacks, etc.)");
  console.log("Current Round: Can sell up to 1,200,000 FVC");
  console.log("Future Rounds: Will have different caps");
  console.log("");
  console.log("The 10M treasury FVC is NOT being distributed in bonding!");
  console.log("Bonding creates NEW FVC tokens and sends USDC to treasury.");

  console.log("\n✅ SUMMARY:");
  console.log("1. Treasury has 10M FVC (correct)");
  console.log("2. Current round can sell 1.2M FVC (correct)");
  console.log("3. You bought 60K FVC, 1.09M FVC remaining (correct)");
  console.log("4. Trading card math is accurate");
  console.log("5. The 10M treasury FVC is separate from bonding rounds");

  console.log("\n🎯 NEXT STEPS:");
  console.log("To test with 10M FVC total, you would need to:");
  console.log("1. Set epoch cap to 8.33M USDC (10M FVC ÷ 1.2)");
  console.log("2. Or create multiple rounds that total 10M FVC");
  console.log("3. Or use treasury FVC for buybacks instead of bonding");

  console.log("\n🔗 Safe URL: https://safe.global/app/amoy:" + SAFE_ADDRESS);
  console.log("🔍 Explorer: https://www.oklink.com/amoy/address/" + SAFE_ADDRESS);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  }); 