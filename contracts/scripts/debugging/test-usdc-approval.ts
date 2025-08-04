import { ethers } from "hardhat";

async function main() {
  const userAddress = "0xcABa97a2bb6ca2797e302C864C37632b4185d595";
  const mockUSDCAddress = "0x11Cf72a75e284B61548B87fB5ad8B8693FCfB1fb";
  const bondingAddress = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9";
  
  // Get contracts
  const mockUSDC = await ethers.getContractAt("MockUSDC", mockUSDCAddress);
  const bonding = await ethers.getContractAt("Bonding", bondingAddress);
  
  console.log("=== USDC APPROVAL TEST ===");
  console.log("User address:", userAddress);
  console.log("Mock USDC address:", mockUSDCAddress);
  console.log("Bonding address:", bondingAddress);
  
  // Check USDC balance
  const usdcBalance = await mockUSDC.balanceOf(userAddress);
  console.log("User USDC balance:", ethers.formatUnits(usdcBalance, 6));
  
  // Check current allowance
  const currentAllowance = await mockUSDC.allowance(userAddress, bondingAddress);
  console.log("Current allowance:", ethers.formatUnits(currentAllowance, 6));
  
  // Test approval amount
  const approvalAmount = ethers.parseUnits("1000", 6); // 1000 USDC
  console.log("Testing approval for:", ethers.formatUnits(approvalAmount, 6), "USDC");
  
  // Check if approval is needed
  if (currentAllowance >= approvalAmount) {
    console.log("✅ Sufficient allowance already exists");
  } else {
    console.log("❌ Approval needed");
  }
  
  // Test the approval transaction
  console.log("\n=== TESTING APPROVAL ===");
  try {
    const tx = await mockUSDC.approve(bondingAddress, approvalAmount);
    console.log("Approval transaction hash:", tx.hash);
    await tx.wait();
    console.log("✅ Approval successful");
    
    // Check new allowance
    const newAllowance = await mockUSDC.allowance(userAddress, bondingAddress);
    console.log("New allowance:", ethers.formatUnits(newAllowance, 6));
  } catch (error) {
    console.log("❌ Approval failed:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 