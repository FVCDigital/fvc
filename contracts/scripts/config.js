const { ethers } = require("hardhat");

// ============ NETWORK CONFIGURATION ============
const NETWORKS = {
  AMOY: {
    name: "amoy",
    rpc: process.env.AMOY_RPC_URL,
    explorer: "https://www.oklink.com/amoy/address/",
    safeUrl: "https://safe.global/app/amoy:"
  },
  POLYGON: {
    name: "polygon",
    rpc: process.env.POLYGON_RPC_URL,
    explorer: "https://polygonscan.com/address/",
    safeUrl: "https://safe.global/app/polygon:"
  },
  ETHEREUM: {
    name: "ethereum",
    rpc: process.env.ETHEREUM_RPC_URL,
    explorer: "https://etherscan.io/address/",
    safeUrl: "https://safe.global/app/eth:"
  }
};

// ============ CONTRACT ADDRESSES ============
const CONTRACT_ADDRESSES = {
  // Latest deployed contracts (update these after new deployments)
  FVC: "0x271d4cF375eC80797BC6a5777D7cdF83feCD77A1",
  USDC: "0xa8E7C6D0b288f2c19FED3F7462019331cF406eF6",
  BONDING: "0x26725c6BDb619fbBd7b06ED221A6Fb544812656d",
  
  // Treasury addresses
  SAFE: "0x7f1EE89fDB16b57930b7F53Bb998f25d917F35D9",
  
  // Legacy addresses (for reference)
  LEGACY: {
    FVC: "0x8Bf97817B8354b960e26662c65F9d0b3732c9057",
    USDC: "0x11Cf72a75e284B61548B87fB5ad8B8693FCfB1fb",
    BONDING: "0x0C81CCEB47507a1F030f13002325a6e8A99953E9"
  }
};

// ============ BONDING CONFIGURATION ============
const BONDING_CONFIG = {
  // Discount settings
  INITIAL_DISCOUNT: 20,
  FINAL_DISCOUNT: 10,
  
  // Cap settings
  EPOCH_CAP: ethers.parseUnits("10000000", 6), // 10M USDC
  WALLET_CAP: ethers.parseUnits("1000000", 6),  // 1M USDC per wallet
  
  // Time settings
  VESTING_PERIOD: 90 * 24 * 60 * 60, // 90 days
  
  // Token amounts
  INITIAL_FVC: ethers.parseUnits("10000000", 18), // 10M FVC
  INITIAL_USDC: ethers.parseUnits("10000000", 6),  // 10M USDC
  FVC_TO_ALLOCATE: ethers.parseUnits("10000000", 18), // 10M FVC for bonding
};

// ============ UTILITY FUNCTIONS ============
async function getSigners() {
  const signers = await ethers.getSigners();
  return {
    admin: signers[0],
    user: signers[1] || signers[0]
  };
}

async function loadContracts() {
  const FVC = await ethers.getContractFactory("FVC");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const Bonding = await ethers.getContractFactory("Bonding");
  
  return {
    FVC,
    MockUSDC,
    Bonding
  };
}

async function loadDeployedContracts() {
  const { FVC, MockUSDC, Bonding } = await loadContracts();
  
  const fvc = FVC.attach(CONTRACT_ADDRESSES.FVC);
  const usdc = MockUSDC.attach(CONTRACT_ADDRESSES.USDC);
  const bonding = Bonding.attach(CONTRACT_ADDRESSES.BONDING);
  
  return { fvc, usdc, bonding };
}

async function logContractAddresses(fvc, usdc, bonding) {
  console.log("📋 Contract Addresses:");
  console.log("FVC Token:", fvc ? await fvc.getAddress() : CONTRACT_ADDRESSES.FVC);
  console.log("Mock USDC:", usdc ? await usdc.getAddress() : CONTRACT_ADDRESSES.USDC);
  console.log("Bonding Contract:", bonding ? await bonding.getAddress() : CONTRACT_ADDRESSES.BONDING);
  console.log("Treasury (Safe):", CONTRACT_ADDRESSES.SAFE);
}

