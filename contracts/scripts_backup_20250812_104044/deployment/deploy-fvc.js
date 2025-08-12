const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer] = await ethers.getSigners();
    const name = "First Venture Capital";
    const symbol = "FVC";

    console.log("Deploying FVC token...");
    console.log("Deployer:", deployer.address);

    const FVC = await ethers.getContractFactory("FVC");
    const proxy = await upgrades.deployProxy(FVC, [name, symbol, deployer.address], {
        initializer: "initialize"
    });

    await proxy.waitForDeployment();
    const proxyAddress = await proxy.getAddress();

    console.log(`✅ FVC Proxy deployed to: ${proxyAddress}`);

    // Get contract artifact and ABI
    const artifact = await hre.artifacts.readArtifact("FVC");
    const abi = artifact.abi;

    // Write to dapp contracts
    const outputPath = path.join(__dirname, "..", "..", "dapp", "contracts", "fvc.ts");
    fs.writeFileSync(outputPath, 
`export const FVC_ABI = ${JSON.stringify(abi, null, 2)};
export const FVC_ADDRESS = "${proxyAddress}";
`.trim());
    
    console.log(`✅ ABI and address written to: ${outputPath}`);

    // Log deployment summary
    console.log("\n=== FVC DEPLOYMENT SUMMARY ===");
    console.log("FVC Token:", proxyAddress);
    console.log("Name:", name);
    console.log("Symbol:", symbol);
    console.log("Admin:", deployer.address);
    console.log("==============================\n");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
