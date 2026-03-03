/**
 * Redeploys only the Vesting contract on Sepolia and rewires it to the existing Sale.
 * Use when Vesting.sol code has changed but FVC and Sale are unchanged.
 *
 * Run: npx ts-node contracts/scripts/redeploy-vesting-sepolia.ts
 *
 * After this script completes, execute ONE Safe transaction:
 *   sale.setVestingConfig(newVestingAddress, 0, cliff, duration)
 *   See output for exact calldata.
 */
import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
dotenv.config();

const FVC_ADDRESS  = "0x52F7608fC35AefDa12B3b66131E9554f64e72eC9";
const SALE_ADDRESS = "0x685866FA0841e918C3452Fe480eFD792bA912088";

const CLIFF    = 180 * 24 * 60 * 60; // 180 days (Sepolia test config)
const DURATION = 730 * 24 * 60 * 60; // 730 days

async function main() {
  const provider = new ethers.JsonRpcProvider(
    process.env.ETHEREUM_SEPOLIA_RPC || "https://ethereum-sepolia-rpc.publicnode.com"
  );
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider);
  console.log("Deployer:", wallet.address);
  console.log("Balance: ", ethers.formatEther(await provider.getBalance(wallet.address)), "ETH\n");

  // Load Vesting artifact
  const artifactPath = path.join(__dirname, "../artifacts/src/vesting/Vesting.sol/Vesting.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

  console.log("Deploying new Vesting contract...");
  const vesting = await factory.deploy(FVC_ADDRESS);
  await vesting.waitForDeployment();
  const vestingAddress = await vesting.getAddress();
  console.log("New Vesting:", vestingAddress);

  console.log("\nTransferring Vesting ownership to Sale...");
  const vestingWithAbi = new ethers.Contract(
    vestingAddress,
    ["function transferOwnership(address newOwner) external"],
    wallet
  );
  const tx = await vestingWithAbi.transferOwnership(SALE_ADDRESS);
  await tx.wait();
  console.log("Done — vesting.owner() =", SALE_ADDRESS);

  // Update deployments-sepolia.json
  const deploymentsPath = path.join(__dirname, "../deployments-sepolia.json");
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  const oldVesting = deployments.vesting;
  deployments.vesting = vestingAddress;
  deployments.deployedAt = new Date().toISOString();
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log("\ndeployments-sepolia.json updated");
  console.log("  old vesting:", oldVesting);
  console.log("  new vesting:", vestingAddress);

  // Generate Safe calldata for setVestingConfig
  const saleAbi = ["function setVestingConfig(address,uint256,uint256,uint256) external"];
  const iface = new ethers.Interface(saleAbi);
  const calldata = iface.encodeFunctionData("setVestingConfig", [
    vestingAddress,
    0,        // threshold = 0 (all purchases vested)
    CLIFF,
    DURATION,
  ]);

  console.log("\n================================================================");
  console.log("GNOSIS SAFE ACTION REQUIRED");
  console.log("================================================================");
  console.log("Execute this transaction from your Safe to rewire Sale → new Vesting:");
  console.log("\nTo:      ", SALE_ADDRESS);
  console.log("Value:    0");
  console.log("Calldata:", calldata);
  console.log("\nOr use Transaction Builder with:");
  console.log('ABI: [{"inputs":[{"name":"_vestingContract","type":"address"},{"name":"_threshold","type":"uint256"},{"name":"_cliff","type":"uint256"},{"name":"_duration","type":"uint256"}],"name":"setVestingConfig","outputs":[],"stateMutability":"nonpayable","type":"function"}]');
  console.log("Parameters:");
  console.log("  _vestingContract:", vestingAddress);
  console.log("  _threshold:       0");
  console.log("  _cliff:          ", CLIFF, "(180 days)");
  console.log("  _duration:       ", DURATION, "(730 days)");
  console.log("================================================================\n");
}

main().catch(console.error);
