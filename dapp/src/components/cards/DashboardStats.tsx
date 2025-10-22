import React from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { theme } from '@/constants/theme';
import { STAKING_ADDRESS, FVC_ADDRESS, stakingRewardsABI, fvcABI } from '@/contracts/staking';

const DashboardStats: React.FC = () => {
  const { address } = useAccount();

  const { data: totalStaked } = useReadContract({
    address: STAKING_ADDRESS,
    abi: stakingRewardsABI,
    functionName: 'totalSupply',
  });

  const { data: fvcBalance } = useReadContract({
    address: FVC_ADDRESS,
    abi: fvcABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { data: stakedBalance } = useReadContract({
    address: STAKING_ADDRESS,
    abi: stakingRewardsABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { data: earnedRewards } = useReadContract({
    address: STAKING_ADDRESS,
    abi: stakingRewardsABI,
    functionName: 'earned',
    args: address ? [address] : undefined,
  });

  const stats = [
    {
      label: 'Total Value Staked',
      value: totalStaked ? `${Number(formatUnits(totalStaked, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 })} FVC` : '0 FVC',
      icon: '📊',
      color: theme.generalButton,
    },
    {
      label: 'Your Balance',
      value: fvcBalance ? `${Number(formatUnits(fvcBalance, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 })} FVC` : '0 FVC',
      icon: '💼',
      color: '#10B981',
    },
    {
      label: 'Your Staked',
      value: stakedBalance ? `${Number(formatUnits(stakedBalance, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 })} FVC` : '0 FVC',
      icon: '🔒',
      color: '#F59E0B',
    },
    {
      label: 'Earned Rewards',
      value: earnedRewards ? `${Number(formatUnits(earnedRewards, 6)).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC` : '0 USDC',
      icon: '💰',
      color: '#8B5CF6',
    },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: 20,
      marginBottom: 24,
    }}>
      {stats.map((stat, index) => (
        <div
          key={index}
          style={{
            background: theme.modalBackground,
            borderRadius: 16,
            padding: 24,
            border: `1px solid ${theme.darkBorder}`,
            transition: 'all 0.2s ease',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = stat.color;
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = `0 8px 24px ${stat.color}20`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = theme.darkBorder;
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 24 }}>{stat.icon}</div>
            <div style={{ fontSize: 14, color: theme.secondaryText, fontWeight: 600 }}>
              {stat.label}
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: stat.color }}>
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardStats;
