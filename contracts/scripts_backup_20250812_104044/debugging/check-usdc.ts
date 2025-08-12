import { ethers } from "hardhat";

async function main() {
    const usdcAddress = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
    const walletAddress = "0xcABa97a2bb6ca2797e302C864C37632b4185d595";
    
    console.log("=== USDC Balance Check ===");
    console.log("Wallet:", walletAddress);
    console.log("USDC Contract:", usdcAddress);
    
    try {
        // Create USDC contract instance
        const usdcAbi = [
            "function balanceOf(address owner) view returns (uint256)",
            "function decimals() view returns (uint8)",
            "function symbol() view returns (string)"
        ];
        
        const usdcContract = new ethers.Contract(usdcAddress, usdcAbi, ethers.provider);
        
        // Check balance
        const balance = await usdcContract.balanceOf(walletAddress);
        const decimals = await usdcContract.decimals();
        const symbol = await usdcContract.symbol();
        
        console.log("USDC Symbol:", symbol);
        console.log("USDC Decimals:", decimals);
        console.log("USDC Balance:", ethers.formatUnits(balance, decimals), "USDC");
        
        if (balance > 0) {
            console.log("✅ You have USDC! Ready to bond.");
        } else {
            console.log("❌ No USDC found. Need to get USDC from faucet.");
        }
        
    } catch (error) {
        console.log("❌ Error checking USDC balance:", error);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}); 