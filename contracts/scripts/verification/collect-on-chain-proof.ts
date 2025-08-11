import { ethers } from "hardhat";

/**
 * Comprehensive On-Chain Proof Collection Script for FVC Protocol
 * Collects transaction hashes, event logs, and balance proofs for audit verification
 */

// Contract addresses from config
const CONTRACTS = {
  FVC: "0x271d4cF375eC80797BC6a5777D7cdF83feCD77A1",
  BONDING: "0x26725c6BDb619fbBd7b06ED221A6Fb544812656d", 
  MOCK_USDC: "0xa8E7C6D0b288f2c19FED3F7462019331cF406eF6",
  TREASURY: "0x7f1EE89fDB16b57930b7F53Bb998f25d917F35D9",
  
  // Legacy addresses for historical data
  LEGACY_FVC: "0x8Bf97817B8354b960e26662c65F9d0b3732c9057",
  LEGACY_BONDING: "0x0C81CCEB47507a1F030f13002325a6e8A99953E9",
  LEGACY_USDC: "0x11Cf72a75e284B61548B87fB5ad8B8693FCfB1fb"
};

const EXPLORER_BASE = "https://www.oklink.com/amoy";

interface TransactionProof {
  txHash: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string;
  gasUsed: string;
  status: string;
  explorerUrl: string;
}

interface EventLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  decoded?: any;
}

interface BalanceSnapshot {
  address: string;
  balance: string;
  blockNumber: number;
  timestamp: number;
  explorerUrl: string;
}

async function main() {
  console.log("🔍 FVC Protocol On-Chain Proof Collection");
  console.log("=========================================\n");

  const provider = ethers.provider;
  
  // Get contracts
  const fvc = await ethers.getContractAt("FVC", CONTRACTS.FVC);
  const bonding = await ethers.getContractAt("Bonding", CONTRACTS.BONDING);
  const mockUSDC = await ethers.getContractAt("MockUSDC", CONTRACTS.MOCK_USDC);

  // Also check legacy contracts for historical data
  let legacyFVC, legacyBonding, legacyUSDC;
  try {
    legacyFVC = await ethers.getContractAt("FVC", CONTRACTS.LEGACY_FVC);
    legacyBonding = await ethers.getContractAt("Bonding", CONTRACTS.LEGACY_BONDING);
    legacyUSDC = await ethers.getContractAt("MockUSDC", CONTRACTS.LEGACY_USDC);
  } catch (e) {
    console.log("⚠️ Legacy contracts not accessible, focusing on current deployment");
  }

  console.log("📋 Contract Addresses:");
  console.log(`FVC Token: ${CONTRACTS.FVC}`);
  console.log(`Bonding: ${CONTRACTS.BONDING}`);
  console.log(`MockUSDC: ${CONTRACTS.MOCK_USDC}`);
  console.log(`Treasury: ${CONTRACTS.TREASURY}\n`);

  // 1. Get current block for reference
  const currentBlock = await provider.getBlockNumber();
  const currentBlockData = await provider.getBlock(currentBlock);
  console.log(`📅 Current Block: ${currentBlock} (${new Date(currentBlockData!.timestamp * 1000).toISOString()})\n`);

  // 2. Collect Treasury Balance History
  console.log("💰 TREASURY BALANCE VERIFICATION");
  console.log("================================");
  
  const currentTreasuryBalance = await mockUSDC.balanceOf(CONTRACTS.TREASURY);
  console.log(`Current Treasury USDC Balance: ${ethers.formatUnits(currentTreasuryBalance, 6)} USDC`);
  console.log(`Explorer: ${EXPLORER_BASE}/address/${CONTRACTS.TREASURY}\n`);

  // 3. Search for Bonding Transactions
  console.log("🔍 SEARCHING FOR BONDING TRANSACTIONS");
  console.log("====================================");

  const bondingTransactions = await findBondingTransactions(provider, CONTRACTS.BONDING, currentBlock);
  
  if (bondingTransactions.length === 0) {
    console.log("❌ No bonding transactions found in recent blocks");
    console.log("💡 Consider running a test bonding transaction first\n");
  } else {
    console.log(`✅ Found ${bondingTransactions.length} bonding transaction(s)\n`);
  }

  // 4. Analyze Transfer Events
  console.log("📝 ERC-20 TRANSFER EVENT ANALYSIS");
  console.log("=================================");

  // USDC transfers TO treasury
  const usdcToTreasuryEvents = await findUSDCTransfersToTreasury(
    provider, 
    CONTRACTS.MOCK_USDC, 
    CONTRACTS.TREASURY,
    currentBlock - 10000, // Look back 10k blocks
    currentBlock
  );

  // FVC mint events (transfers from zero address)
  const fvcMintEvents = await findFVCMintEvents(
    provider,
    CONTRACTS.FVC,
    currentBlock - 10000,
    currentBlock
  );

  console.log(`USDC → Treasury transfers: ${usdcToTreasuryEvents.length}`);
  console.log(`FVC mint events: ${fvcMintEvents.length}\n`);

  // 5. Generate Detailed Report
  console.log("📊 DETAILED TRANSACTION ANALYSIS");
  console.log("================================");

  for (const tx of bondingTransactions) {
    await analyzeBondingTransaction(provider, tx.txHash, mockUSDC, fvc);
  }

  // 6. Balance Snapshots for Each Transaction
  console.log("📸 BALANCE SNAPSHOTS");
  console.log("===================");

  for (const event of usdcToTreasuryEvents) {
    await generateBalanceSnapshot(provider, mockUSDC, CONTRACTS.TREASURY, event.blockNumber);
  }

  // 7. Generate Public Verification URLs
  console.log("🔗 PUBLIC VERIFICATION URLS");
  console.log("===========================");
  
  console.log("Treasury Address:");
  console.log(`${EXPLORER_BASE}/address/${CONTRACTS.TREASURY}`);
  console.log(`https://safe.global/app/amoy:${CONTRACTS.TREASURY}`);
  
  console.log("\nContract Addresses:");
  console.log(`FVC: ${EXPLORER_BASE}/address/${CONTRACTS.FVC}`);
  console.log(`Bonding: ${EXPLORER_BASE}/address/${CONTRACTS.BONDING}`);
  console.log(`MockUSDC: ${EXPLORER_BASE}/address/${CONTRACTS.MOCK_USDC}`);

  for (const tx of bondingTransactions) {
    console.log(`\nTransaction: ${EXPLORER_BASE}/tx/${tx.txHash}`);
  }

  // 8. Summary Statistics
  console.log("\n📈 SUMMARY STATISTICS");
  console.log("====================");
  
  const totalUSDCTransferred = usdcToTreasuryEvents.reduce((sum, event) => {
    return sum + BigInt(event.data);
  }, BigInt(0));
  
  const totalFVCMinted = fvcMintEvents.reduce((sum, event) => {
    return sum + BigInt(event.data);
  }, BigInt(0));

  console.log(`Total USDC transferred to treasury: ${ethers.formatUnits(totalUSDCTransferred, 6)} USDC`);
  console.log(`Total FVC minted: ${ethers.formatUnits(totalFVCMinted, 18)} FVC`);
  console.log(`Current treasury balance: ${ethers.formatUnits(currentTreasuryBalance, 6)} USDC`);
  
  const balanceMatchesTransfers = currentTreasuryBalance === totalUSDCTransferred;
  console.log(`Balance verification: ${balanceMatchesTransfers ? '✅ MATCHES' : '⚠️ DISCREPANCY'}`);

  console.log("\n🎯 AUDIT EVIDENCE COLLECTION COMPLETE");
}

