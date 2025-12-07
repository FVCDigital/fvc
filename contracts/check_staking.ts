import { ethers } from 'hardhat';

async function main() {
  // Base Sepolia addresses
  const STAKING_ADDRESS = '0x404307557837CDe827f7B4bbb5ea12bD69a6F7F5';
  const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
  
  const stakingABI = [
    'function rewardRate() view returns (uint256)',
    'function periodFinish() view returns (uint256)',
    'function rewardsDuration() view returns (uint256)',
    'function totalSupply() view returns (uint256)',
    'function rewardsToken() view returns (address)',
    'function stakingToken() view returns (address)',
  ];
  
  const erc20ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function decimals() view returns (uint8)',
  ];
  
  const staking = await ethers.getContractAt(stakingABI, STAKING_ADDRESS);
  const usdc = await ethers.getContractAt(erc20ABI, USDC_ADDRESS);
  
  console.log('=== Staking Contract Info (Base Sepolia) ===');
  console.log('Staking Address:', STAKING_ADDRESS);
  
  const rewardRate = await staking.rewardRate();
  const periodFinish = await staking.periodFinish();
  const rewardsDuration = await staking.rewardsDuration();
  const totalSupply = await staking.totalSupply();
  const rewardsToken = await staking.rewardsToken();
  const stakingToken = await staking.stakingToken();
  
  console.log('\nReward Rate:', ethers.formatUnits(rewardRate, 6), 'USDC per second');
  console.log('Period Finish:', new Date(Number(periodFinish) * 1000).toISOString());
  console.log('Rewards Duration:', Number(rewardsDuration) / 86400, 'days');
  console.log('Total Staked:', ethers.formatUnits(totalSupply, 18), 'FVC');
  console.log('Rewards Token:', rewardsToken);
  console.log('Staking Token:', stakingToken);
  
  const usdcBalance = await usdc.balanceOf(STAKING_ADDRESS);
  console.log('\nUSDC Balance in Staking:', ethers.formatUnits(usdcBalance, 6), 'USDC');
  
  const now = Math.floor(Date.now() / 1000);
  const isActive = Number(periodFinish) > now;
  console.log('\nReward Period Active:', isActive);
  
  if (isActive) {
    const remaining = Number(periodFinish) - now;
    console.log('Time Remaining:', Math.floor(remaining / 86400), 'days', Math.floor((remaining % 86400) / 3600), 'hours');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
