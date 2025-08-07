const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
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
    console.log("✅ FVC Token deployed to:", fvcAddress);

    /**
     * Deploy Bonding contract with Round 0 soft launch configuration
     * 
     * @param {string} fvcAddress - The address of the FVC token
     * @param {string} usdcAddress - The address of the USDC token
     * @param {string} treasuryAddress - The address of the treasury
     */
    const Bonding = await ethers.getContractFactory("Bonding");
    const bondingProxy = await upgrades.deployProxy(Bonding, [
        fvcAddress,
        "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
        deployer.address,
        20,
        10,
        ethers.parseEther("10000000"),
        ethers.parseEther("1000000"),
        90 * 24 * 60 * 60
    ], {
        initializer: "initialize"
    });
    await bondingProxy.waitForDeployment();
    const bondingAddress = await bondingProxy.getAddress();
    console.log("✅ Bonding contract deployed to:", bondingAddress);

    // Grant MINTER_ROLE to bonding contract
    await fvcProxy.grantRole(await fvcProxy.MINTER_ROLE(), bondingAddress);
    console.log("✅ Granted MINTER_ROLE to bonding contract");

    // Set bonding contract in FVC token for vesting checks
    await fvcProxy.setBondingContract(bondingAddress);
    console.log("✅ Set bonding contract in FVC token");

    // Get contract artifacts
    const bondingArtifact = await hre.artifacts.readArtifact("Bonding");
    const fvcArtifact = await hre.artifacts.readArtifact("FVC");

    // Write bonding contract ABI and address
    const bondingOutputPath = path.join(__dirname, "..", "..", "dapp", "contracts", "bonding.ts");
    fs.writeFileSync(bondingOutputPath, 
`export const BONDING_ABI = ${JSON.stringify(bondingArtifact.abi, null, 2)};
export const BONDING_ADDRESS = "${bondingAddress}";
export const FVC_ADDRESS = "${fvcAddress}";
export const USDC_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
`.trim());
    
    console.log(`✅ Bonding ABI and address written to: ${bondingOutputPath}`);

    // Write updated FVC contract ABI and address
    const fvcOutputPath = path.join(__dirname, "..", "..", "dapp", "contracts", "fvc.ts");
    fs.writeFileSync(fvcOutputPath, 
`export const FVC_ABI = ${JSON.stringify(fvcArtifact.abi, null, 2)};
export const FVC_ADDRESS = "${fvcAddress}";
`.trim());
    
    console.log(`✅ FVC ABI and address written to: ${fvcOutputPath}`);

    // Log deployment summary
    console.log("\n=== DEPLOYMENT SUMMARY ===");
    console.log("FVC Token:", fvcAddress);
    console.log("Bonding Contract:", bondingAddress);
    console.log("USDC Address:", "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238");
    console.log("Treasury:", deployer.address);
    console.log("Round: 0 - Soft Launch");
    console.log("Initial Discount: 20% (1 USDC = 1.25 FVC = $0.80)");
    console.log("Final Discount: 10% (1 USDC = 1.11 FVC = $0.90)");
    console.log("Epoch Cap: 10M tokens");
    console.log("Wallet Cap: 1M tokens");
    console.log("Vesting Period: 90 days");
    console.log("Target Price Range: $0.80 - $0.90");
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
            console.log("✅ Bonding contract verified on PolygonScan");
        } catch (error) {
            console.log("❌ Verification failed:", error);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
