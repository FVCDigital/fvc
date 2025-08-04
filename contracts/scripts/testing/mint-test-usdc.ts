import { ethers } from "hardhat";

async function main() {
  // USDC contract address on Amoy
  const usdcAddress = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
  
  // Get the USDC contract
  const usdc = await ethers.getContractAt("IERC20", usdcAddress);
  
  // Get the signer (deployer)
  const [deployer] = await ethers.getSigners();
  
  console.log("=== MINTING TEST USDC ===");
  console.log("Deployer address:", deployer.address);
  console.log("USDC contract:", usdcAddress);
  
  // Check if USDC has mint function (it might not)
  try {
    // Try to call mint function if it exists
    const mintFunction = usdc.interface.getFunction("mint");
    console.log("USDC has mint function");
    
    // Mint 1000 USDC to deployer
    const mintAmount = ethers.parseUnits("1000", 6); // 1000 USDC
    const tx = await usdc.mint(deployer.address, mintAmount);
    await tx.wait();
    
    console.log("✅ Minted 1000 USDC to deployer");
  } catch (error) {
    console.log("❌ USDC contract doesn't have mint function or mint failed");
    console.log("You'll need to get USDC from a faucet or swap ETH for USDC");
    
    // Check USDC balance
    const balance = await usdc.balanceOf(deployer.address);
    console.log("Current USDC balance:", ethers.formatUnits(balance, 6));
  }
  
  // Check final balance
  const finalBalance = await usdc.balanceOf(deployer.address);
  console.log("Final USDC balance:", ethers.formatUnits(finalBalance, 6));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 