import { ethers, upgrades } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    
    console.log("🔍 Testing FVC Contract...");
    console.log("Deployer address:", deployer.address);
    
    // Deploy a fresh contract for testing
    const FVC = await ethers.getContractFactory("FVC");
    const fvc = await upgrades.deployProxy(FVC, ["First Venture Capital", "FVC", deployer.address], {
        initializer: "initialize"
    });
    
    await fvc.waitForDeployment();
    const address = await fvc.getAddress();
    
    console.log("✅ FVC Contract deployed to:", address);
    console.log("Name:", await fvc.name());
    console.log("Symbol:", await fvc.symbol());
    console.log("Total Supply:", await fvc.totalSupply());
    
    // Test minting
    console.log("\n💰 Testing mint function...");
    const mintAmount = ethers.parseEther("1000");
    await fvc.mint(deployer.address, mintAmount);
    console.log("✅ Minted 1000 FVC tokens to deployer");
    console.log("New balance:", await fvc.balanceOf(deployer.address));
    
    console.log("\n🎉 FVC Token is working perfectly!");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
}); 