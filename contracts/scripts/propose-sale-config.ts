import { ethers } from "hardhat";
import Safe from "@safe-global/protocol-kit";
import SafeApiKit from "@safe-global/api-kit";

async function main() {
  const [signer] = await ethers.getSigners();
  
  const SAFE_ADDRESS = "0xE20c89da2138951655DbbbE6E6db01fe561EBe82";
  const NEW_SALE = "0xdf95824ae269c62427a5925231b970aa43d709d1";
  const FVC = "0xB84eC31C6B520c3aeA6a19483EB8f88cB55A0556";
  const VESTING = "0x24263Dce127Ad06cC272897629d6688Ec54df389";
  const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
  
  const CLIFF = 365 * 24 * 60 * 60;
  const DURATION = 730 * 24 * 60 * 60;
  const ETH_USD_FALLBACK = ethers.parseUnits("2000", 6);
  
  const sale = await ethers.getContractAt("Sale", NEW_SALE);
  const fvc = await ethers.getContractAt("FVC", FVC);
  const MINTER_ROLE = await fvc.MINTER_ROLE();

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  PROPOSING SALE CONFIGURATION TO SAFE");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Signer:", signer.address);
  console.log("  Safe:  ", SAFE_ADDRESS);
  console.log("  Sale:  ", NEW_SALE);
  console.log("═══════════════════════════════════════════════════════════════\n");

  const transactions = [
    {
      to: FVC,
      value: "0",
      data: fvc.interface.encodeFunctionData("grantRole", [MINTER_ROLE, NEW_SALE]),
    },
    {
      to: NEW_SALE,
      value: "0",
      data: sale.interface.encodeFunctionData("setAcceptedToken", [USDC, true, 6]),
    },
    {
      to: NEW_SALE,
      value: "0",
      data: sale.interface.encodeFunctionData("setAcceptedToken", [USDT, true, 6]),
    },
    {
      to: NEW_SALE,
      value: "0",
      data: sale.interface.encodeFunctionData("setEthUsdRate", [ETH_USD_FALLBACK]),
    },
    {
      to: NEW_SALE,
      value: "0",
      data: sale.interface.encodeFunctionData("setVestingConfig", [VESTING, 0, CLIFF, DURATION]),
    },
    {
      to: NEW_SALE,
      value: "0",
      data: sale.interface.encodeFunctionData("setActive", [true]),
    },
  ];

  console.log("📝 Transactions to propose:");
  console.log("  1. Grant MINTER_ROLE to new Sale");
  console.log("  2. Accept USDC");
  console.log("  3. Accept USDT");
  console.log("  4. Set ETH/USD fallback ($2000)");
  console.log("  5. Set vesting config (12mo cliff, 24mo duration)");
  console.log("  6. Activate sale");
  console.log();

  console.log("🔐 Initializing Safe SDK...");
  
  // Get RPC URL from hardhat config
  const rpcUrl = process.env.ETHEREUM_MAINNET_RPC || "https://eth.llamarpc.com";
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY!;
  
  const safeSdk = await Safe.init({
    provider: rpcUrl,
    signer: privateKey,
    safeAddress: SAFE_ADDRESS,
  });

  const apiKit = new SafeApiKit({
    chainId: 1n,
    txServiceUrl: "https://safe-transaction-mainnet.safe.global",
  });

  console.log("📝 Creating batch transaction...");
  
  const safeTransaction = await safeSdk.createTransaction({
    transactions,
  });

  console.log("✍️  Signing with your key...");
  
  const signedTx = await safeSdk.signTransaction(safeTransaction);
  const safeTxHash = await safeSdk.getTransactionHash(signedTx);

  console.log("📤 Proposing to Safe...");
  
  await apiKit.proposeTransaction({
    safeAddress: SAFE_ADDRESS,
    safeTransactionData: signedTx.data,
    safeTxHash,
    senderAddress: signer.address,
    senderSignature: signedTx.encodedSignatures(),
  });

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  ✅ PROPOSED SUCCESSFULLY");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Safe Tx Hash:", safeTxHash);
  console.log();
  console.log("  👉 Send this to your colleague to approve:");
  console.log("  https://app.safe.global/transactions/queue?safe=eth:0xE20c89da2138951655DbbbE6E6db01fe561EBe82");
  console.log();
  console.log("  Once approved + executed, the new Sale will be fully configured.");
  console.log("═══════════════════════════════════════════════════════════════\n");
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
