import { ethers, upgrades } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    
    console.log("Deploying FVC token only");
    console.log("Deployer:", deployer.address);
    console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "MATIC");

    // Deploy FVC token first
    const FVC = await ethers.getContractFactory("FVC");
    console.log("Deploying FVC proxy...");
    
    const fvcProxy = await upgrades.deployProxy(FVC, ["First Venture Capital", "FVC", deployer.address], {
        initializer: "initialize"
    });
    
    console.log("Waiting for deployment...");
    await fvcProxy.waitForDeployment();
    const fvcAddress = await fvcProxy.getAddress();
    console.log("✅ FVC Token deployed to:", fvcAddress);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}); 