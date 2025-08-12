import { ethers } from "hardhat";

/**
 * Query Blockchain Events for Historical On-Chain Proof
 * Searches for all bonding-related events and generates verification data
 */

const CONTRACTS = {
  FVC: "0x271d4cF375eC80797BC6a5777D7cdF83feCD77A1",
  BONDING: "0x26725c6BDb619fbBd7b06ED221A6Fb544812656d", 
  MOCK_USDC: "0xa8E7C6D0b288f2c19FED3F7462019331cF406eF6",
  TREASURY: "0x7f1EE89fDB16b57930b7F53Bb998f25d917F35D9",
  
  // Legacy contracts
  LEGACY_FVC: "0x8Bf97817B8354b960e26662c65F9d0b3732c9057",
  LEGACY_BONDING: "0x0C81CCEB47507a1F030f13002325a6e8A99953E9",
  LEGACY_USDC: "0x11Cf72a75e284B61548B87fB5ad8B8693FCfB1fb"
};

const EXPLORER_BASE = "https://www.oklink.com/amoy";

// Event signatures
const TRANSFER_SIGNATURE = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const BONDED_SIGNATURE = "0x" + ethers.keccak256(ethers.toUtf8Bytes("Bonded(address,uint256)")).slice(2);

async function main() {
  console.log("🔍 Blockchain Event Query for On-Chain Proof");
  console.log("============================================\n");

  const provider = ethers.provider;
  const currentBlock = await provider.getBlockNumber();
  
  // Search the last 50,000 blocks (adjust based on needs)
  const fromBlock = Math.max(0, currentBlock - 50000);
  
  console.log(`Current Block: ${currentBlock}`);
  console.log(`Searching from block: ${fromBlock} to ${currentBlock}\n`);

  // 1. Search for USDC transfers to treasury (both current and legacy)
  console.log("💰 SEARCHING USDC TRANSFERS TO TREASURY");
  console.log("=======================================");
  
  const usdcToTreasuryEvents = await searchUSDCTransfersToTreasury(provider, fromBlock, currentBlock);
  console.log(`Found ${usdcToTreasuryEvents.length} USDC transfer(s) to treasury\n`);

  // 2. Search for FVC mint events
  console.log("🪙 SEARCHING FVC MINT EVENTS");
  console.log("============================");
  
  const fvcMintEvents = await searchFVCMintEvents(provider, fromBlock, currentBlock);
  console.log(`Found ${fvcMintEvents.length} FVC mint event(s)\n`);

  // 3. Search for Bonded events (if any)
  console.log("🔗 SEARCHING BONDED EVENTS");
  console.log("==========================");
  
  const bondedEvents = await searchBondedEvents(provider, fromBlock, currentBlock);
  console.log(`Found ${bondedEvents.length} Bonded event(s)\n`);

  // 4. Correlate events by transaction hash
  console.log("📊 CORRELATING EVENTS BY TRANSACTION");
  console.log("====================================");
  
  const transactionCorrelations = correlateEventsByTransaction(usdcToTreasuryEvents, fvcMintEvents, bondedEvents);
  
  // 5. Generate detailed reports for each correlated transaction
  for (const correlation of transactionCorrelations) {
    await generateTransactionReport(provider, correlation);
  }

  // 6. Generate summary statistics
  console.log("\n📈 SUMMARY STATISTICS");
  console.log("====================");
  
  const totalUSDCToTreasury = usdcToTreasuryEvents.reduce((sum, event) => sum + BigInt(event.value), BigInt(0));
  const totalFVCMinted = fvcMintEvents.reduce((sum, event) => sum + BigInt(event.value), BigInt(0));
  
  console.log(`Total USDC transferred to treasury: ${ethers.formatUnits(totalUSDCToTreasury, 6)} USDC`);
  console.log(`Total FVC minted: ${ethers.formatUnits(totalFVCMinted, 18)} FVC`);
  console.log(`Number of bonding transactions: ${transactionCorrelations.length}`);

  // 7. Verify current treasury balance
  const mockUSDC = await ethers.getContractAt("MockUSDC", CONTRACTS.MOCK_USDC);
  const currentTreasuryBalance = await mockUSDC.balanceOf(CONTRACTS.TREASURY);
  
  console.log(`Current treasury balance: ${ethers.formatUnits(currentTreasuryBalance, 6)} USDC`);
  
  const balanceMatches = currentTreasuryBalance >= totalUSDCToTreasury;
  console.log(`Balance verification: ${balanceMatches ? '✅ PASSES' : '⚠️ DISCREPANCY'}`);

  // 8. Generate public verification URLs
  console.log("\n🔗 PUBLIC VERIFICATION URLS");
  console.log("===========================");
  console.log(`Treasury: ${EXPLORER_BASE}/address/${CONTRACTS.TREASURY}`);
  console.log(`Gnosis Safe: https://safe.global/app/amoy:${CONTRACTS.TREASURY}`);
  
  for (const correlation of transactionCorrelations) {
    console.log(`Transaction: ${EXPLORER_BASE}/tx/${correlation.txHash}`);
  }

  console.log("\n🎯 EVENT QUERY COMPLETED");
}

