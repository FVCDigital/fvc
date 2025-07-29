import { ethers, upgrades } from "hardhat";
import * as fs from "fs";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as path from "path";

async function main() {
    const hre: HardhatRuntimeEnvironment = require("hardhat");
    const [deployer] = await ethers.getSigners();
    
    console.log("Deploying Bonding contract with $1 FVC target valuation");
    console.log("Deployer:", deployer.address);

    // Deploy FVC token first
    const FVC = await ethers.getContractFactory("FVC");
    const fvcProxy = await upgrades.deployProxy(FVC, ["First Venture Capital", "FVC", deployer.address], {
        initializer: "initialize"
    });
    await fvcProxy.waitForDeployment();
    const fvcAddress = await fvcProxy.getAddress();
    console.log("FVC Token deployed to:", fvcAddress);

    // Deploy Bonding contract with premium-based pricing for $1 FVC target
    const Bonding = await ethers.getContractFactory("Bonding");
    const bondingProxy = await upgrades.deployProxy(Bonding, [
        fvcAddress, // FVC token address
        "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // USDC on Polygon
        deployer.address, // Treasury address
        0, // Initial premium: 0% (1 USDC = 1 FVC = $1)
        20, // Final premium: 20% (1.2 USDC = 1 FVC = $1.20)
        ethers.parseEther("80000000"), // Epoch cap: 80M tokens
        ethers.parseEther("8000000"), // Wallet cap: 8M tokens
        90 * 24 * 60 * 60 // Vesting period: 90 days
    ], {
        initializer: "initialize"
    });
    await bondingProxy.waitForDeployment();
    const bondingAddress = await bondingProxy.getAddress();
    console.log("Bonding contract deployed to:", bondingAddress);

    // Grant MINTER_ROLE to bonding contract
    await fvcProxy.grantRole(await fvcProxy.MINTER_ROLE(), bondingAddress);
    console.log("Granted MINTER_ROLE to bonding contract");

    // Set bonding contract in FVC token for vesting checks
    await (fvcProxy as any).setBondingContract(bondingAddress);
    console.log("Set bonding contract in FVC token");

    // Get contract artifacts
    const bondingArtifact = await hre.artifacts.readArtifact("Bonding");
    const fvcArtifact = await hre.artifacts.readArtifact("FVC");

    // Write bonding contract ABI and address
    const bondingOutputPath = path.join(__dirname, "..", "..", "dapp", "contracts", "bonding.ts");
    fs.writeFileSync(bondingOutputPath, 
`export const BONDING_ABI = ${JSON.stringify(bondingArtifact.abi, null, 2)};
export const BONDING_ADDRESS = "${bondingAddress}";
export const FVC_ADDRESS = "${fvcAddress}";
export const USDC_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
`.trim());
    
    console.log(`Bonding ABI and address written to: ${bondingOutputPath}`);

    // Write updated FVC contract ABI and address
    const fvcOutputPath = path.join(__dirname, "..", "..", "dapp", "contracts", "fvc.ts");
    fs.writeFileSync(fvcOutputPath, 
`export const FVC_ABI = ${JSON.stringify(fvcArtifact.abi, null, 2)};
export const FVC_ADDRESS = "${fvcAddress}";
`.trim());
    
    console.log(`FVC ABI and address written to: ${fvcOutputPath}`);

    // Log deployment summary
    console.log("\n=== DEPLOYMENT SUMMARY ===");
    console.log("FVC Token:", fvcAddress);
    console.log("Bonding Contract:", bondingAddress);
    console.log("USDC Address:", "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174");
    console.log("Treasury:", deployer.address);
    console.log("Initial Premium: 0% (1 USDC = 1 FVC = $1)");
    console.log("Final Premium: 20% (1.2 USDC = 1 FVC = $1.20)");
    console.log("Epoch Cap: 80M tokens");
    console.log("Wallet Cap: 8M tokens");
    console.log("Vesting Period: 90 days");
    console.log("Target FVC Price: $1.00");
    console.log("========================\n");

    // Verify contracts on PolygonScan (if not on localhost)
    if (hre.network.name !== "localhost" && hre.network.name !== "hardhat") {
        console.log("Waiting for block confirmations...");
        await bondingProxy.deploymentTransaction()?.wait(5);
        
        console.log("Verifying contracts on PolygonScan...");
        try {
            await hre.run("verify:verify", {
                address: bondingAddress,
                constructorArguments: [],
            });
            console.log("Bonding contract verified on PolygonScan");
        } catch (error) {
            console.log("Verification failed:", error);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}); 