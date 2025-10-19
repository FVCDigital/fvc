import React from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { theme } from '@/constants/theme';
import { FAUCET_ADDRESS, faucetABI } from '@/contracts/staking';

function formatTime(seconds: number): string {
  if (seconds === 0) return 'Now';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

const FaucetCard: React.FC = () => {
  const { address } = useAccount();

  // Read user's claim status
  const { data: claimStatus } = useReadContract({
    address: FAUCET_ADDRESS,
    abi: faucetABI,
    functionName: 'canClaim',
    args: address ? [address] : undefined,
  });

  // Read user's claim info
  const { data: userInfo } = useReadContract({
    address: FAUCET_ADDRESS,
    abi: faucetABI,
    functionName: 'getUserInfo',
    args: address ? [address] : undefined,
  });

  // Write: claim FVC
  const { data: claimHash, writeContract: claim } = useWriteContract();
  const { isLoading: isClaiming } = useWaitForTransactionReceipt({ hash: claimHash });

  const handleClaim = () => {
    if (!address) return;
    claim({
      address: FAUCET_ADDRESS,
      abi: faucetABI,
      functionName: 'claim',
    });
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
          Testnet Faucet
        </div>
        <div style={{ fontSize: 16, color: theme.secondaryText, textAlign: 'center' }}>
          Connect your wallet to claim free testnet FVC
        </div>
      </div>
    );
  }

  const canClaim = claimStatus?.[0] ?? false;
  const remainingCooldown = Number(claimStatus?.[1] ?? 0);
  const remainingClaims = Number(claimStatus?.[2] ?? 0);
  const totalClaims = Number(userInfo?.[0] ?? 0);

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
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
          Testnet Faucet
        </div>
        <div style={{ fontSize: 14, color: theme.secondaryText }}>
          Get free testnet FVC to try staking. Each claim gives you 10,000 FVC.
        </div>
      </div>

      {/* Stats */}
      <div style={{
        background: theme.modalBackground,
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        border: `1px solid ${theme.darkBorder}`,
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 16,
        }}>
          <div>
            <div style={{ fontSize: 12, color: theme.secondaryText, marginBottom: 4 }}>
              Claims Used
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>
              {totalClaims} / 5
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: theme.secondaryText, marginBottom: 4 }}>
              Remaining Claims
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: theme.generalButton }}>
              {remainingClaims}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: theme.secondaryText, marginBottom: 4 }}>
              Next Claim
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: canClaim ? '#10B981' : theme.secondaryText }}>
              {canClaim ? 'Now' : formatTime(remainingCooldown)}
            </div>
          </div>
        </div>
      </div>

      {/* Claim Button */}
      <button
        onClick={handleClaim}
        disabled={!canClaim || isClaiming || remainingClaims === 0}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: 12,
          border: 'none',
          background: !canClaim || isClaiming || remainingClaims === 0 
            ? theme.darkBorder 
            : theme.generalButton,
          color: theme.buttonText,
          fontSize: 16,
          fontWeight: 700,
          cursor: !canClaim || isClaiming || remainingClaims === 0 ? 'not-allowed' : 'pointer',
          fontFamily: 'Inter, sans-serif',
          opacity: !canClaim || isClaiming || remainingClaims === 0 ? 0.5 : 1,
        }}
      >
        {isClaiming
          ? 'Claiming...'
          : remainingClaims === 0
          ? 'Max Claims Reached'
          : !canClaim
          ? `Cooldown Active (${formatTime(remainingCooldown)})`
          : 'Claim 10,000 FVC'}
      </button>

      {remainingClaims === 0 && (
        <div style={{
          marginTop: 16,
          padding: 16,
          background: theme.modalBackground,
          borderRadius: 12,
          border: `1px solid ${theme.darkBorder}`,
          fontSize: 14,
          color: theme.secondaryText,
          textAlign: 'center',
        }}>
          You've reached the maximum claims. Use your FVC to test staking below!
        </div>
      )}
    </div>
  );
};

export default FaucetCard;
