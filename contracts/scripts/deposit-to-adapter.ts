import { ethers } from "hardhat";

async function main() {
  const TREASURY = process.env.TREASURY_ADDRESS!;
  const USDC = process.env.AAVE_USDC!;
  const AMOUNT = process.env.DEPOSIT_USDC!; // e.g. "3"
  if (!TREASURY || !USDC || !AMOUNT) throw new Error("Missing TREASURY_ADDRESS, AAVE_USDC or DEPOSIT_USDC");

  const amount = ethers.parseUnits(AMOUNT, 6);
  const usdc = await ethers.getContractAt("IERC20", USDC);
  await (await usdc.transfer(TREASURY, amount)).wait();

  const treasury = await ethers.getContractAt("Treasury", TREASURY);
  await (await treasury.depositToAdapter(USDC, amount)).wait();
  console.log(`Deposited ${AMOUNT} USDC to adapter via Treasury`);
}

main().catch((e) => { console.error(e); process.exit(1); });
