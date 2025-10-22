import React, { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { theme } from '@/constants/theme';
import {
  STAKING_ADDRESS,
  FVC_ADDRESS,
  USDC_ADDRESS,
  stakingRewardsABI,
  fvcABI,
  usdcABI,
} from '@/contracts/staking';

const StakingCard: React.FC = () => {
  const { address } = useAccount();
  const [stakeAmount, setStakeAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');

  // Read user's FVC balance
  const { data: fvcBalance } = useReadContract({
    address: FVC_ADDRESS,
    abi: fvcABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  // Read user's staked balance
  const { data: stakedBalance } = useReadContract({
    address: STAKING_ADDRESS,
    abi: stakingRewardsABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  // Read earned rewards
  const { data: earnedRewards } = useReadContract({
    address: STAKING_ADDRESS,
    abi: stakingRewardsABI,
    functionName: 'earned',
    args: address ? [address] : undefined,
  });

  // Read total staked
  const { data: totalStaked } = useReadContract({
    address: STAKING_ADDRESS,
    abi: stakingRewardsABI,
    functionName: 'totalSupply',
  });

  // Read USDC balance
  const { data: usdcBalance } = useBalance({
    address: address,
    token: USDC_ADDRESS,
  });

  // Write: approve FVC
  const { data: approveHash, writeContract: approve } = useWriteContract();
  const { isLoading: isApproving } = useWaitForTransactionReceipt({ hash: approveHash });

  // Write: stake FVC
  const { data: stakeHash, writeContract: stake } = useWriteContract();
  const { isLoading: isStaking } = useWaitForTransactionReceipt({ hash: stakeHash });

  // Write: withdraw FVC
  const { data: withdrawHash, writeContract: withdraw } = useWriteContract();
  const { isLoading: isWithdrawing } = useWaitForTransactionReceipt({ hash: withdrawHash });

  // Write: claim rewards
  const { data: claimHash, writeContract: claim } = useWriteContract();
  const { isLoading: isClaiming } = useWaitForTransactionReceipt({ hash: claimHash });

  const handleApprove = () => {
    if (!stakeAmount || !address) return;
    approve({
      address: FVC_ADDRESS,
      abi: fvcABI,
      functionName: 'approve',
      args: [STAKING_ADDRESS, parseUnits(stakeAmount, 18)],
    });
  };

  const handleStake = () => {
    if (!stakeAmount || !address) return;
    stake({
      address: STAKING_ADDRESS,
      abi: stakingRewardsABI,
      functionName: 'stake',
      args: [parseUnits(stakeAmount, 18)],
    });
  };

  const handleWithdraw = () => {
    if (!withdrawAmount || !address) return;
    withdraw({
      address: STAKING_ADDRESS,
      abi: stakingRewardsABI,
      functionName: 'withdraw',
      args: [parseUnits(withdrawAmount, 18)],
    });
  };

  const handleClaim = () => {
    if (!address) return;
    claim({
      address: STAKING_ADDRESS,
      abi: stakingRewardsABI,
      functionName: 'getReward',
    });
  };

  const setMaxStake = () => {
    if (fvcBalance) {
      setStakeAmount(formatUnits(fvcBalance, 18));
    }
  };

  const setMaxWithdraw = () => {
    if (stakedBalance) {
      setWithdrawAmount(formatUnits(stakedBalance, 18));
    }
  };

  if (!address) {
    return (
      <div style={{
        background: theme.modalBackground,
        color: theme.primaryText,
        borderRadius: 16,
        padding: 28,
        boxShadow: `0 4px 24px ${theme.accentGlow}`,
        margin: '16px auto',
        maxWidth: 800,
        width: '100%',
        border: `1px solid ${theme.darkBorder}`,
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>
          Stake FVC
        </div>
        <div style={{ fontSize: 16, color: theme.secondaryText, textAlign: 'center' }}>
          Connect your wallet to start staking
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: theme.modalBackground,
      color: theme.primaryText,
      borderRadius: 16,
      padding: 28,
      boxShadow: `0 4px 24px ${theme.accentGlow}`,
      margin: '16px auto',
      maxWidth: '100%',
      width: '100%',
      border: `1px solid ${theme.darkBorder}`,
      fontFamily: 'Inter, sans-serif',
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Stake FVC</div>
        <div style={{ fontSize: 14, color: theme.secondaryText }}>
          Stake FVC tokens to earn proportional USDC rewards from treasury yields
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 16,
        marginBottom: 24,
      }}>
        <div style={{
          background: theme.modalBackground,
          borderRadius: 12,
          padding: 16,
          border: `1px solid ${theme.darkBorder}`,
        }}>
          <div style={{ fontSize: 12, color: theme.secondaryText, marginBottom: 4 }}>
            Your FVC Balance
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: theme.primaryText }}>
            {fvcBalance ? Number(formatUnits(fvcBalance, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'} FVC
          </div>
        </div>

        <div style={{
          background: theme.modalBackground,
          borderRadius: 12,
          padding: 16,
          border: `1px solid ${theme.darkBorder}`,
        }}>
          <div style={{ fontSize: 12, color: theme.secondaryText, marginBottom: 4 }}>
            Your Staked
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: theme.generalButton }}>
            {stakedBalance ? Number(formatUnits(stakedBalance, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'} FVC
          </div>
        </div>

        <div style={{
          background: theme.modalBackground,
          borderRadius: 12,
          padding: 16,
          border: `1px solid ${theme.darkBorder}`,
        }}>
          <div style={{ fontSize: 12, color: theme.secondaryText, marginBottom: 4 }}>
            Earned Rewards
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#10B981' }}>
            {earnedRewards ? Number(formatUnits(earnedRewards, 6)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'} USDC
          </div>
        </div>

        <div style={{
          background: theme.modalBackground,
          borderRadius: 12,
          padding: 16,
          border: `1px solid ${theme.darkBorder}`,
        }}>
          <div style={{ fontSize: 12, color: theme.secondaryText, marginBottom: 4 }}>
            Total Staked
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: theme.primaryText }}>
            {totalStaked ? Number(formatUnits(totalStaked, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'} FVC
          </div>
        </div>
      </div>

      {/* Stake Section */}
      <div style={{
        background: theme.modalBackground,
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        border: `1px solid ${theme.darkBorder}`,
      }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Stake FVC</div>
        
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <input
            type="number"
            placeholder="0.0"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: 12,
              border: `1px solid ${theme.darkBorder}`,
              background: theme.modalBackground,
              color: theme.primaryText,
              fontSize: 18,
              fontWeight: 600,
              fontFamily: 'Inter, sans-serif',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={setMaxStake}
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              background: theme.generalButton,
              color: '#000000',
              border: 'none',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            MAX
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleApprove}
            disabled={isApproving || !stakeAmount}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: 12,
              border: 'none',
              background: isApproving || !stakeAmount ? theme.darkBorder : theme.generalButton,
              color: theme.buttonText,
              fontSize: 16,
              fontWeight: 600,
              cursor: isApproving || !stakeAmount ? 'not-allowed' : 'pointer',
              fontFamily: 'Inter, sans-serif',
              opacity: isApproving || !stakeAmount ? 0.5 : 1,
            }}
          >
            {isApproving ? 'Approving...' : '1. Approve'}
          </button>
          <button
            onClick={handleStake}
            disabled={isStaking || !stakeAmount}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: 12,
              border: 'none',
              background: isStaking || !stakeAmount ? theme.darkBorder : theme.generalButton,
              color: theme.buttonText,
              fontSize: 16,
              fontWeight: 600,
              cursor: isStaking || !stakeAmount ? 'not-allowed' : 'pointer',
              fontFamily: 'Inter, sans-serif',
              opacity: isStaking || !stakeAmount ? 0.5 : 1,
            }}
          >
            {isStaking ? 'Staking...' : '2. Stake'}
          </button>
        </div>
      </div>

      {/* Withdraw Section */}
      <div style={{
        background: theme.modalBackground,
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        border: `1px solid ${theme.darkBorder}`,
      }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Withdraw FVC</div>
        
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <input
            type="number"
            placeholder="0.0"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: 12,
              border: `1px solid ${theme.darkBorder}`,
              background: theme.modalBackground,
              color: theme.primaryText,
              fontSize: 18,
              fontWeight: 600,
              fontFamily: 'Inter, sans-serif',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={setMaxWithdraw}
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              background: theme.generalButton,
              color: '#000000',
              border: 'none',
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            MAX
          </button>
        </div>

        <button
          onClick={handleWithdraw}
          disabled={isWithdrawing || !withdrawAmount}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 12,
            border: `1px solid ${theme.darkBorder}`,
            background: 'transparent',
            color: theme.primaryText,
            fontSize: 16,
            fontWeight: 600,
            cursor: isWithdrawing || !withdrawAmount ? 'not-allowed' : 'pointer',
            fontFamily: 'Inter, sans-serif',
            opacity: isWithdrawing || !withdrawAmount ? 0.5 : 1,
          }}
        >
          {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
        </button>
      </div>

      {/* Claim Rewards */}
      <button
        onClick={handleClaim}
        disabled={isClaiming || !earnedRewards || earnedRewards === 0n}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: 12,
          border: 'none',
          background: isClaiming || !earnedRewards || earnedRewards === 0n ? theme.darkBorder : '#10B981',
          color: '#FFFFFF',
          fontSize: 16,
          fontWeight: 700,
          cursor: isClaiming || !earnedRewards || earnedRewards === 0n ? 'not-allowed' : 'pointer',
          fontFamily: 'Inter, sans-serif',
          opacity: isClaiming || !earnedRewards || earnedRewards === 0n ? 0.5 : 1,
        }}
      >
        {isClaiming ? 'Claiming...' : 'Claim USDC Rewards'}
      </button>
    </div>
  );
};

export default StakingCard;