async function findBondingTransactions(provider: any, bondingAddress: string, currentBlock: number): Promise<TransactionProof[]> {
  const transactions: TransactionProof[] = [];
  
  // Look back 1000 blocks for transactions to the bonding contract
  const fromBlock = Math.max(0, currentBlock - 1000);
  
  console.log(`Searching blocks ${fromBlock} to ${currentBlock} for bonding transactions...`);
  
  try {
    // Get all transactions to the bonding contract
    for (let block = currentBlock; block >= fromBlock; block -= 100) {
      const blockData = await provider.getBlock(block, true);
      if (!blockData || !blockData.transactions) continue;
      
      for (const tx of blockData.transactions) {
        if (tx.to && tx.to.toLowerCase() === bondingAddress.toLowerCase()) {
          const receipt = await provider.getTransactionReceipt(tx.hash);
          
          transactions.push({
            txHash: tx.hash,
            blockNumber: block,
            timestamp: blockData.timestamp,
            from: tx.from,
            to: tx.to,
            gasUsed: receipt.gasUsed.toString(),
            status: receipt.status === 1 ? "Success" : "Failed",
            explorerUrl: `${EXPLORER_BASE}/tx/${tx.hash}`
          });
          
          console.log(`Found bonding transaction: ${tx.hash}`);
        }
      }
    }
  } catch (error) {
    console.log("⚠️ Error searching for transactions:", error);
  }
  
  return transactions;
}

