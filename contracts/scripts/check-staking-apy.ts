import { ethers } from "hardhat";

/**
 * Check staking APY for a deployed Staking contract
 * Usage: yarn hardhat run scripts/check-staking-apy.ts --network base-sepolia
 */

async function main() {
  const STAKING_ADDRESSES = {
    "base-sepolia": "0x404307557837CDe827f7B4bbb5ea12bD69a6F7F5",
    "bsc-testnet": "0xAA8C1C430634D16b37f8132c88607EfA1924c064",
    "polygon-amoy": "0x18E68709b00b792429aF671a7ADd0Ac0D2dF335A",
  };

  const network = (await ethers.provider.getNetwork()).name;
  const stakingAddress = STAKING_ADDRESSES[network as keyof typeof STAKING_ADDRESSES];

  if (!stakingAddress) {
    console.error(`No staking address configured for network: ${network}`);
    process.exit(1);
  }

  console.log("═══════════════════════════════════════════════════════════════");
  console.log("STAKING APY CHECK");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("Network:        ", network);
  console.log("Staking Address:", stakingAddress);
  console.log();

  const staking = await ethers.getContractAt("Staking", stakingAddress);

  // Get staking data
  const totalStaked = await staking.totalSupply();
  const rewardRate = await staking.rewardRate();
  const rewardsDuration = await staking.rewardsDuration();
  const periodFinish = await staking.periodFinish();
  const currentTime = Math.floor(Date.now() / 1000);

  console.log("📊 STAKING METRICS");
  console.log("─────────────────────────────────────────────────────────────");
  console.log("Total Staked:      ", ethers.formatUnits(totalStaked, 18), "FVC");
  console.log("Reward Rate:       ", ethers.formatUnits(rewardRate, 6), "USDC/second");
  console.log("Rewards Duration:  ", Number(rewardsDuration) / 86400, "days");
  console.log("Period Finish:     ", new Date(Number(periodFinish) * 1000).toISOString());
  console.log("Period Active:     ", currentTime < Number(periodFinish) ? "YES" : "NO");
  console.log();

  // Calculate APY
  if (totalStaked > 0n && rewardRate > 0n) {
    // Annual rewards = rewardRate * seconds per year
    const secondsPerYear = 365.25 * 24 * 60 * 60;
    const annualRewards = rewardRate * BigInt(Math.floor(secondsPerYear));
    
    // APY = (annual rewards / total staked) * 100
    // Convert to same decimals: rewards are USDC (6 decimals), staked is FVC (18 decimals)
    // Need to normalize to compare
    const annualRewardsInDollars = Number(ethers.formatUnits(annualRewards, 6));
    const totalStakedInTokens = Number(ethers.formatUnits(totalStaked, 18));
    
    // Assuming FVC price = $1 for APY calculation (adjust if different)
    const fvcPrice = 1.0; // TODO: Get from oracle or config
    const totalStakedInDollars = totalStakedInTokens * fvcPrice;
    
    const apy = (annualRewardsInDollars / totalStakedInDollars) * 100;

    console.log("💰 APY CALCULATION");
    console.log("─────────────────────────────────────────────────────────────");
    console.log("Annual Rewards:    ", annualRewardsInDollars.toFixed(2), "USDC");
    console.log("Total Staked:      ", totalStakedInDollars.toFixed(2), "USD (at $" + fvcPrice + "/FVC)");
    console.log("Current APY:       ", apy.toFixed(2), "%");
    console.log();

    // Show reward for duration
    const rewardForDuration = rewardRate * rewardsDuration;
    console.log("Reward for Duration:", ethers.formatUnits(rewardForDuration, 6), "USDC");
  } else {
    console.log("⚠️  No rewards configured yet");
    console.log("   Safe needs to call notifyRewardAmount() to start distributing rewards");
  }

  console.log();
  console.log("═══════════════════════════════════════════════════════════════");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
