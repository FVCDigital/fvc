import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { theme } from '@/constants/theme';
import {
  STAKING_ADDRESS,
  FVC_ADDRESS,
  USDC_ADDRESS,
  FAUCET_ADDRESS,
  stakingRewardsABI,
  fvcABI,
  faucetABI,
} from '@/contracts/staking';

function formatTime(seconds: number): string {
  if (seconds === 0) return 'Now';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

const UnifiedStakingCard: React.FC = () => {
  const { address } = useAccount();
  const faucetConfigured = /^0x[a-fA-F0-9]{40}$/.test(String(FAUCET_ADDRESS || ''));
  const [stakeAmount, setStakeAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [apy, setApy] = useState(8.5); // Mock APY that "updates"

  // Read FVC balance
  const { data: fvcBalance } = useReadContract({
    address: FVC_ADDRESS,
    abi: fvcABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  // Read staked balance
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

  // Read faucet status
  const { data: claimStatus } = useReadContract({
    address: FAUCET_ADDRESS,
    abi: faucetABI,
    functionName: 'canClaim',
    args: address ? [address] : undefined,
    query: { enabled: !!address && faucetConfigured },
  });

  const { data: userInfo } = useReadContract({
    address: FAUCET_ADDRESS,
    abi: faucetABI,
    functionName: 'getUserInfo',
    args: address ? [address] : undefined,
    query: { enabled: !!address && faucetConfigured },
  });

  // Write contracts
  const { data: approveHash, writeContract: approve } = useWriteContract();
  const { isLoading: isApproving } = useWaitForTransactionReceipt({ hash: approveHash });

  const { data: stakeHash, writeContract: stake } = useWriteContract();
  const { isLoading: isStaking } = useWaitForTransactionReceipt({ hash: stakeHash });

  const { data: withdrawHash, writeContract: withdraw } = useWriteContract();
  const { isLoading: isWithdrawing } = useWaitForTransactionReceipt({ hash: withdrawHash });

  const { data: claimHash, writeContract: claim } = useWriteContract();
  const { isLoading: isClaiming } = useWaitForTransactionReceipt({ hash: claimHash });

  const { data: faucetHash, writeContract: faucetClaim } = useWriteContract();
  const { isLoading: isFaucetClaiming } = useWaitForTransactionReceipt({ hash: faucetHash });

  // Mock APY that "updates" based on underlying yields
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate APY fluctuation between 8-12% based on Aave/Compound returns
      const baseApy = 8.5;
      const variation = (Math.random() - 0.5) * 2; // -1 to 1
      setApy(Number((baseApy + variation).toFixed(2)));
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

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

  const handleClaimRewards = () => {
    if (!address) return;
    claim({
      address: STAKING_ADDRESS,
      abi: stakingRewardsABI,
      functionName: 'getReward',
    });
  };

  const handleFaucetClaim = () => {
    if (!address || !faucetConfigured) return;
    faucetClaim({
      address: FAUCET_ADDRESS,
      abi: faucetABI,
      functionName: 'claim',
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

  const canClaim = faucetConfigured ? (claimStatus?.[0] ?? false) : false;
  const remainingCooldown = faucetConfigured ? Number(claimStatus?.[1] ?? 0) : 0;
  const remainingClaims = faucetConfigured ? Number(claimStatus?.[2] ?? 0) : 0;
  const totalClaims = faucetConfigured ? Number(userInfo?.[0] ?? 0) : 0;
  const hasLowBalance = fvcBalance ? Number(formatUnits(fvcBalance, 18)) < 1000 : true;

  if (!address) {
    return (
      <div style={{
        background: theme.modalBackground,
        color: theme.primaryText,
        borderRadius: 16,
        padding: 32,
        border: `1px solid ${theme.darkBorder}`,
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>
          Stake FVC & Earn Rewards
        </div>
        <div style={{ fontSize: 14, color: theme.secondaryText, textAlign: 'center' }}>
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
      padding: 32,
      border: `1px solid ${theme.darkBorder}`,
      fontFamily: 'Inter, sans-serif',
      maxWidth: 800,
      width: '100%',
      margin: '0 auto',
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>
            Stake FVC & Earn Rewards
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            padding: '6px 12px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 700,
            color: '#FFFFFF',
          }}>
            {apy}% APY
          </div>
        </div>
        <div style={{ fontSize: 14, color: theme.secondaryText }}>
          Stake FVC tokens to earn proportional USDC rewards from treasury yields
        </div>
      </div>

      {/* Stats Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 12,
        marginBottom: 24,
      }}>
        <div style={{
          background: '#1A1A1A',
          borderRadius: 12,
          padding: 16,
          border: `1px solid ${theme.darkBorder}`,
        }}>
          <div style={{ fontSize: 11, color: theme.secondaryText, marginBottom: 4 }}>
            Your Balance
          </div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            {fvcBalance ? Number(formatUnits(fvcBalance, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'} FVC
          </div>
        </div>

        <div style={{
          background: '#1A1A1A',
          borderRadius: 12,
          padding: 16,
          border: `1px solid ${theme.darkBorder}`,
        }}>
          <div style={{ fontSize: 11, color: theme.secondaryText, marginBottom: 4 }}>
            Staked
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: theme.generalButton }}>
            {stakedBalance ? Number(formatUnits(stakedBalance, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'} FVC
          </div>
        </div>

        <div style={{
          background: '#1A1A1A',
          borderRadius: 12,
          padding: 16,
          border: `1px solid ${theme.darkBorder}`,
        }}>
          <div style={{ fontSize: 11, color: theme.secondaryText, marginBottom: 4 }}>
            Rewards
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#10B981' }}>
            {earnedRewards ? Number(formatUnits(earnedRewards, 6)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'} USDC
          </div>
        </div>

        <div style={{
          background: '#1A1A1A',
          borderRadius: 12,
          padding: 16,
          border: `1px solid ${theme.darkBorder}`,
        }}>
          <div style={{ fontSize: 11, color: theme.secondaryText, marginBottom: 4 }}>
            Total Staked
          </div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            {totalStaked ? Number(formatUnits(totalStaked, 18)).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'} FVC
          </div>
        </div>
      </div>

      {/* Faucet Section (if low balance) */}
      {faucetConfigured && hasLowBalance && remainingClaims > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(56,189,248,0.1) 0%, rgba(16,185,129,0.1) 100%)',
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
          border: `1px solid ${theme.generalButton}40`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                Get Testnet FVC
              </div>
              <div style={{ fontSize: 12, color: theme.secondaryText }}>
                {remainingClaims} claims remaining • {canClaim ? 'Ready now' : `Next claim in ${formatTime(remainingCooldown)}`}
              </div>
            </div>
            <button
              onClick={handleFaucetClaim}
              disabled={!faucetConfigured || !canClaim || isFaucetClaiming || remainingClaims === 0}
              style={{
                padding: '10px 20px',
                borderRadius: 10,
                border: 'none',
                background: !faucetConfigured || !canClaim || isFaucetClaiming || remainingClaims === 0 ? theme.darkBorder : theme.generalButton,
                color: '#000000',
                fontSize: 14,
                fontWeight: 700,
                cursor: !faucetConfigured || !canClaim || isFaucetClaiming || remainingClaims === 0 ? 'not-allowed' : 'pointer',
                opacity: !faucetConfigured || !canClaim || isFaucetClaiming || remainingClaims === 0 ? 0.5 : 1,
              }}
            >
              {isFaucetClaiming ? 'Claiming...' : 'Claim 10 FVC'}
            </button>
          </div>
        </div>
      )}

      {/* Stake Section */}
      <div style={{
        background: '#1A1A1A',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        border: `1px solid ${theme.darkBorder}`,
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Stake FVC</div>
        
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <input
            type="number"
            placeholder="0.0"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 10,
              border: `1px solid ${theme.darkBorder}`,
              background: theme.modalBackground,
              color: theme.primaryText,
              fontSize: 16,
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
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              background: theme.generalButton,
              color: '#000000',
              border: 'none',
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
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
              padding: '12px',
              borderRadius: 10,
              border: 'none',
              background: isApproving || !stakeAmount ? theme.darkBorder : '#8B5CF6',
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: 600,
              cursor: isApproving || !stakeAmount ? 'not-allowed' : 'pointer',
              opacity: isApproving || !stakeAmount ? 0.5 : 1,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!isApproving && stakeAmount) {
                e.currentTarget.style.background = '#7C3AED';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isApproving && stakeAmount) {
                e.currentTarget.style.background = '#8B5CF6';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            {isApproving ? 'Approving...' : 'Approve'}
          </button>
          <button
            onClick={handleStake}
            disabled={isStaking || !stakeAmount}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: 10,
              border: 'none',
              background: isStaking || !stakeAmount ? theme.darkBorder : theme.generalButton,
              color: '#000000',
              fontSize: 14,
              fontWeight: 600,
              cursor: isStaking || !stakeAmount ? 'not-allowed' : 'pointer',
              opacity: isStaking || !stakeAmount ? 0.5 : 1,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!isStaking && stakeAmount) {
                e.currentTarget.style.background = '#0EA5E9';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(56, 189, 248, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isStaking && stakeAmount) {
                e.currentTarget.style.background = theme.generalButton;
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            {isStaking ? 'Staking...' : 'Stake'}
          </button>
        </div>
      </div>

      {/* Withdraw Section */}
      <div style={{
        background: '#1A1A1A',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        border: `1px solid ${theme.darkBorder}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Withdraw FVC</div>
          <div style={{ fontSize: 12, color: theme.secondaryText }}>
            Staked: {stakedBalance ? Number(formatUnits(stakedBalance, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'} FVC
          </div>
        </div>
        
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <input
            type="number"
            placeholder="0.0"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 10,
              border: `1px solid ${theme.darkBorder}`,
              background: theme.modalBackground,
              color: theme.primaryText,
              fontSize: 16,
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
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              background: theme.generalButton,
              color: '#000000',
              border: 'none',
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
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
            padding: '12px',
            borderRadius: 10,
            border: 'none',
            background: isWithdrawing || !withdrawAmount ? theme.darkBorder : '#F59E0B',
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: 600,
            cursor: isWithdrawing || !withdrawAmount ? 'not-allowed' : 'pointer',
            opacity: isWithdrawing || !withdrawAmount ? 0.5 : 1,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!isWithdrawing && withdrawAmount) {
              e.currentTarget.style.background = '#D97706';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isWithdrawing && withdrawAmount) {
              e.currentTarget.style.background = '#F59E0B';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          {isWithdrawing ? 'Withdrawing...' : 'Withdraw'}
        </button>
      </div>

      {/* Claim Rewards */}
      <button
        onClick={handleClaimRewards}
        disabled={isClaiming || !earnedRewards || earnedRewards === 0n}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: 10,
          border: 'none',
          background: isClaiming || !earnedRewards || earnedRewards === 0n ? theme.darkBorder : '#10B981',
          color: '#FFFFFF',
          fontSize: 14,
          fontWeight: 700,
          cursor: isClaiming || !earnedRewards || earnedRewards === 0n ? 'not-allowed' : 'pointer',
          opacity: isClaiming || !earnedRewards || earnedRewards === 0n ? 0.5 : 1,
        }}
      >
        {isClaiming ? 'Claiming...' : 'Claim USDC Rewards'}
      </button>
    </div>
  );
};

export default UnifiedStakingCard;