async function findUSDCTransfersToTreasury(
  provider: any, 
  usdcAddress: string, 
  treasuryAddress: string,
  fromBlock: number,
  toBlock: number
): Promise<EventLog[]> {
  
  // ERC20 Transfer event signature: Transfer(address indexed from, address indexed to, uint256 value)
  const transferEventSignature = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
  
  const filter = {
    address: usdcAddress,
    topics: [
      transferEventSignature,
      null, // from (any address)
      ethers.zeroPadValue(treasuryAddress, 32) // to (treasury)
    ],
    fromBlock,
    toBlock
  };
  
  console.log("Searching for USDC transfers to treasury...");
  const logs = await provider.getLogs(filter);
  
  return logs.map((log: any) => ({
    address: log.address,
    topics: log.topics,
    data: log.data,
    blockNumber: log.blockNumber,
    transactionHash: log.transactionHash,
    logIndex: log.logIndex,
    decoded: {
      from: ethers.getAddress(ethers.dataSlice(log.topics[1], 12)),
      to: ethers.getAddress(ethers.dataSlice(log.topics[2], 12)),
      value: ethers.getBigInt(log.data)
    }
  }));
}

async function findFVCMintEvents(
  provider: any,
  fvcAddress: string,
  fromBlock: number,
  toBlock: number
): Promise<EventLog[]> {
  
  const transferEventSignature = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  
  const filter = {
    address: fvcAddress,
    topics: [
      transferEventSignature,
      ethers.zeroPadValue(zeroAddress, 32), // from (zero address = mint)
      null // to (any address)
    ],
    fromBlock,
    toBlock
  };
  
  console.log("Searching for FVC mint events...");
  const logs = await provider.getLogs(filter);
  
  return logs.map((log: any) => ({
    address: log.address,
    topics: log.topics,
    data: log.data,
    blockNumber: log.blockNumber,
    transactionHash: log.transactionHash,
    logIndex: log.logIndex,
    decoded: {
      from: ethers.getAddress(ethers.dataSlice(log.topics[1], 12)),
      to: ethers.getAddress(ethers.dataSlice(log.topics[2], 12)),
      value: ethers.getBigInt(log.data)
    }
  }));
}

async function analyzeBondingTransaction(
  provider: any,
  txHash: string,
  mockUSDC: any,
  fvc: any
) {
  console.log(`\n🔍 Analyzing Transaction: ${txHash}`);
  console.log(`Explorer: ${EXPLORER_BASE}/tx/${txHash}`);
  
  const tx = await provider.getTransaction(txHash);
  const receipt = await provider.getTransactionReceipt(txHash);
  const block = await provider.getBlock(tx.blockNumber);
  
  console.log(`Block: ${tx.blockNumber}`);
  console.log(`Timestamp: ${new Date(block.timestamp * 1000).toISOString()}`);
  console.log(`From: ${tx.from}`);
  console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
  console.log(`Status: ${receipt.status === 1 ? 'Success' : 'Failed'}`);
  
  // Analyze events in this transaction
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() === mockUSDC.target.toLowerCase()) {
      // USDC transfer
      try {
        const decoded = mockUSDC.interface.parseLog(log);
        if (decoded.name === 'Transfer') {
          console.log(`📤 USDC Transfer: ${ethers.formatUnits(decoded.args.value, 6)} USDC`);
          console.log(`   From: ${decoded.args.from}`);
          console.log(`   To: ${decoded.args.to}`);
        }
      } catch (e) {
        console.log("⚠️ Could not decode USDC log");
      }
    }
    
    if (log.address.toLowerCase() === fvc.target.toLowerCase()) {
      // FVC transfer/mint
      try {
        const decoded = fvc.interface.parseLog(log);
        if (decoded.name === 'Transfer') {
          console.log(`🪙 FVC ${decoded.args.from === ethers.ZeroAddress ? 'Mint' : 'Transfer'}: ${ethers.formatUnits(decoded.args.value, 18)} FVC`);
          console.log(`   From: ${decoded.args.from}`);
          console.log(`   To: ${decoded.args.to}`);
        }
      } catch (e) {
        console.log("⚠️ Could not decode FVC log");
      }
    }
  }
}

async function generateBalanceSnapshot(
  provider: any,
  mockUSDC: any,
  treasuryAddress: string,
  blockNumber: number
) {
  const balance = await mockUSDC.balanceOf(treasuryAddress, { blockTag: blockNumber });
  const block = await provider.getBlock(blockNumber);
  
  console.log(`\n📸 Treasury Balance Snapshot - Block ${blockNumber}`);
  console.log(`Timestamp: ${new Date(block.timestamp * 1000).toISOString()}`);
  console.log(`USDC Balance: ${ethers.formatUnits(balance, 6)} USDC`);
  console.log(`Explorer: ${EXPLORER_BASE}/address/${treasuryAddress}?block=${blockNumber}`);
  
  return {
    address: treasuryAddress,
    balance: ethers.formatUnits(balance, 6),
    blockNumber,
    timestamp: block.timestamp,
    explorerUrl: `${EXPLORER_BASE}/address/${treasuryAddress}?block=${blockNumber}`
  };
}

main().catch((error) => {
  console.error("❌ Error collecting on-chain proof:", error);
  process.exitCode = 1;
});
