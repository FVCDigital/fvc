import { ethers } from "hardhat";

async function main() {
    const [signer] = await ethers.getSigners();
    const address = await signer.getAddress();
    const balance = await ethers.provider.getBalance(address);
    
    console.log("Signer Address:", address);
    console.log("Signer Balance:", ethers.formatEther(balance), "MATIC");
    
    if (balance === BigInt(0)) {
        console.log("\n❌ No MATIC found! Please get testnet MATIC from:");
        console.log("https://faucet.polygon.technology/");
    } else {
        console.log("\n✅ You have MATIC! Ready to deploy.");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}); 