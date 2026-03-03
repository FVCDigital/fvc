import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

const SALE_ADDRESS = "0x685866FA0841e918C3452Fe480eFD792bA912088";
const USDC_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const FVC_ADDRESS  = "0x52F7608fC35AefDa12B3b66131E9554f64e72eC9";
const AMOUNT_USDC  = ethers.parseUnits("5", 6); // 5 USDC

const SALE_ABI = [
  "function buy(address stable, uint256 amount) external",
];
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider(
    process.env.ETHEREUM_SEPOLIA_RPC || "https://ethereum-sepolia-rpc.publicnode.com"
  );
  const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider);
  console.log("Wallet:", wallet.address);

  const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, wallet);
  const sale = new ethers.Contract(SALE_ADDRESS, SALE_ABI, wallet);
  const fvc  = new ethers.Contract(FVC_ADDRESS,  ERC20_ABI, wallet);

  const usdcBefore = await usdc.balanceOf(wallet.address);
  const fvcBefore  = await fvc.balanceOf(wallet.address);
  console.log("USDC before:", ethers.formatUnits(usdcBefore, 6));
  console.log("FVC before: ", ethers.formatEther(fvcBefore));

  if (usdcBefore < AMOUNT_USDC) {
    throw new Error(`Insufficient USDC. Have ${ethers.formatUnits(usdcBefore, 6)}, need 5`);
  }

  console.log("\nApproving 5 USDC...");
  const approveTx = await usdc.approve(SALE_ADDRESS, AMOUNT_USDC);
  await approveTx.wait();
  console.log("Approved:", approveTx.hash);

  console.log("Buying 5 USDC worth of FVC...");
  const buyTx = await sale.buy(USDC_ADDRESS, AMOUNT_USDC);
  await buyTx.wait();
  console.log("Bought:", buyTx.hash);

  const usdcAfter = await usdc.balanceOf(wallet.address);
  const fvcAfter  = await fvc.balanceOf(wallet.address);
  console.log("\nUSDC after:", ethers.formatUnits(usdcAfter, 6));
  console.log("FVC after: ", ethers.formatEther(fvcAfter));
  console.log("FVC received:", ethers.formatEther(fvcAfter - fvcBefore));
}

main().catch(console.error);
