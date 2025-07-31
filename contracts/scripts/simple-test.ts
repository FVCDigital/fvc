import { ethers } from "hardhat";

async function main() {
    const [deployer, user1] = await ethers.getSigners();
    
    console.log("🧪 Simple FVC Bonding Test...");
    console.log("Deployer:", deployer.address);
    console.log("User 1:", user1.address);

    // Get deployed contracts
    const bondingAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
    const fvcAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
    const mockUsdcAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

    const Bonding = await ethers.getContractFactory("Bonding");
    const bonding = Bonding.attach(bondingAddress) as any;

    const FVC = await ethers.getContractFactory("FVC");
    const fvc = FVC.attach(fvcAddress) as any;

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUsdc = MockUSDC.attach(mockUsdcAddress) as any;

    console.log("\n📊 Checking contract addresses...");
    console.log("Bonding:", bondingAddress);
    console.log("FVC:", fvcAddress);
    console.log("Mock USDC:", mockUsdcAddress);

    // Check if contracts exist
    console.log("\n🔍 Checking contract deployment...");
    const bondingCode = await ethers.provider.getCode(bondingAddress);
    const fvcCode = await ethers.provider.getCode(fvcAddress);
    const usdcCode = await ethers.provider.getCode(mockUsdcAddress);
    
    console.log("Bonding deployed:", bondingCode !== "0x");
    console.log("FVC deployed:", fvcCode !== "0x");
    console.log("Mock USDC deployed:", usdcCode !== "0x");

    // Check basic bonding info
    console.log("\n📈 Checking bonding info...");
    try {
        const totalBonded = await bonding.totalBonded();
        console.log("Total bonded:", ethers.formatEther(totalBonded));
        
        const currentDiscount = await bonding.getCurrentDiscount();
        console.log("Current discount:", currentDiscount.toString());
        
        console.log("✅ Bonding contract is working!");
    } catch (error) {
        console.log("❌ Bonding contract error:", error.message);
    }

    // Check FVC token
    console.log("\n🪙 Checking FVC token...");
    try {
        const name = await fvc.name();
        const symbol = await fvc.symbol();
        const totalSupply = await fvc.totalSupply();
        
        console.log("Name:", name);
        console.log("Symbol:", symbol);
        console.log("Total Supply:", ethers.formatEther(totalSupply));
        
        console.log("✅ FVC token is working!");
    } catch (error) {
        console.log("❌ FVC token error:", error.message);
    }

    // Check Mock USDC
    console.log("\n💵 Checking Mock USDC...");
    try {
        const name = await mockUsdc.name();
        const symbol = await mockUsdc.symbol();
        const balance = await mockUsdc.balanceOf(deployer.address);
        
        console.log("Name:", name);
        console.log("Symbol:", symbol);
        console.log("Deployer balance:", ethers.formatUnits(balance, 6));
        
        console.log("✅ Mock USDC is working!");
    } catch (error) {
        console.log("❌ Mock USDC error:", error.message);
    }

    console.log("\n🎉 Simple test completed!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}); 