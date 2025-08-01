import { ethers } from "hardhat";

async function main() {
    const bondingAddress = "0xD5C5532494D2fA3e1BaC504f10F62a052Ef36155";
    const usdcAddress = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
    const testUser = "0xcABa97a2bb6ca2797e302C864C37632b4185d595";

    console.log("=== MINIMAL BONDING TEST ===");
    console.log("Testing with minimal gas usage...");

    try {
        // Get contracts
        const bonding = await ethers.getContractAt("Bonding", bondingAddress);
        const usdc = await ethers.getContractAt("IERC20", usdcAddress);

        // Check if bonding is ready
        const currentRound = await bonding.getCurrentRound();
        console.log("Round Active:", currentRound.isActive);
        console.log("Current Discount:", (await bonding.getCurrentDiscount()).toString(), "%");

        // Check USDC balance (if any)
        try {
            const usdcBalance = await usdc.balanceOf(testUser);
            console.log("USDC Balance:", ethers.formatUnits(usdcBalance, 6));
        } catch (error) {
            console.log("USDC Balance: Error reading (might not have USDC)");
        }

        // Check POL balance
        const polBalance = await ethers.provider.getBalance(testUser);
        console.log("POL Balance:", ethers.formatEther(polBalance));

        if (currentRound.isActive) {
            console.log("\n✅ BONDING CONTRACT IS READY!");
            console.log("You can test bonding in the dapp at: http://localhost:3000");
            console.log("Make sure you have USDC from a faucet first.");
        } else {
            console.log("\n❌ BONDING CONTRACT NOT ACTIVE");
        }

    } catch (error) {
        console.log("❌ Error:", error);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}); 