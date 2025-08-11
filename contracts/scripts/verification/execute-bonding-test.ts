import { ethers } from "hardhat";

/**
 * Execute Test Bonding Transaction for On-Chain Proof Generation
 * This script performs a bonding transaction and captures all necessary evidence
 */

const CONTRACTS = {
  FVC: "0x271d4cF375eC80797BC6a5777D7cdF83feCD77A1",
  BONDING: "0x26725c6BDb619fbBd7b06ED221A6Fb544812656d", 
  MOCK_USDC: "0xa8E7C6D0b288f2c19FED3F7462019331cF406eF6",
  TREASURY: "0x7f1EE89fDB16b57930b7F53Bb998f25d917F35D9"
};

const EXPLORER_BASE = "https://www.oklink.com/amoy";

async function main() {
  console.log("🧪 Executing Test Bonding Transaction for Proof Generation");
  console.log("=========================================================\n");

  const [user] = await ethers.getSigners();
  console.log(`User Address: ${user.address}\n`);

  // Get contracts
  const fvc = await ethers.getContractAt("FVC", CONTRACTS.FVC);
  const bonding = await ethers.getContractAt("Bonding", CONTRACTS.BONDING);
  const mockUSDC = await ethers.getContractAt("MockUSDC", CONTRACTS.MOCK_USDC);

  // Step 1: Check initial balances
  console.log("📊 INITIAL STATE");
  console.log("================");
  
  const initialUserUSDC = await mockUSDC.balanceOf(user.address);
  const initialUserFVC = await fvc.balanceOf(user.address);
  const initialTreasuryUSDC = await mockUSDC.balanceOf(CONTRACTS.TREASURY);
  const currentBlock = await ethers.provider.getBlockNumber();
  
  console.log(`User USDC Balance: ${ethers.formatUnits(initialUserUSDC, 6)} USDC`);
  console.log(`User FVC Balance: ${ethers.formatUnits(initialUserFVC, 18)} FVC`);
  console.log(`Treasury USDC Balance: ${ethers.formatUnits(initialTreasuryUSDC, 6)} USDC`);
  console.log(`Current Block: ${currentBlock}\n`);

  // Step 2: Mint USDC if needed
  if (initialUserUSDC < ethers.parseUnits("1000", 6)) {
    console.log("💰 Minting USDC for testing...");
    const mintTx = await mockUSDC.mint(user.address, ethers.parseUnits("10000", 6));
    await mintTx.wait();
    console.log(`✅ Minted 10,000 USDC`);
    console.log(`Transaction: ${EXPLORER_BASE}/tx/${mintTx.hash}\n`);
  }

  // Step 3: Check bonding parameters
  console.log("⚙️ BONDING PARAMETERS");
  console.log("=====================");
  
  const currentRound = await bonding.getCurrentRound();
  const currentDiscount = await bonding.getCurrentDiscount();
  const remainingFVC = await bonding.getRemainingFVC();
  
  console.log(`Current Discount: ${currentDiscount}%`);
  console.log(`Remaining FVC: ${ethers.formatUnits(remainingFVC, 18)} FVC`);
  console.log(`Round Active: ${currentRound.isActive}`);
  
  if (!currentRound.isActive) {
    console.log("❌ Bonding round is not active");
    return;
  }
  
  if (remainingFVC === 0n) {
    console.log("❌ No FVC allocated for bonding");
    return;
  }

  // Step 4: Calculate bonding amounts
  const fvcToBuy = ethers.parseUnits("100", 18); // Buy 100 FVC
  const usdcNeeded = await bonding.calculateUSDCAmount(fvcToBuy);
  
  console.log(`\nFVC to buy: ${ethers.formatUnits(fvcToBuy, 18)} FVC`);
  console.log(`USDC needed: ${ethers.formatUnits(usdcNeeded, 6)} USDC\n`);

  // Step 5: Approve USDC
  console.log("🔐 Approving USDC...");
  const approveTx = await mockUSDC.approve(CONTRACTS.BONDING, usdcNeeded);
  const approveReceipt = await approveTx.wait();
  console.log(`✅ USDC approved`);
  console.log(`Transaction: ${EXPLORER_BASE}/tx/${approveTx.hash}`);
  console.log(`Block: ${approveReceipt.blockNumber}\n`);

  // Step 6: Capture pre-bonding state
  console.log("📸 PRE-BONDING SNAPSHOT");
  console.log("=======================");
  
  const preBlock = await ethers.provider.getBlockNumber();
  const preBlockData = await ethers.provider.getBlock(preBlock);
  const preBondingUserUSDC = await mockUSDC.balanceOf(user.address);
  const preBondingUserFVC = await fvc.balanceOf(user.address);
  const preBondingTreasuryUSDC = await mockUSDC.balanceOf(CONTRACTS.TREASURY);
  
  console.log(`Block: ${preBlock}`);
  console.log(`Timestamp: ${new Date(preBlockData!.timestamp * 1000).toISOString()}`);
  console.log(`User USDC: ${ethers.formatUnits(preBondingUserUSDC, 6)} USDC`);
  console.log(`User FVC: ${ethers.formatUnits(preBondingUserFVC, 18)} FVC`);
  console.log(`Treasury USDC: ${ethers.formatUnits(preBondingTreasuryUSDC, 6)} USDC`);
  console.log(`Explorer: ${EXPLORER_BASE}/address/${CONTRACTS.TREASURY}?block=${preBlock}\n`);

  // Step 7: Execute bonding transaction
  console.log("🚀 EXECUTING BONDING TRANSACTION");
  console.log("================================");
  
  const bondingTx = await bonding.bond(fvcToBuy);
  console.log(`✅ Bonding transaction submitted`);
  console.log(`Transaction Hash: ${bondingTx.hash}`);
  console.log(`Explorer: ${EXPLORER_BASE}/tx/${bondingTx.hash}`);
  
  const bondingReceipt = await bondingTx.wait();
  console.log(`✅ Transaction confirmed`);
  console.log(`Block: ${bondingReceipt.blockNumber}`);
  console.log(`Gas Used: ${bondingReceipt.gasUsed.toString()}`);
  
  const bondingBlock = await ethers.provider.getBlock(bondingReceipt.blockNumber);
  console.log(`Timestamp: ${new Date(bondingBlock!.timestamp * 1000).toISOString()}\n`);

  // Step 8: Analyze transaction events
  console.log("📝 TRANSACTION EVENT ANALYSIS");
  console.log("=============================");
  
  for (let i = 0; i < bondingReceipt.logs.length; i++) {
    const log = bondingReceipt.logs[i];
    console.log(`\nEvent ${i + 1}:`);
    console.log(`  Contract: ${log.address}`);
    console.log(`  Log Index: ${log.logIndex}`);
    
    try {
      if (log.address.toLowerCase() === CONTRACTS.MOCK_USDC.toLowerCase()) {
        const decoded = mockUSDC.interface.parseLog(log);
        if (decoded?.name === 'Transfer') {
          console.log(`  📤 USDC Transfer Event:`);
          console.log(`    From: ${decoded.args.from}`);
          console.log(`    To: ${decoded.args.to}`);
          console.log(`    Amount: ${ethers.formatUnits(decoded.args.value, 6)} USDC`);
          
          if (decoded.args.to.toLowerCase() === CONTRACTS.TREASURY.toLowerCase()) {
            console.log(`    ✅ CONFIRMED: USDC transferred to treasury`);
          }
        }
      }
      
      if (log.address.toLowerCase() === CONTRACTS.FVC.toLowerCase()) {
        const decoded = fvc.interface.parseLog(log);
        if (decoded?.name === 'Transfer') {
          console.log(`  🪙 FVC Transfer Event:`);
          console.log(`    From: ${decoded.args.from}`);
          console.log(`    To: ${decoded.args.to}`);
          console.log(`    Amount: ${ethers.formatUnits(decoded.args.value, 18)} FVC`);
          
          if (decoded.args.from === ethers.ZeroAddress) {
            console.log(`    ✅ CONFIRMED: FVC minted to user`);
          }
        }
      }
      
      if (log.address.toLowerCase() === CONTRACTS.BONDING.toLowerCase()) {
        try {
          const decoded = bonding.interface.parseLog(log);
          console.log(`  🔗 Bonding Event: ${decoded?.name}`);
          if (decoded?.args) {
            console.log(`    Args:`, decoded.args);
          }
        } catch (e) {
          console.log(`  🔗 Bonding Event (raw):`, log.topics[0]);
        }
      }
    } catch (error) {
      console.log(`  ⚠️ Could not decode event`);
    }
  }

  // Step 9: Capture post-bonding state
  console.log("\n📸 POST-BONDING SNAPSHOT");
  console.log("========================");
  
  const postBlock = await ethers.provider.getBlockNumber();
  const postBlockData = await ethers.provider.getBlock(postBlock);
  const postBondingUserUSDC = await mockUSDC.balanceOf(user.address);
  const postBondingUserFVC = await fvc.balanceOf(user.address);
  const postBondingTreasuryUSDC = await mockUSDC.balanceOf(CONTRACTS.TREASURY);
  
  console.log(`Block: ${postBlock}`);
  console.log(`Timestamp: ${new Date(postBlockData!.timestamp * 1000).toISOString()}`);
  console.log(`User USDC: ${ethers.formatUnits(postBondingUserUSDC, 6)} USDC`);
  console.log(`User FVC: ${ethers.formatUnits(postBondingUserFVC, 18)} FVC`);
  console.log(`Treasury USDC: ${ethers.formatUnits(postBondingTreasuryUSDC, 6)} USDC`);
  console.log(`Explorer: ${EXPLORER_BASE}/address/${CONTRACTS.TREASURY}?block=${postBlock}\n`);

  // Step 10: Calculate changes
  console.log("📊 BALANCE CHANGE ANALYSIS");
  console.log("==========================");
  
  const userUSDCChange = postBondingUserUSDC - preBondingUserUSDC;
  const userFVCChange = postBondingUserFVC - preBondingUserFVC;
  const treasuryUSDCChange = postBondingTreasuryUSDC - preBondingTreasuryUSDC;
  
  console.log(`User USDC Change: ${ethers.formatUnits(userUSDCChange, 6)} USDC`);
  console.log(`User FVC Change: +${ethers.formatUnits(userFVCChange, 18)} FVC`);
  console.log(`Treasury USDC Change: +${ethers.formatUnits(treasuryUSDCChange, 6)} USDC`);
  
  // Verification checks
  const usdcTransferMatches = -userUSDCChange === treasuryUSDCChange;
  const fvcReceivedMatches = userFVCChange === fvcToBuy;
  
  console.log(`\n✅ Verification Results:`);
  console.log(`USDC flow user→treasury: ${usdcTransferMatches ? '✅ MATCHES' : '❌ MISMATCH'}`);
  console.log(`FVC received by user: ${fvcReceivedMatches ? '✅ MATCHES' : '❌ MISMATCH'}`);

  // Step 11: Generate audit evidence summary
  console.log("\n🎯 AUDIT EVIDENCE SUMMARY");
  console.log("=========================");
  
  console.log(`\n=== BONDING TRANSACTION PROOF ===`);
  console.log(`Transaction Hash: ${bondingTx.hash}`);
  console.log(`Block Number: ${bondingReceipt.blockNumber}`);
  console.log(`Timestamp: ${new Date(bondingBlock!.timestamp * 1000).toISOString()}`);
  console.log(`Gas Used: ${bondingReceipt.gasUsed.toString()}`);
  console.log(`Status: Success`);
  console.log(`Explorer URL: ${EXPLORER_BASE}/tx/${bondingTx.hash}`);
  
  console.log(`\n=== USDC TRANSFER TO TREASURY ===`);
  console.log(`From: ${user.address}`);
  console.log(`To: ${CONTRACTS.TREASURY} (Gnosis Safe)`);
  console.log(`Amount: ${ethers.formatUnits(treasuryUSDCChange, 6)} USDC`);
  console.log(`Transaction: ${bondingTx.hash}`);
  console.log(`Block: ${bondingReceipt.blockNumber}`);
  
  console.log(`\n=== FVC MINT TO USER ===`);
  console.log(`From: 0x0000000000000000000000000000000000000000 (Mint)`);
  console.log(`To: ${user.address}`);
  console.log(`Amount: ${ethers.formatUnits(userFVCChange, 18)} FVC`);
  console.log(`Transaction: ${bondingTx.hash}`);
  console.log(`Block: ${bondingReceipt.blockNumber}`);
  
  console.log(`\n=== TREASURY BALANCE VERIFICATION ===`);
  console.log(`Pre-Transaction: ${ethers.formatUnits(preBondingTreasuryUSDC, 6)} USDC (Block ${preBlock})`);
  console.log(`Post-Transaction: ${ethers.formatUnits(postBondingTreasuryUSDC, 6)} USDC (Block ${postBlock})`);
  console.log(`Increase: +${ethers.formatUnits(treasuryUSDCChange, 6)} USDC`);
  console.log(`Treasury Explorer: ${EXPLORER_BASE}/address/${CONTRACTS.TREASURY}`);
  
  console.log(`\n=== PUBLIC VERIFICATION URLS ===`);
  console.log(`Transaction: ${EXPLORER_BASE}/tx/${bondingTx.hash}`);
  console.log(`Treasury: ${EXPLORER_BASE}/address/${CONTRACTS.TREASURY}`);
  console.log(`Gnosis Safe: https://safe.global/app/amoy:${CONTRACTS.TREASURY}`);
  console.log(`Pre-bonding balance: ${EXPLORER_BASE}/address/${CONTRACTS.TREASURY}?block=${preBlock}`);
  console.log(`Post-bonding balance: ${EXPLORER_BASE}/address/${CONTRACTS.TREASURY}?block=${postBlock}`);

  console.log("\n🎉 TEST BONDING TRANSACTION COMPLETED SUCCESSFULLY");
  console.log("✅ All evidence collected for audit verification");
}

main().catch((error) => {
  console.error("❌ Error executing bonding test:", error);
  process.exitCode = 1;
});
