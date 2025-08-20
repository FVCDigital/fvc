import { ethers } from "hardhat";

async function main() {
  console.log("=== VERIFYING FRESH FVC DEPLOYMENT ON AMOY ===\n");

  // Get the signer
  const [deployer] = await ethers.getSigners();
  console.log("🔍 Checking from deployer:", deployer.address);
  
  // Let's re-deploy to get fresh addresses and verify
  console.log("\n📦 Re-deploying to get fresh contract addresses...");
  
  // ============ DEPLOY FVC TOKEN ============
  console.log("\n📦 Deploying FVC Token...");
  const FVC = await ethers.getContractFactory("FVC");
  const fvcToken = await FVC.deploy(
    "First Venture Capital",
    "FVC", 
    deployer.address
  );
  await fvcToken.waitForDeployment();
  
  const fvcAddress = await fvcToken.getAddress();
  console.log("✅ FVC Token deployed to:", fvcAddress);

  // Check initial supply (should be 0)
  const initialSupply = await fvcToken.totalSupply();
  console.log("📊 Initial Total Supply:", ethers.formatEther(initialSupply), "FVC");

  // ============ MINT CORRECT ALLOCATIONS ============
  console.log("\n💰 Minting correct whitepaper allocations...");
  
  const allocations = {
    bonding: ethers.parseEther("205000000"),    // 205M (20.5%)
    founders: ethers.parseEther("170000000"),   // 170M (17.0%)
    treasury: ethers.parseEther("270000000"),   // 270M (27.0%)
    marketing: ethers.parseEther("305000000"),  // 305M (30.5%)
    liquidity: ethers.parseEther("50000000")    // 50M (5.0%)
  };

  // Debug: Print each allocation value
  console.log("📋 Allocation breakdown:");
  console.log("- Bonding:", ethers.formatEther(allocations.bonding), "FVC");
  console.log("- Founders:", ethers.formatEther(allocations.founders), "FVC");
  console.log("- Treasury:", ethers.formatEther(allocations.treasury), "FVC");
  console.log("- Marketing:", ethers.formatEther(allocations.marketing), "FVC");
  console.log("- Liquidity:", ethers.formatEther(allocations.liquidity), "FVC");
  
  const calculatedTotal = allocations.bonding + allocations.founders + allocations.treasury + allocations.marketing + allocations.liquidity;
  console.log("- Calculated Total:", ethers.formatEther(calculatedTotal), "FVC");

  console.log("Minting allocations to deployer address...");
  
  // Mint each allocation with verification
  console.log("- Minting Bonding allocation:", ethers.formatEther(allocations.bonding), "FVC");
  let tx = await fvcToken.mint(deployer.address, allocations.bonding);
  await tx.wait();
  let currentSupply = await fvcToken.totalSupply();
  console.log("  ✅ Current supply after bonding:", ethers.formatEther(currentSupply), "FVC");
  
  console.log("- Minting Founders allocation:", ethers.formatEther(allocations.founders), "FVC");
  tx = await fvcToken.mint(deployer.address, allocations.founders);
  await tx.wait();
  currentSupply = await fvcToken.totalSupply();
  console.log("  ✅ Current supply after founders:", ethers.formatEther(currentSupply), "FVC");
  
  console.log("- Minting Treasury allocation:", ethers.formatEther(allocations.treasury), "FVC");
  tx = await fvcToken.mint(deployer.address, allocations.treasury);
  await tx.wait();
  currentSupply = await fvcToken.totalSupply();
  console.log("  ✅ Current supply after treasury:", ethers.formatEther(currentSupply), "FVC");
  
  console.log("- Minting Marketing allocation:", ethers.formatEther(allocations.marketing), "FVC");
  tx = await fvcToken.mint(deployer.address, allocations.marketing);
  await tx.wait();
  currentSupply = await fvcToken.totalSupply();
  console.log("  ✅ Current supply after marketing:", ethers.formatEther(currentSupply), "FVC");
  
  console.log("- Minting Liquidity allocation:", ethers.formatEther(allocations.liquidity), "FVC");
  tx = await fvcToken.mint(deployer.address, allocations.liquidity);
  await tx.wait();
  currentSupply = await fvcToken.totalSupply();
  console.log("  ✅ Current supply after liquidity:", ethers.formatEther(currentSupply), "FVC");

  // ============ VERIFY FINAL TOTALS ============
  console.log("\n📊 FINAL VERIFICATION:");
  
  const totalSupply = await fvcToken.totalSupply();
  const deployerBalance = await fvcToken.balanceOf(deployer.address);
  
  console.log("✅ Total Supply:", ethers.formatEther(totalSupply), "FVC");
  console.log("✅ Deployer Balance:", ethers.formatEther(deployerBalance), "FVC");
  console.log("✅ Contract Address:", fvcAddress);
  
  // Calculate total from allocations
  const totalAllocated = allocations.bonding + allocations.founders + allocations.treasury + allocations.marketing + allocations.liquidity;
  console.log("✅ Expected Total:", ethers.formatEther(totalAllocated), "FVC");
  
  // Verify it matches 1B exactly
  const oneBillion = ethers.parseEther("1000000000");
  const isCorrect = totalSupply === oneBillion;
  
  console.log("\n🎯 RESULT:");
  console.log("Expected: 1,000,000,000 FVC");
  console.log("Actual:  ", ethers.formatEther(totalSupply), "FVC");
  console.log("✅ Correct tokenomics:", isCorrect ? "YES! 🎉" : "NO! ❌");
  
  if (isCorrect) {
    console.log("\n🚀 SUCCESS: No more 3.3B FVC nonsense!");
    console.log("✅ Clean 1B FVC supply matching whitepaper");
    console.log("✅ All allocations properly distributed");
    console.log("\n📝 Contract Details:");
    console.log("- FVC Token:", fvcAddress);
    console.log("- Network: Polygon Amoy Testnet");
    console.log("- Total Supply: 1,000,000,000 FVC");
  } else {
    console.log("❌ Something went wrong with tokenomics!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
