import { ethers } from "hardhat";

async function main() {
    const bondingAddress = "0xD5C5532494D2fA3e1BaC504f10F62a052Ef36155";
    const fvcAddress = "0x530DF46ED657f13cd6F6E5bAAf6aE9b60e2Aa136";
    const usdcAddress = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
    const testUser = "0xcABa97a2bb6ca2797e302C864C37632b4185d595";

    console.log("=== TESTING BONDING FLOW ===");
    console.log("Bonding Address:", bondingAddress);
    console.log("FVC Address:", fvcAddress);
    console.log("USDC Address:", usdcAddress);
    console.log("Test User:", testUser);

    try {
        // Get contracts
        const bonding = await ethers.getContractAt("Bonding", bondingAddress);
        const fvc = await ethers.getContractAt("FVC", fvcAddress);
        const usdc = await ethers.getContractAt("IERC20", usdcAddress);

        // Check initial state
        console.log("\n=== INITIAL STATE ===");
        const initialFVCBalance = await fvc.balanceOf(testUser);
        const initialUSDCBalance = await usdc.balanceOf(testUser);
        console.log("Initial FVC Balance:", ethers.formatEther(initialFVCBalance));
        console.log("Initial USDC Balance:", ethers.formatUnits(initialUSDCBalance, 6));

        // Check vesting schedule (should be empty initially)
        const initialVesting = await bonding.getVestingSchedule(testUser);
        console.log("Initial Vesting Schedule:", {
            amount: ethers.formatEther(initialVesting.amount),
            startTime: new Date(Number(initialVesting.startTime) * 1000),
            endTime: new Date(Number(initialVesting.endTime) * 1000)
        });

        // Check if user is locked
        const isLocked = await bonding.isLocked(testUser);
        console.log("Is User Locked:", isLocked);

        console.log("\n=== BONDING SHOULD WORK IF ===");
        console.log("1. User has USDC balance > 0");
        console.log("2. User has approved USDC spending");
        console.log("3. Round is active");
        console.log("4. Epoch cap not reached");
        console.log("5. Wallet cap not exceeded");

        // Check current round
        const currentRound = await bonding.getCurrentRound();
        console.log("\n=== CURRENT ROUND ===");
        console.log("Round ID:", currentRound.roundId.toString());
        console.log("Is Active:", currentRound.isActive);
        console.log("Epoch Cap:", ethers.formatEther(currentRound.epochCap));
        console.log("Total Bonded:", ethers.formatEther(currentRound.totalBonded));
        console.log("Wallet Cap:", ethers.formatEther(currentRound.walletCap));

        // Check USDC allowance
        const allowance = await usdc.allowance(testUser, bondingAddress);
        console.log("\n=== USDC ALLOWANCE ===");
        console.log("Allowance:", ethers.formatUnits(allowance, 6));

        if (initialUSDCBalance > 0 && allowance > 0 && currentRound.isActive) {
            console.log("\n✅ BONDING SHOULD WORK!");
            console.log("User has USDC, allowance, and round is active");
        } else {
            console.log("\n❌ BONDING WON'T WORK:");
            if (initialUSDCBalance === BigInt(0)) console.log("- No USDC balance");
            if (allowance === BigInt(0)) console.log("- No USDC allowance");
            if (!currentRound.isActive) console.log("- Round not active");
        }

    } catch (error) {
        console.log("❌ Error testing bonding:", error);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}); 