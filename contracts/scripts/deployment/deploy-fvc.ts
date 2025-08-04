import { ethers, upgrades } from "hardhat";
import * as fs from "fs";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as path from "path";

async function main() {
    const hre: HardhatRuntimeEnvironment = require("hardhat");
    const [deployer] = await ethers.getSigners();
    const name = "First Venture Capital";
    const symbol = "FVC";

    const FVC = await ethers.getContractFactory("FVC");
    const proxy = await upgrades.deployProxy(FVC, [name, symbol, deployer.address], {
        initializer: "initialize"
    });

    await proxy.waitForDeployment();
    const proxyAddress = await proxy.getAddress();

    console.log(`FVC Proxy deployed to: ${proxyAddress}`);

    const artifact = await hre.artifacts.readArtifact("FVC");
    const abi = artifact.abi;

    const outputPath = path.join(__dirname, "..", "..", "dapp", "contracts", "fvc.ts");
    fs.writeFileSync(outputPath, 
`export const FVC_ABI = ${JSON.stringify(abi, null, 2)};
export const FVC_ADDRESS = "${proxyAddress}";
`.trim());
    
    console.log(`ABI and address written to: ${outputPath}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
}); 