async function searchUSDCTransfersToTreasury(provider: any, fromBlock: number, toBlock: number) {
  const events = [];
  
  // Search current USDC contract
  const currentUSDCEvents = await searchTransferEvents(
    provider, 
    CONTRACTS.MOCK_USDC, 
    CONTRACTS.TREASURY, 
    fromBlock, 
    toBlock,
    "current USDC"
  );
  events.push(...currentUSDCEvents);
  
  // Search legacy USDC contract
  try {
    const legacyUSDCEvents = await searchTransferEvents(
      provider, 
      CONTRACTS.LEGACY_USDC, 
      CONTRACTS.TREASURY, 
      fromBlock, 
      toBlock,
      "legacy USDC"
    );
    events.push(...legacyUSDCEvents);
  } catch (e) {
    console.log("⚠️ Could not search legacy USDC contract");
  }
  
  return events;
}

async function searchFVCMintEvents(provider: any, fromBlock: number, toBlock: number) {
  const events = [];
  
  // Search current FVC contract
  const currentFVCEvents = await searchMintEvents(
    provider, 
    CONTRACTS.FVC, 
    fromBlock, 
    toBlock,
    "current FVC"
  );
  events.push(...currentFVCEvents);
  
  // Search legacy FVC contract
  try {
    const legacyFVCEvents = await searchMintEvents(
      provider, 
      CONTRACTS.LEGACY_FVC, 
      fromBlock, 
      toBlock,
      "legacy FVC"
    );
    events.push(...legacyFVCEvents);
  } catch (e) {
    console.log("⚠️ Could not search legacy FVC contract");
  }
  
  return events;
}

async function searchBondedEvents(provider: any, fromBlock: number, toBlock: number) {
  const events = [];
  
  // Search current bonding contract
  try {
    const currentBondedEvents = await searchEventsBySignature(
      provider,
      CONTRACTS.BONDING,
      BONDED_SIGNATURE,
      fromBlock,
      toBlock,
      "current bonding"
    );
    events.push(...currentBondedEvents);
  } catch (e) {
    console.log("⚠️ Could not search current bonding contract for Bonded events");
  }
  
  // Search legacy bonding contract
  try {
    const legacyBondedEvents = await searchEventsBySignature(
      provider,
      CONTRACTS.LEGACY_BONDING,
      BONDED_SIGNATURE,
      fromBlock,
      toBlock,
      "legacy bonding"
    );
    events.push(...legacyBondedEvents);
  } catch (e) {
    console.log("⚠️ Could not search legacy bonding contract for Bonded events");
  }
  
  return events;
}

async function searchTransferEvents(
  provider: any, 
  tokenAddress: string, 
  toAddress: string, 
  fromBlock: number, 
  toBlock: number,
  contractName: string
) {
  console.log(`Searching ${contractName} transfers to treasury...`);
  
  const filter = {
    address: tokenAddress,
    topics: [
      TRANSFER_SIGNATURE,
      null, // from (any address)
      ethers.zeroPadValue(toAddress, 32) // to (treasury)
    ],
    fromBlock,
    toBlock
  };
  
  try {
    const logs = await provider.getLogs(filter);
    
    const events = logs.map((log: any) => ({
      address: log.address,
      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
      logIndex: log.logIndex,
      from: ethers.getAddress(ethers.dataSlice(log.topics[1], 12)),
      to: ethers.getAddress(ethers.dataSlice(log.topics[2], 12)),
      value: ethers.getBigInt(log.data).toString(),
      contractName
    }));
    
    console.log(`Found ${events.length} transfer(s) from ${contractName}`);
    return events;
  } catch (error) {
    console.log(`⚠️ Error searching ${contractName}:`, error);
    return [];
  }
}

async function searchMintEvents(
  provider: any, 
  tokenAddress: string, 
  fromBlock: number, 
  toBlock: number,
  contractName: string
) {
  console.log(`Searching ${contractName} mint events...`);
  
  const filter = {
    address: tokenAddress,
    topics: [
      TRANSFER_SIGNATURE,
      ethers.zeroPadValue("0x0000000000000000000000000000000000000000", 32), // from (zero = mint)
      null // to (any address)
    ],
    fromBlock,
    toBlock
  };
  
  try {
    const logs = await provider.getLogs(filter);
    
    const events = logs.map((log: any) => ({
      address: log.address,
      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
      logIndex: log.logIndex,
      from: ethers.getAddress(ethers.dataSlice(log.topics[1], 12)),
      to: ethers.getAddress(ethers.dataSlice(log.topics[2], 12)),
      value: ethers.getBigInt(log.data).toString(),
      contractName
    }));
    
    console.log(`Found ${events.length} mint(s) from ${contractName}`);
    return events;
  } catch (error) {
    console.log(`⚠️ Error searching ${contractName}:`, error);
    return [];
  }
}

