import { ethers, upgrades } from "hardhat";
import * as fs from "fs";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as path from "path";

async function main() {
    const hre: HardhatRuntimeEnvironment = require("hardhat");
    const [deployer] = await ethers.getSigners();
    
    console.log("Deploying FVC Protocol with $1 FVC Target Valuation");
    console.log("Deployer:", deployer.address);

    // Deploy FVC token
    const FVC = await ethers.getContractFactory("FVC");
    const fvcProxy = await upgrades.deployProxy(FVC, ["First Venture Capital", "FVC", deployer.address], {
        initializer: "initialize"
    });
    await fvcProxy.waitForDeployment();
    const fvcAddress = await fvcProxy.getAddress();
    console.log("FVC Token deployed to:", fvcAddress);

    // Deploy Bonding contract with Round 0 configuration ($1 target)
    const Bonding = await ethers.getContractFactory("Bonding");
    const bondingProxy = await upgrades.deployProxy(Bonding, [
        fvcAddress, // FVC token address
        "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // USDC on Polygon
        deployer.address, // Treasury address
        20, // Initial discount: 20% (1 USDC = 1.25 FVC = $0.80)
        10, // Final discount: 10% (1 USDC = 1.11 FVC = $0.90)
        ethers.parseEther("10000000"), // Epoch cap: 10M tokens (Round 0)
        ethers.parseEther("1000000"), // Wallet cap: 1M tokens
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

    // Calculate total allocation across all rounds
    const rounds = [
        { name: "Round 0 - Soft Launch", initialDiscount: 20, finalDiscount: 10, epochCap: "10000000", walletCap: "1000000" },
        { name: "Round 1 - Genesis", initialDiscount: 10, finalDiscount: 5, epochCap: "80000000", walletCap: "8000000" },
        { name: "Round 2 - Early Adopters", initialDiscount: 5, finalDiscount: 2, epochCap: "60000000", walletCap: "6000000" },
        { name: "Round 3 - Community", initialDiscount: 2, finalDiscount: 1, epochCap: "40000000", walletCap: "4000000" },
        { name: "Round 4 - Public", initialDiscount: 1, finalDiscount: 0, epochCap: "15000000", walletCap: "2000000" }
    ];

    const totalAllocation = rounds.reduce((sum, round) => sum + parseFloat(round.epochCap), 0);

    // Write bonding contract ABI and address
    const bondingOutputPath = path.join(__dirname, "..", "..", "dapp", "contracts", "bonding.ts");
    fs.writeFileSync(bondingOutputPath, 
`export const BONDING_ABI = ${JSON.stringify(bondingArtifact.abi, null, 2)};
export const BONDING_ADDRESS = "${bondingAddress}";
export const FVC_ADDRESS = "${fvcAddress}";
export const USDC_ADDRESS = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";

// Round configurations for $1 FVC target valuation
export const ROUND_CONFIGS = [
    {
        name: "Round 0 - Soft Launch",
        initialDiscount: 20,
        finalDiscount: 10,
        epochCap: "10000000",
        walletCap: "1000000",
        vestingPeriod: 90 * 24 * 60 * 60,
        targetPrice: "$0.80 - $0.90"
    },
    {
        name: "Round 1 - Genesis",
        initialDiscount: 10,
        finalDiscount: 5,
        epochCap: "80000000",
        walletCap: "8000000",
        vestingPeriod: 90 * 24 * 60 * 60,
        targetPrice: "$0.90 - $0.95"
    },
    {
        name: "Round 2 - Early Adopters", 
        initialDiscount: 5,
        finalDiscount: 2,
        epochCap: "60000000",
        walletCap: "6000000",
        vestingPeriod: 90 * 24 * 60 * 60,
        targetPrice: "$0.95 - $0.98"
    },
    {
        name: "Round 3 - Community",
        initialDiscount: 2,
        finalDiscount: 1,
        epochCap: "40000000",
        walletCap: "4000000",
        vestingPeriod: 90 * 24 * 60 * 60,
        targetPrice: "$0.98 - $0.99"
    },
    {
        name: "Round 4 - Public",
        initialDiscount: 1,
        finalDiscount: 0,
        epochCap: "15000000",
        walletCap: "2000000",
        vestingPeriod: 90 * 24 * 60 * 60,
        targetPrice: "$0.99 - $1.00"
    }
];
`.trim());
    
    console.log(`Bonding ABI and round configs written to: ${bondingOutputPath}`);

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
    console.log("Total Bonding Allocation:", `${ethers.formatEther(totalAllocation)}M tokens`);
    console.log("Number of Rounds:", rounds.length);
    console.log("Target FVC Price Range: $1.00 - $1.60");
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

    console.log("✅ Deployment complete! Ready for Round 1.");
    console.log("📋 To start Round 2, call: bonding.startNewRound(10, 30, 60000000, 6000000, 7776000)");
    console.log("📋 To start Round 3, call: bonding.startNewRound(20, 40, 40000000, 4000000, 7776000)");
    console.log("📋 To start Round 4, call: bonding.startNewRound(30, 50, 15000000, 2000000, 7776000)");
    console.log("📋 To start Round 5, call: bonding.startNewRound(40, 60, 5000000, 1000000, 7776000)");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}); 