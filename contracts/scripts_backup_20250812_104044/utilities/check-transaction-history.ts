import { ethers } from "hardhat";

async function main() {
  const userAddress = "0xcABa97a2bb6ca2797e302C864C37632b4185d595";
  const bondingAddress = "0xE80f7844A933fdBf2b7f1f79a25f36243e54E490";
  const fvcAddress = "0xbC1A71287d6131ED8699F86228cd6fF38680b01e";
  
  console.log("=== TRANSACTION HISTORY ANALYSIS ===");
  console.log("User address:", userAddress);
  console.log("Bonding contract:", bondingAddress);
  console.log("FVC contract:", fvcAddress);
  
  // Get the provider
  const provider = ethers.provider;
  
  // Get the latest block number
  const latestBlock = await provider.getBlockNumber();
  console.log("Latest block:", latestBlock);
  
  // Get recent transactions for the user (last 10 blocks)
  console.log("\n=== RECENT TRANSACTIONS ===");
  for (let i = 0; i < 10; i++) {
    const blockNumber = latestBlock - i;
    const block = await provider.getBlock(blockNumber);
    
    if (block && block.transactions) {
      for (const txHash of block.transactions) {
        const tx = await provider.getTransaction(txHash);
        if (tx && tx.from === userAddress) {
          console.log(`Block ${blockNumber}: ${txHash}`);
          console.log(`  From: ${tx.from}`);
          console.log(`  To: ${tx.to}`);
          console.log(`  Value: ${ethers.formatEther(tx.value)} ETH`);
          console.log(`  Gas: ${tx.gasLimit.toString()}`);
          console.log("---");
        }
      }
    }
  }
  
  // Check specific bonding events
  console.log("\n=== BONDING EVENTS ===");
  const bonding = await ethers.getContractAt("Bonding", bondingAddress);
  
  // Get Bonded events
  const bondedFilter = bonding.filters.Bonded(userAddress);
  const bondedEvents = await bonding.queryFilter(bondedFilter);
  
  console.log("Bonded events found:", bondedEvents.length);
  for (const event of bondedEvents) {
    console.log(`Event: Bonded`);
    console.log(`  User: ${(event as any).args?.user}`);
    console.log(`  Amount: ${ethers.formatUnits((event as any).args?.amount || 0, 6)} USDC`);
    console.log(`  Block: ${event.blockNumber}`);
    console.log(`  Transaction: ${event.transactionHash}`);
  }
  
  // Get VestingScheduleCreated events
  const vestingFilter = bonding.filters.VestingScheduleCreated(userAddress);
  const vestingEvents = await bonding.queryFilter(vestingFilter);
  
  console.log("\nVesting events found:", vestingEvents.length);
  for (const event of vestingEvents) {
    console.log(`Event: VestingScheduleCreated`);
    console.log(`  User: ${(event as any).args?.user}`);
    console.log(`  Amount: ${ethers.formatUnits((event as any).args?.amount || 0, 18)} FVC`);
    console.log(`  Start: ${new Date(Number((event as any).args?.startTime || 0) * 1000)}`);
    console.log(`  End: ${new Date(Number((event as any).args?.endTime || 0) * 1000)}`);
    console.log(`  Block: ${event.blockNumber}`);
    console.log(`  Transaction: ${event.transactionHash}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 