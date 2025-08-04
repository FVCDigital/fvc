import { ethers } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";

async function main() {
    const hre: HardhatRuntimeEnvironment = require("hardhat");
    
    console.log("=== NETWORK DIAGNOSTICS ===");
    console.log("Network:", hre.network.name);
    console.log("Chain ID:", hre.network.config.chainId);
    
    const [signer] = await ethers.getSigners();
    console.log("Signer:", await signer.getAddress());
    
    try {
        const balance = await ethers.provider.getBalance(await signer.getAddress());
        console.log("Balance:", ethers.formatEther(balance), "MATIC");
        
        const gasPrice = await ethers.provider.getFeeData();
        console.log("Gas Price:", ethers.formatUnits(gasPrice.gasPrice || 0, "gwei"), "gwei");
        
        const blockNumber = await ethers.provider.getBlockNumber();
        console.log("Block Number:", blockNumber);
        
        console.log("✅ Network connection successful");
    } catch (error) {
        console.log("❌ Network connection failed:", error);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}); 