import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Deploy FVC, Sale, and Vesting to Sepolia
 *
 * Prerequisites:
 *   1. Add DEPLOYER_PRIVATE_KEY to contracts/.env
 *   2. Add ETHEREUM_SEPOLIA_RPC to contracts/.env
 *   3. Add TREASURY_ADDRESS to contracts/.env (Gnosis Safe on Sepolia)
 *   4. Deployer wallet needs ~0.05 Sepolia ETH for gas
 *
 * Run:
 *   npx hardhat run scripts/deploy-sepolia.ts --network sepolia
 *
 * Get Sepolia ETH:
 *   https://sepoliafaucet.com
 *   https://www.alchemy.com/faucets/ethereum-sepolia
 */

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("===================================================================");
  console.log("FVC SEPOLIA DEPLOYMENT");
  console.log("===================================================================");
  console.log("Network:  ", network.name);
  console.log("Chain ID: ", network.chainId);
  console.log("Deployer: ", deployer.address);
  console.log("Balance:  ", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log();

  const TREASURY = process.env.TREASURY_ADDRESS || deployer.address;
  const INITIAL_RATE = 50_000; // $0.05 per FVC (6 decimals)
  const INITIAL_CAP = ethers.parseUnits("10000000", 6); // $10M cap
  const ETH_USD_FALLBACK = ethers.parseUnits("2500", 6); // manual fallback $2,500

  // Circle's official Sepolia USDC
  const usdcAddress = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

  // Chainlink ETH/USD on Sepolia
  const CHAINLINK_ETH_USD_SEPOLIA = "0x694AA1769357215DE4FAC081bf1f309aDC325306";

  console.log("CONFIGURATION");
  console.log("-------------------------------------------------------------------");
  console.log("Treasury:       ", TREASURY);
  console.log("FVC Price:       $0.05 (rate = 50000)");
  console.log("Cap:             $10,000,000");
  console.log("Chainlink Feed:  ", CHAINLINK_ETH_USD_SEPOLIA);
  console.log("ETH/USD Fallback: $2,500");
  console.log("USDC (Sepolia):  ", usdcAddress);
  console.log();

  // Deploy FVC
  console.log("Deploying FVC Token...");
  const FVC = await ethers.getContractFactory("FVC");
  const fvc = await FVC.deploy(deployer.address);
  await fvc.waitForDeployment();
  const fvcAddress = await fvc.getAddress();
  console.log("FVC:", fvcAddress);
  console.log();

  // Deploy Vesting
  console.log("Deploying Vesting...");
  const Vesting = await ethers.getContractFactory("Vesting");
  const vesting = await Vesting.deploy(fvcAddress);
  await vesting.waitForDeployment();
  const vestingAddress = await vesting.getAddress();
  console.log("Vesting:", vestingAddress);
  console.log();

  // Deploy Sale
  console.log("Deploying Sale...");
  const Sale = await ethers.getContractFactory("Sale");
  const sale = await Sale.deploy(fvcAddress, TREASURY, INITIAL_RATE, INITIAL_CAP, CHAINLINK_ETH_USD_SEPOLIA);
  await sale.waitForDeployment();
  const saleAddress = await sale.getAddress();
  console.log("Sale:", saleAddress);
  console.log();

  // Configure
  console.log("CONFIGURING CONTRACTS");
  console.log("-------------------------------------------------------------------");

  // Grant MINTER_ROLE to Sale
  console.log("1. Granting MINTER_ROLE to Sale...");
  const MINTER_ROLE = await fvc.MINTER_ROLE();
  await (await fvc.grantRole(MINTER_ROLE, saleAddress)).wait();
  console.log("   Done");

  // Grant MINTER_ROLE to Vesting
  console.log("2. Granting MINTER_ROLE to Vesting...");
  await (await fvc.grantRole(MINTER_ROLE, vestingAddress)).wait();
  console.log("   Done");

  // Accept Sepolia USDC
  console.log("3. Accepting Sepolia USDC...");
  await (await sale.setAcceptedToken(usdcAddress, true, 6)).wait();
  console.log("   Done");

  // Set manual ETH/USD fallback rate (used if Chainlink is stale)
  console.log("4. Setting ETH/USD fallback rate ($2,500)...");
  await (await sale.setEthUsdRate(ETH_USD_FALLBACK)).wait();
  console.log("   Done");

  // Configure vesting (>= $50k)
  console.log("5. Configuring vesting (>= $50k, 180d cliff, 730d duration)...");
  const VESTING_THRESHOLD = ethers.parseUnits("50000", 6);
  const CLIFF = 180 * 24 * 60 * 60;
  const DURATION = 730 * 24 * 60 * 60;
  await (await sale.setVestingConfig(vestingAddress, VESTING_THRESHOLD, CLIFF, DURATION)).wait();
  console.log("   Done");

  // Transfer Vesting ownership to Sale (so Sale can create schedules)
  console.log("6. Transferring Vesting ownership to Sale...");
  await (await vesting.transferOwnership(saleAddress)).wait();
  console.log("   Done");

  // Activate sale
  console.log("7. Activating sale...");
  await (await sale.setActive(true)).wait();
  console.log("   Done");

  // Transfer Sale ownership to Treasury
  console.log("8. Transferring Sale ownership to Treasury...");
  await (await sale.transferOwnership(TREASURY)).wait();
  console.log("   Done");
  console.log();

  // Summary
  console.log("===================================================================");
  console.log("DEPLOYMENT COMPLETE");
  console.log("===================================================================");
  console.log("FVC Token:       ", fvcAddress);
  console.log("Sale Contract:   ", saleAddress);
  console.log("Vesting:         ", vestingAddress);
  console.log("USDC (Sepolia):  ", usdcAddress);
  console.log("Treasury/Owner:  ", TREASURY);
  console.log("Rate:             $0.05 per FVC");
  console.log("Chainlink Feed:  ", CHAINLINK_ETH_USD_SEPOLIA);
  console.log("ETH/USD Fallback:  $2,500");
  console.log("Cap:              $10,000,000");
  console.log("===================================================================");
  console.log();
  console.log("Add FVC to MetaMask: Custom Token > paste", fvcAddress);
  console.log();

  // Save addresses
  const addresses = {
    network: "sepolia",
    chainId: Number(network.chainId),
    deployer: deployer.address,
    treasury: TREASURY,
    fvc: fvcAddress,
    sale: saleAddress,
    vesting: vestingAddress,
    usdc: usdcAddress,
    rate: "0.05",
    chainlinkFeed: CHAINLINK_ETH_USD_SEPOLIA,
    ethUsdFallback: "2500",
    cap: "10000000",
    vestingThreshold: "50000",
    cliffDays: 180,
    vestingDays: 730,
    deployedAt: new Date().toISOString(),
  };

  const outputPath = path.join(__dirname, "..", "deployments-sepolia.json");
  fs.writeFileSync(outputPath, JSON.stringify(addresses, null, 2));
  console.log("Addresses saved to:", outputPath);
  console.log();

  // Print .env block for cPanel
  console.log("===================================================================");
  console.log("CPANEL .ENV VALUES (paste into server .env)");
  console.log("===================================================================");
  console.log(`ETH_CHAIN_ID=11155111`);
  console.log(`ETH_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com`);
  console.log(`ETH_FVC_ADDRESS=${fvcAddress}`);
  console.log(`ETH_SALE_ADDRESS=${saleAddress}`);
  console.log(`ETH_VESTING_ADDRESS=${vestingAddress}`);
  console.log(`ETH_USDC_ADDRESS=${usdcAddress}`);
  console.log("===================================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
