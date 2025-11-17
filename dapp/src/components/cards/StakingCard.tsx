import React, { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { theme } from '@/constants/theme';
import {
  STAKING_ADDRESS,
  FVC_ADDRESS,
  stakingRewardsABI,
  fvcABI,
} from '@/contracts/staking';

const StakingCard: React.FC = () => {
  const { address } = useAccount();
  const [amount, setAmount] = useState('');
  const [isStakeMode, setIsStakeMode] = useState(true);

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

  const { data: approveHash, writeContract: approve } = useWriteContract();
  const { isLoading: isApproving } = useWaitForTransactionReceipt({ hash: approveHash });

  const { data: stakeHash, writeContract: stake } = useWriteContract();
  const { isLoading: isStaking } = useWaitForTransactionReceipt({ hash: stakeHash });

  const { data: withdrawHash, writeContract: withdraw } = useWriteContract();
  const { isLoading: isWithdrawing } = useWaitForTransactionReceipt({ hash: withdrawHash });

  const { data: claimHash, writeContract: claim } = useWriteContract();
  const { isLoading: isClaiming } = useWaitForTransactionReceipt({ hash: claimHash });

  const handleApprove = () => {
    if (!amount || !address) return;
    approve({
      address: FVC_ADDRESS,
      abi: fvcABI,
      functionName: 'approve',
      args: [STAKING_ADDRESS, parseUnits(amount, 18)],
    });
  };

  const handleStake = () => {
    if (!amount || !address) return;
    stake({
      address: STAKING_ADDRESS,
      abi: stakingRewardsABI,
      functionName: 'stake',
      args: [parseUnits(amount, 18)],
    });
  };

  const handleWithdraw = () => {
    if (!amount || !address) return;
    withdraw({
      address: STAKING_ADDRESS,
      abi: stakingRewardsABI,
      functionName: 'withdraw',
      args: [parseUnits(amount, 18)],
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

  const setMax = () => {
    const balance = isStakeMode ? fvcBalance : stakedBalance;
    if (balance) {
      setAmount(formatUnits(balance, 18));
    }
  };

  if (!address) {
    return (
      <div style={{
        background: theme.modalBackground,
        color: theme.primaryText,
        borderRadius: 16,
        padding: 32,
        boxShadow: `0 4px 24px ${theme.accentGlow}`,
        margin: '16px auto',
        maxWidth: 480,
        width: '100%',
        border: `1px solid ${theme.darkBorder}`,
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, textAlign: 'center' }}>
          Staking
        </div>
        <div style={{ fontSize: 14, color: theme.secondaryText, textAlign: 'center' }}>
          Connect wallet to stake
        </div>
      </div>
    );
  }

  const rewardsValue = earnedRewards ? Number(formatUnits(earnedRewards, 6)) : 0;
  const hasRewards = rewardsValue > 0;

  return (
    <div style={{
      background: theme.modalBackground,
      color: theme.primaryText,
      borderRadius: 16,
      padding: 24,
      boxShadow: `0 4px 24px ${theme.accentGlow}`,
      margin: '16px auto',
      maxWidth: 480,
      width: '100%',
      border: `1px solid ${theme.darkBorder}`,
      fontFamily: 'Inter, sans-serif',
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Staking</div>
        <div style={{ fontSize: 13, color: theme.secondaryText }}>
          Stake FVC to earn USDC rewards
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
        marginBottom: 20,
      }}>
        <div style={{
          background: `${theme.darkBorder}40`,
          borderRadius: 12,
          padding: 16,
        }}>
          <div style={{ fontSize: 11, color: theme.secondaryText, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Staked
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: theme.primaryText }}>
            {stakedBalance ? Number(formatUnits(stakedBalance, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0.00'}
          </div>
          <div style={{ fontSize: 11, color: theme.secondaryText, marginTop: 2 }}>FVC</div>
        </div>

        <div style={{
          background: `${theme.success}15`,
          borderRadius: 12,
          padding: 16,
          border: `1px solid ${theme.success}30`,
        }}>
          <div style={{ fontSize: 11, color: theme.secondaryText, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Rewards
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: theme.success }}>
            {rewardsValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
          </div>
          <div style={{ fontSize: 11, color: theme.secondaryText, marginTop: 2 }}>USDC</div>
        </div>
      </div>

      {/* Claim Button */}
      {hasRewards && (
        <button
          onClick={handleClaim}
          disabled={isClaiming}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 12,
            border: 'none',
            background: isClaiming ? theme.darkBorder : theme.success,
            color: '#FFFFFF',
            fontSize: 15,
            fontWeight: 600,
            cursor: isClaiming ? 'not-allowed' : 'pointer',
            fontFamily: 'Inter, sans-serif',
            opacity: isClaiming ? 0.6 : 1,
            marginBottom: 20,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!isClaiming) {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.opacity = '0.9';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.opacity = '1';
          }}
        >
          {isClaiming ? 'Claiming...' : `Claim ${rewardsValue.toFixed(2)} USDC`}
        </button>
      )}

      {/* Mode Toggle */}
      <div style={{
        display: 'flex',
        background: `${theme.darkBorder}40`,
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
      }}>
        <button
          onClick={() => setIsStakeMode(true)}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: 8,
            border: 'none',
            background: isStakeMode ? theme.generalButton : 'transparent',
            color: isStakeMode ? theme.buttonText : theme.secondaryText,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
            transition: 'all 0.2s ease',
          }}
        >
          Stake
        </button>
        <button
          onClick={() => setIsStakeMode(false)}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: 8,
            border: 'none',
            background: !isStakeMode ? theme.generalButton : 'transparent',
            color: !isStakeMode ? theme.buttonText : theme.secondaryText,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
            transition: 'all 0.2s ease',
          }}
        >
          Unstake
        </button>
      </div>

      {/* Input */}
      <div style={{
        background: `${theme.darkBorder}40`,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}>
          <div style={{ fontSize: 12, color: theme.secondaryText }}>
            {isStakeMode ? 'Amount to stake' : 'Amount to unstake'}
          </div>
          <div style={{ fontSize: 12, color: theme.secondaryText }}>
            Balance: {isStakeMode 
              ? (fvcBalance ? Number(formatUnits(fvcBalance, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0')
              : (stakedBalance ? Number(formatUnits(stakedBalance, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0')
            } FVC
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <input
            type="number"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 60px 12px 12px',
              borderRadius: 8,
              border: `1px solid ${theme.darkBorder}`,
              background: theme.modalBackground,
              color: theme.primaryText,
              fontSize: 20,
              fontWeight: 600,
              fontFamily: 'Inter, sans-serif',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <button
            onClick={setMax}
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              background: `${theme.generalButton}30`,
              color: theme.generalButton,
              border: 'none',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme.generalButton;
              e.currentTarget.style.color = theme.buttonText;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = `${theme.generalButton}30`;
              e.currentTarget.style.color = theme.generalButton;
            }}
          >
            MAX
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      {isStakeMode ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleApprove}
            disabled={isApproving || !amount}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: 12,
              border: 'none',
              background: isApproving || !amount ? theme.darkBorder : `${theme.generalButton}30`,
              color: isApproving || !amount ? theme.secondaryText : theme.generalButton,
              fontSize: 15,
              fontWeight: 600,
              cursor: isApproving || !amount ? 'not-allowed' : 'pointer',
              fontFamily: 'Inter, sans-serif',
              opacity: isApproving || !amount ? 0.5 : 1,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!isApproving && amount) {
                e.currentTarget.style.background = theme.generalButton;
                e.currentTarget.style.color = theme.buttonText;
              }
            }}
            onMouseLeave={(e) => {
              if (!isApproving && amount) {
                e.currentTarget.style.background = `${theme.generalButton}30`;
                e.currentTarget.style.color = theme.generalButton;
              }
            }}
          >
            {isApproving ? 'Approving...' : 'Approve'}
          </button>
          <button
            onClick={handleStake}
            disabled={isStaking || !amount}
            style={{
              flex: 1,
              padding: '14px',
              borderRadius: 12,
              border: 'none',
              background: isStaking || !amount ? theme.darkBorder : theme.generalButton,
              color: theme.buttonText,
              fontSize: 15,
              fontWeight: 600,
              cursor: isStaking || !amount ? 'not-allowed' : 'pointer',
              fontFamily: 'Inter, sans-serif',
              opacity: isStaking || !amount ? 0.5 : 1,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!isStaking && amount) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.opacity = '0.9';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.opacity = '1';
            }}
          >
            {isStaking ? 'Staking...' : 'Stake'}
          </button>
        </div>
      ) : (
        <button
          onClick={handleWithdraw}
          disabled={isWithdrawing || !amount}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 12,
            border: 'none',
            background: isWithdrawing || !amount ? theme.darkBorder : theme.generalButton,
            color: theme.buttonText,
            fontSize: 15,
            fontWeight: 600,
            cursor: isWithdrawing || !amount ? 'not-allowed' : 'pointer',
            fontFamily: 'Inter, sans-serif',
            opacity: isWithdrawing || !amount ? 0.5 : 1,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!isWithdrawing && amount) {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.opacity = '0.9';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.opacity = '1';
          }}
        >
          {isWithdrawing ? 'Unstaking...' : 'Unstake'}
        </button>
      )}
    </div>
  );
};

export default StakingCard;
