import { ethers } from "hardhat";

async function main() {
  console.log("=== DEPLOYING UPDATED BONDING CONTRACT TO TESTNET ===");
  
  // Contract addresses (existing)
  const fvcAddress = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";
  const usdcAddress = "0x11Cf72a75e284B61548B87fB5ad8B8693FCfB1fb";
  const treasuryAddress = "0xcABa97a2bb6ca2797e302C864C37632b4185d595"; // Your wallet as treasury
  
  console.log("FVC Address:", fvcAddress);
  console.log("USDC Address:", usdcAddress);
  console.log("Treasury Address:", treasuryAddress);
  
  // Deploy updated Bonding contract
  const Bonding = await ethers.getContractFactory("Bonding");
  
  // Initial parameters for first round
  const initialDiscount = 20; // 20%
  const finalDiscount = 10;   // 10%
  const epochCap = ethers.parseUnits("1000000", 6); // 1M USDC
  const walletCap = ethers.parseUnits("100000", 6);  // 100k USDC per wallet
  const vestingPeriod = 0; // 0 seconds for immediate unlock (testnet)
  
  console.log("Deploying updated Bonding with parameters:");
  console.log("- Initial Discount:", initialDiscount, "%");
  console.log("- Final Discount:", finalDiscount, "%");
  console.log("- Epoch Cap:", ethers.formatUnits(epochCap, 6), "USDC");
  console.log("- Wallet Cap:", ethers.formatUnits(walletCap, 6), "USDC");
  console.log("- Vesting Period:", vestingPeriod, "seconds");
  
  const bonding = await Bonding.deploy(
    fvcAddress,
    usdcAddress,
    treasuryAddress,
    initialDiscount,
    finalDiscount,
    epochCap,
    walletCap,
    vestingPeriod
  );
  
  await bonding.waitForDeployment();
  
  const bondingAddress = await bonding.getAddress();
  console.log("✅ Updated Bonding deployed at:", bondingAddress);
  
  // Verify the deployment
  console.log("\n=== VERIFYING DEPLOYMENT ===");
  
  const owner = await bonding.owner();
  console.log("Contract owner:", owner);
  
  const fvc = await bonding.fvc();
  console.log("FVC address:", fvc);
  
  const usdc = await bonding.usdc();
  console.log("USDC address:", usdc);
  
  const treasury = await bonding.treasury();
  console.log("Treasury address:", treasury);
  
  console.log("\n=== DEPLOYMENT COMPLETE ===");
  console.log("Updated Bonding Address:", bondingAddress);
  console.log("You can now use the emergency unlock functions!");
  
  return bondingAddress;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
