import { ethers } from "hardhat";

async function main() {
    const address = "0xcABa97a2bb6ca2797e302C864C37632b4185d595";
    const balance = await ethers.provider.getBalance(address);
    console.log("Wallet Address:", address);
    console.log("Balance:", ethers.formatEther(balance), "MATIC");
    
    if (balance === BigInt(0)) {
        console.log("\n❌ No MATIC found! Please get testnet MATIC from:");
        console.log("https://faucet.polygon.technology/");
        console.log("or");
        console.log("https://www.alchemy.com/faucets/polygon-amoy-faucet");
    } else {
        console.log("\n✅ You have MATIC! Ready to deploy.");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}); 