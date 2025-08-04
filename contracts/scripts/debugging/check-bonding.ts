import { ethers } from "hardhat";

async function main() {
    const bondingAddress = "0xD5C5532494D2fA3e1BaC504f10F62a052Ef36155";

    console.log("=== BONDING CONTRACT CHECK ===");
    console.log("Bonding Address:", bondingAddress);

    try {
        // Get bonding contract
        const bonding = await ethers.getContractAt("Bonding", bondingAddress);

        // Check current round
        const round = await bonding.getCurrentRound();
        console.log("Current Round ID:", round.roundId.toString());
        console.log("Is Active:", round.isActive);
        console.log("Initial Discount:", round.initialDiscount.toString(), "%");
        console.log("Final Discount:", round.finalDiscount.toString(), "%");
        console.log("Epoch Cap:", ethers.formatEther(round.epochCap), "tokens");
        console.log("Total Bonded:", ethers.formatEther(round.totalBonded), "USDC");

        // Check current discount
        const currentDiscount = await bonding.getCurrentDiscount();
        console.log("Current Discount:", currentDiscount.toString(), "%");

        // Check if round is active
        if (round.isActive) {
            console.log("✅ Round 0 is ACTIVE - bonding is ready!");
        } else {
            console.log("❌ Round 0 is NOT ACTIVE");
        }

    } catch (error) {
        console.log("❌ Error checking bonding contract:", error);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}); 