function logBondingConfig() {
  console.log("\n📊 Bonding Configuration:");
  console.log("Initial Discount:", BONDING_CONFIG.INITIAL_DISCOUNT + "%");
  console.log("Final Discount:", BONDING_CONFIG.FINAL_DISCOUNT + "%");
  console.log("Epoch Cap:", ethers.formatUnits(BONDING_CONFIG.EPOCH_CAP, 6), "USDC");
  console.log("Wallet Cap:", ethers.formatUnits(BONDING_CONFIG.WALLET_CAP, 6), "USDC");
  console.log("Vesting Period:", BONDING_CONFIG.VESTING_PERIOD / (24 * 60 * 60), "days");
}

function logSafeLinks() {
  console.log("\n🔗 Safe URL:", NETWORKS.AMOY.safeUrl + CONTRACT_ADDRESSES.SAFE);
  console.log("🔍 Explorer:", NETWORKS.AMOY.explorer + CONTRACT_ADDRESSES.SAFE);
}

// ============ DEPLOYMENT HELPERS ============
async function deployFVC(admin) {
  console.log("\n🔧 Deploying FVC token...");
  const FVC = await ethers.getContractFactory("FVC");
  const fvc = await FVC.deploy("First Venture Capital", "FVC", admin.address);
  await fvc.waitForDeployment();
  console.log("✅ FVC deployed to:", await fvc.getAddress());
  return fvc;
}

async function deployMockUSDC() {
  console.log("\n🔧 Deploying Mock USDC...");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  console.log("✅ Mock USDC deployed to:", await usdc.getAddress());
  return usdc;
}

async function deployBonding(fvc, usdc) {
  console.log("\n🔧 Deploying Bonding contract...");
  const Bonding = await ethers.getContractFactory("Bonding");
  
  const bonding = await Bonding.deploy(
    await fvc.getAddress(),
    await usdc.getAddress(),
    CONTRACT_ADDRESSES.SAFE,
    BONDING_CONFIG.INITIAL_DISCOUNT,
    BONDING_CONFIG.FINAL_DISCOUNT,
    BONDING_CONFIG.EPOCH_CAP,
    BONDING_CONFIG.WALLET_CAP,
    BONDING_CONFIG.VESTING_PERIOD
  );
  await bonding.waitForDeployment();
  console.log("✅ Bonding deployed to:", await bonding.getAddress());
  return bonding;
}

async function setupContracts(fvc, bonding, adminAddress) {
  console.log("\n🔧 Setting up contracts...");
  
  // Set bonding contract in FVC token
  await fvc.setBondingContract(await bonding.getAddress());
  console.log("✅ Bonding contract set in FVC token");
  
  // Mint initial tokens
  await fvc.mint(adminAddress, BONDING_CONFIG.INITIAL_FVC);
  console.log("✅ 10M FVC minted to admin");
  
  return { fvc, bonding };
}

// ============ TESTING HELPERS ============
async function checkRoundState(bonding) {
  console.log("\n🔍 Current Round State:");
  const round = await bonding.getCurrentRound();
  console.log("Round ID:", round.roundId.toString());
  console.log("Round active:", round.isActive);
  console.log("FVC Allocated:", ethers.formatUnits(round.fvcAllocated, 18), "FVC");
  console.log("FVC Sold:", ethers.formatUnits(round.fvcSold, 18), "FVC");
  console.log("FVC Remaining:", ethers.formatUnits(await bonding.getRemainingFVC(), 18), "FVC");
  return round;
}

async function allocateFVC(fvc, bonding, amount = BONDING_CONFIG.FVC_TO_ALLOCATE) {
  console.log("\n💰 Allocating FVC to bonding contract...");
  
  // Approve FVC transfer
  await fvc.approve(await bonding.getAddress(), amount);
  console.log("✅ FVC approved");
  
  // Allocate FVC
  await bonding.allocateFVC(amount);
  console.log("✅ FVC allocated successfully");
  
  return await checkRoundState(bonding);
}

module.exports = {
  NETWORKS,
  CONTRACT_ADDRESSES,
  BONDING_CONFIG,
  getSigners,
  loadContracts,
  loadDeployedContracts,
  logContractAddresses,
  logBondingConfig,
  logSafeLinks,
  deployFVC,
  deployMockUSDC,
  deployBonding,
  setupContracts,
  checkRoundState,
  allocateFVC
}; 