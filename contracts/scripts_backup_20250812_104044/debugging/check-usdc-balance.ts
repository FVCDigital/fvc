import { ethers } from "hardhat";

async function main() {
  // USDC contract address on Amoy
  const usdcAddress = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
  
  // Get the USDC contract
  const usdc = await ethers.getContractAt("IERC20", usdcAddress);
  
  // Get the signer (deployer)
  const [deployer] = await ethers.getSigners();
  
  console.log("=== CHECKING USDC BALANCE ===");
  console.log("Wallet address:", deployer.address);
  console.log("USDC contract:", usdcAddress);
  
  // Check USDC balance
  const balance = await usdc.balanceOf(deployer.address);
  console.log("USDC balance:", ethers.formatUnits(balance, 6));
  
  if (balance === BigInt(0)) {
    console.log("\n❌ No USDC balance found!");
    console.log("To get test USDC on Amoy testnet:");
    console.log("1. Visit a DEX like QuickSwap on Amoy");
    console.log("2. Swap some MATIC for USDC");
    console.log("3. Or use a faucet if available");
    console.log("\nYou need USDC to test the bonding mechanism.");
  } else {
    console.log("\n✅ USDC balance found! You can now test bonding.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 