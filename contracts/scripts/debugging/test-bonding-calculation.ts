import { ethers } from "hardhat";

async function main() {
  const bondingAddress = "0x0C81CCEB47507a1F030f13002325a6e8A99953E9"; // New bonding contract
  const fvcAddress = "0x8Bf97817B8354b960e26662c65F9d0b3732c9057"; // New FVC token
  
  // Get the bonding contract
  const bonding = await ethers.getContractAt("Bonding", bondingAddress);
  
  console.log("=== BONDING CALCULATION TEST (NEW CONTRACT) ===");
  
  // Test the calculation manually
  const usdcAmount = ethers.parseUnits("12101", 6); // 12,101 USDC (what you actually bonded)
  const discount = 20; // 20%
  
  console.log("USDC amount:", ethers.formatUnits(usdcAmount, 6));
  console.log("Discount:", discount, "%");
  
  // Manual calculation with decimal fix: FVC = USDC * (1 + discount/100) * 1e12
  const fvcAmount = usdcAmount * BigInt(100 + discount) / BigInt(100) * BigInt(1e12);
  console.log("Expected FVC (with decimal fix):", ethers.formatUnits(fvcAmount, 18));
  
  // Check what the contract actually calculated
  const userAddress = "0xcABa97a2bb6ca2797e302C864C37632b4185d595";
  const fvc = await ethers.getContractAt("FVC", fvcAddress);
  const actualFVC = await fvc.balanceOf(userAddress);
  console.log("Actual FVC:", ethers.formatUnits(actualFVC, 18));
  
  // Check if amounts match
  console.log("\n=== COMPARISON ===");
  if (actualFVC === fvcAmount) {
    console.log("✅ FVC amount matches expected calculation");
  } else {
    console.log("❌ FVC amount doesn't match expected calculation");
    console.log("This suggests the bonding transaction was for a different amount");
  }
  
  // Test with different amounts
  console.log("\n=== TESTING DIFFERENT AMOUNTS ===");
  const testAmounts = [100, 1000, 10000]; // USDC amounts
  
  for (const amount of testAmounts) {
    const usdcTest = ethers.parseUnits(amount.toString(), 6);
    const fvcTest = usdcTest * BigInt(120) / BigInt(100) * BigInt(1e12);
    console.log(`${amount} USDC → ${ethers.formatUnits(fvcTest, 18)} FVC`);
  }
  
  console.log("\n=== CONCLUSION ===");
  console.log("If you bonded 12,101 USDC, you should have ~14,521 FVC");
  console.log("If you have much less, the bonding transaction was for a smaller amount");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 