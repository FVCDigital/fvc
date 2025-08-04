import { ethers } from "hardhat";

async function main() {
    const [deployer, user1, user2] = await ethers.getSigners();
    
    console.log("🧪 Testing FVC Bonding Flow...");
    console.log("Deployer:", deployer.address);
    console.log("User 1:", user1.address);
    console.log("User 2:", user2.address);

    // Get deployed contracts
    const bondingAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
    const fvcAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

    const Bonding = await ethers.getContractFactory("Bonding");
    const bonding = Bonding.attach(bondingAddress) as any;

    const FVC = await ethers.getContractFactory("FVC");
    const fvc = FVC.attach(fvcAddress) as any;

    // Mock USDC for testing
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUsdc = MockUSDC.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3") as any;

    console.log("\n📊 Initial State:");
    console.log("Current Round:", await bonding.getCurrentRound());
    console.log("Current Discount:", await bonding.getCurrentDiscount());
    console.log("Total Bonded:", ethers.formatEther(await bonding.totalBonded()));

    // Give users some mock USDC
    console.log("\n💰 Funding users with mock USDC...");
    await mockUsdc.mint(user1.address, ethers.parseUnits("1000", 6));
    await mockUsdc.mint(user2.address, ethers.parseUnits("1000", 6));
    console.log("User 1 USDC:", ethers.formatUnits(await mockUsdc.balanceOf(user1.address), 6));
    console.log("User 2 USDC:", ethers.formatUnits(await mockUsdc.balanceOf(user2.address), 6));

    // Test bonding flow
    console.log("\n🔗 Testing bonding flow...");
    
    // User 1 bonds 100 USDC
    const bondAmount1 = ethers.parseUnits("100", 6);
    console.log("User 1 bonding 100 USDC...");
    
    await mockUsdc.connect(user1).approve(bondingAddress, bondAmount1);
    await bonding.connect(user1).bond(bondAmount1);
    
    console.log("✅ User 1 bonding successful!");
    console.log("User 1 FVC balance:", ethers.formatEther(await fvc.balanceOf(user1.address)));
    console.log("Current discount:", await bonding.getCurrentDiscount());
    console.log("Total bonded:", ethers.formatEther(await bonding.totalBonded()));

    // User 2 bonds 50 USDC
    const bondAmount2 = ethers.parseUnits("50", 6);
    console.log("\nUser 2 bonding 50 USDC...");
    
    await mockUsdc.connect(user2).approve(bondingAddress, bondAmount2);
    await bonding.connect(user2).bond(bondAmount2);
    
    console.log("✅ User 2 bonding successful!");
    console.log("User 2 FVC balance:", ethers.formatEther(await fvc.balanceOf(user2.address)));
    console.log("Current discount:", await bonding.getCurrentDiscount());
    console.log("Total bonded:", ethers.formatEther(await bonding.totalBonded()));

    // Check vesting schedules
    console.log("\n📅 Checking vesting schedules...");
    const vesting1 = await bonding.getVestingSchedule(user1.address);
    const vesting2 = await bonding.getVestingSchedule(user2.address);
    
    console.log("User 1 vesting:", {
        amount: ethers.formatEther(vesting1.amount),
        startTime: new Date(Number(vesting1.startTime) * 1000).toISOString(),
        endTime: new Date(Number(vesting1.endTime) * 1000).toISOString()
    });
    
    console.log("User 2 vesting:", {
        amount: ethers.formatEther(vesting2.amount),
        startTime: new Date(Number(vesting2.startTime) * 1000).toISOString(),
        endTime: new Date(Number(vesting2.endTime) * 1000).toISOString()
    });

    // Check if users are locked
    console.log("\n🔒 Checking lock status...");
    console.log("User 1 locked:", await bonding.isLocked(user1.address));
    console.log("User 2 locked:", await bonding.isLocked(user2.address));

    console.log("\n🎉 Bonding flow test completed successfully!");
    console.log("✅ FVC Protocol is ready for launch!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}); 