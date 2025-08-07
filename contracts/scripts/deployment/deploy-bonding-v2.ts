import { ethers } from "hardhat";

async function main() {
  console.log("=== DEPLOYING BONDING V2 CONTRACT ===");
  
  // Contract addresses (existing)
  const fvcAddress = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057";
  const usdcAddress = "0x11Cf72a75e284B61548B87fB5ad8B8693FCfB1fb";
  const treasuryAddress = "0xcABa97a2bb6ca2797e302C864C37632b4185d595"; // Your wallet as treasury
  
  console.log("FVC Address:", fvcAddress);
  console.log("USDC Address:", usdcAddress);
  console.log("Treasury Address:", treasuryAddress);
  
  // Deploy BondingV2 contract
  const BondingV2 = await ethers.getContractFactory("BondingV2");
  
  // Initial parameters for first round
  const initialDiscount = 20; // 20%
  const finalDiscount = 10;   // 10%
  const epochCap = ethers.parseUnits("1000000", 6); // 1M USDC
  const walletCap = ethers.parseUnits("100000", 6);  // 100k USDC per wallet
  const vestingPeriod = 0; // 0 seconds for immediate unlock (testnet)
  
  console.log("Deploying BondingV2 with parameters:");
  console.log("- Initial Discount:", initialDiscount, "%");
  console.log("- Final Discount:", finalDiscount, "%");
  console.log("- Epoch Cap:", ethers.formatUnits(epochCap, 6), "USDC");
  console.log("- Wallet Cap:", ethers.formatUnits(walletCap, 6), "USDC");
  console.log("- Vesting Period:", vestingPeriod, "seconds");
  
  const bondingV2 = await BondingV2.deploy(
    fvcAddress,
    usdcAddress,
    treasuryAddress,
    initialDiscount,
    finalDiscount,
    epochCap,
    walletCap,
    vestingPeriod
  );
  
  await bondingV2.waitForDeployment();
  
  const bondingV2Address = await bondingV2.getAddress();
  console.log("✅ BondingV2 deployed at:", bondingV2Address);
  
  // Verify the deployment
  console.log("\n=== VERIFYING DEPLOYMENT ===");
  
  const owner = await bondingV2.owner();
  console.log("Contract owner:", owner);
  
  const fvc = await bondingV2.fvc();
  console.log("FVC address:", fvc);
  
  const usdc = await bondingV2.usdc();
  console.log("USDC address:", usdc);
  
  const treasury = await bondingV2.treasury();
  console.log("Treasury address:", treasury);
  
  const currentRound = await bondingV2.getCurrentRound();
  console.log("Current round ID:", currentRound.roundId);
  console.log("Current round active:", currentRound.isActive);
  
  console.log("\n=== DEPLOYMENT COMPLETE ===");
  console.log("BondingV2 Address:", bondingV2Address);
  console.log("You can now use the emergency unlock functions!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