async function searchEventsBySignature(
  provider: any,
  contractAddress: string,
  eventSignature: string,
  fromBlock: number,
  toBlock: number,
  contractName: string
) {
  console.log(`Searching ${contractName} events...`);
  
  const filter = {
    address: contractAddress,
    topics: [eventSignature],
    fromBlock,
    toBlock
  };
  
  try {
    const logs = await provider.getLogs(filter);
    
    const events = logs.map((log: any) => ({
      address: log.address,
      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
      logIndex: log.logIndex,
      topics: log.topics,
      data: log.data,
      contractName
    }));
    
    console.log(`Found ${events.length} event(s) from ${contractName}`);
    return events;
  } catch (error) {
    console.log(`⚠️ Error searching ${contractName}:`, error);
    return [];
  }
}

function correlateEventsByTransaction(usdcEvents: any[], fvcEvents: any[], bondedEvents: any[]) {
  const correlations: any[] = [];
  const transactionMap = new Map();
  
  // Group events by transaction hash
  [...usdcEvents, ...fvcEvents, ...bondedEvents].forEach(event => {
    if (!transactionMap.has(event.txHash)) {
      transactionMap.set(event.txHash, {
        txHash: event.txHash,
        blockNumber: event.blockNumber,
        usdcTransfers: [],
        fvcMints: [],
        bondedEvents: []
      });
    }
    
    const correlation = transactionMap.get(event.txHash);
    
    if (usdcEvents.includes(event)) {
      correlation.usdcTransfers.push(event);
    } else if (fvcEvents.includes(event)) {
      correlation.fvcMints.push(event);
    } else if (bondedEvents.includes(event)) {
      correlation.bondedEvents.push(event);
    }
  });
  
  // Filter to only transactions that have both USDC transfers and FVC mints (indicating bonding)
  for (const correlation of transactionMap.values()) {
    if (correlation.usdcTransfers.length > 0 && correlation.fvcMints.length > 0) {
      correlations.push(correlation);
    }
  }
  
  console.log(`Found ${correlations.length} bonding transaction(s) with correlated events`);
  return correlations.sort((a, b) => a.blockNumber - b.blockNumber);
}

async function generateTransactionReport(provider: any, correlation: any) {
  console.log(`\n🔍 TRANSACTION ANALYSIS: ${correlation.txHash}`);
  console.log(`=====================================`);
  console.log(`Explorer: ${EXPLORER_BASE}/tx/${correlation.txHash}`);
  console.log(`Block: ${correlation.blockNumber}`);
  
  try {
    const tx = await provider.getTransaction(correlation.txHash);
    const receipt = await provider.getTransactionReceipt(correlation.txHash);
    const block = await provider.getBlock(correlation.blockNumber);
    
    console.log(`Timestamp: ${new Date(block.timestamp * 1000).toISOString()}`);
    console.log(`From: ${tx.from}`);
    console.log(`Gas Used: ${receipt.gasUsed.toString()}`);
    console.log(`Status: ${receipt.status === 1 ? 'Success' : 'Failed'}`);
    
    // Analyze USDC transfers
    for (const usdcTransfer of correlation.usdcTransfers) {
      console.log(`\n📤 USDC Transfer to Treasury:`);
      console.log(`  Contract: ${usdcTransfer.contractName} (${usdcTransfer.address})`);
      console.log(`  From: ${usdcTransfer.from}`);
      console.log(`  To: ${usdcTransfer.to}`);
      console.log(`  Amount: ${ethers.formatUnits(usdcTransfer.value, 6)} USDC`);
      console.log(`  Log Index: ${usdcTransfer.logIndex}`);
    }
    
    // Analyze FVC mints
    for (const fvcMint of correlation.fvcMints) {
      console.log(`\n🪙 FVC Mint:`);
      console.log(`  Contract: ${fvcMint.contractName} (${fvcMint.address})`);
      console.log(`  From: ${fvcMint.from} (Mint)`);
      console.log(`  To: ${fvcMint.to}`);
      console.log(`  Amount: ${ethers.formatUnits(fvcMint.value, 18)} FVC`);
      console.log(`  Log Index: ${fvcMint.logIndex}`);
    }
    
    // Analyze Bonded events
    for (const bondedEvent of correlation.bondedEvents) {
      console.log(`\n🔗 Bonded Event:`);
      console.log(`  Contract: ${bondedEvent.contractName} (${bondedEvent.address})`);
      console.log(`  Log Index: ${bondedEvent.logIndex}`);
      // Note: Would need contract ABI to decode the event data properly
    }
    
  } catch (error) {
    console.log(`⚠️ Error analyzing transaction: ${error}`);
  }
}

main().catch((error) => {
  console.error("❌ Error querying blockchain events:", error);
  process.exitCode = 1;
});
