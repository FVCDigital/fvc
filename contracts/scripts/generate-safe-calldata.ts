import { ethers } from "hardhat";

async function main() {
  const NEW_SALE = "0xdf95824ae269c62427a5925231b970aa43d709d1";
  const FVC = "0xB84eC31C6B520c3aeA6a19483EB8f88cB55A0556";
  const VESTING = "0x24263Dce127Ad06cC272897629d6688Ec54df389";
  const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
  
  const CLIFF = 365 * 24 * 60 * 60;  // 12 months
  const DURATION = 730 * 24 * 60 * 60;  // 24 months
  const ETH_USD_FALLBACK = ethers.parseUnits("2000", 6);
  
  const sale = await ethers.getContractAt("Sale", NEW_SALE);
  const fvc = await ethers.getContractAt("FVC", FVC);
  
  const MINTER_ROLE = await fvc.MINTER_ROLE();
  
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  SAFE TRANSACTION BUILDER - CONFIGURE NEW SALE");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Execute these transactions via Safe Transaction Builder");
  console.log("  https://app.safe.global/apps/open?safe=eth:0xE20c89da2138951655DbbbE6E6db01fe561EBe82&appUrl=https%3A%2F%2Fapps-portal.safe.global%2Ftx-builder");
  console.log("═══════════════════════════════════════════════════════════════\n");

  console.log("TX 1: Grant MINTER_ROLE to new Sale");
  console.log("  To:", FVC);
  console.log("  Value: 0");
  console.log("  Data:", fvc.interface.encodeFunctionData("grantRole", [MINTER_ROLE, NEW_SALE]));
  console.log();

  console.log("TX 2: Accept USDC");
  console.log("  To:", NEW_SALE);
  console.log("  Value: 0");
  console.log("  Data:", sale.interface.encodeFunctionData("setAcceptedToken", [USDC, true, 6]));
  console.log();

  console.log("TX 3: Accept USDT");
  console.log("  To:", NEW_SALE);
  console.log("  Value: 0");
  console.log("  Data:", sale.interface.encodeFunctionData("setAcceptedToken", [USDT, true, 6]));
  console.log();

  console.log("TX 4: Set ETH/USD fallback rate");
  console.log("  To:", NEW_SALE);
  console.log("  Value: 0");
  console.log("  Data:", sale.interface.encodeFunctionData("setEthUsdRate", [ETH_USD_FALLBACK]));
  console.log();

  console.log("TX 5: Set vesting config");
  console.log("  To:", NEW_SALE);
  console.log("  Value: 0");
  console.log("  Data:", sale.interface.encodeFunctionData("setVestingConfig", [VESTING, 0, CLIFF, DURATION]));
  console.log();

  console.log("TX 6: Activate sale");
  console.log("  To:", NEW_SALE);
  console.log("  Value: 0");
  console.log("  Data:", sale.interface.encodeFunctionData("setActive", [true]));
  console.log();

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  SUMMARY");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  New Sale:  ", NEW_SALE);
  console.log("  FVC:       ", FVC);
  console.log("  Vesting:   ", VESTING);
  console.log("  Rate:       $0.03/FVC");
  console.log("  Cliff:      12 months");
  console.log("  Duration:   24 months");
  console.log("═══════════════════════════════════════════════════════════════\n");
}

main().catch(console.error);
