import React, { useState, useEffect } from 'react';
import { useAccount, useBalance, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { theme } from '@/constants/theme';
import { parseUnits, formatUnits } from 'viem';
import { BaseCardProps } from '@/types';
import FVCAllocationChart from './FVCAllocationChart/FVCAllocationChart';
import { CONTRACTS, useAllMilestones, useCurrentMilestone, useSaleProgress, usePrivateSaleActive, BONDING_ABI, USDC_ABI } from '@/utils/contracts/bondingContract';

interface PrivateSaleCardProps extends BaseCardProps {
  className?: string;
}

const PrivateSaleCard: React.FC<PrivateSaleCardProps> = ({ className = '' }) => {
  const { address } = useAccount();
  const [usdcAmount, setUsdcAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Real contract data
  const { milestones, isLoading: milestonesLoading, refetch: refetchMilestones } = useAllMilestones();
  const { currentMilestone: currentMilestoneData, isLoading: currentMilestoneLoading, refetch: refetchCurrentMilestone } = useCurrentMilestone();
  const { saleProgress, isLoading: progressLoading, refetch: refetchSaleProgress } = useSaleProgress();
  const { isActive: privateSaleActive, isLoading: saleActiveLoading } = usePrivateSaleActive();
  
  // Contract interaction hooks
  const { writeContract: writeBonding, isPending: isBondingPending, data: bondingHash } = useWriteContract();
  const { writeContract: writeUSDC, isPending: isUSDCPending, data: usdcHash } = useWriteContract();
  
  // Wait for transaction receipts
  const { isLoading: isApprovalPending, isSuccess: isApprovalSuccess, isError: isApprovalError } = useWaitForTransactionReceipt({
    hash: usdcHash,
  });
  
  const { isLoading: isBondingPendingReceipt, isSuccess: isBondingSuccess, isError: isBondingError } = useWaitForTransactionReceipt({
    hash: bondingHash,
  });
  
  // USDC Balance
  const { data: usdcBalance, isLoading: usdcBalanceLoading, refetch: refetchUSDCBalance } = useBalance({ 
    address: address as `0x${string}` | undefined,
    token: ('USDC' in CONTRACTS ? CONTRACTS.USDC : CONTRACTS.MOCK_USDC) as `0x${string}`,
    query: { enabled: !!address }
  });

  // Percentage buttons
  const percentButtons = [0, 50, 100];
  
  // Extract data from contract responses
  // getSaleProgress returns a tuple: [progress, currentMilestoneIndex, totalBondedAmount, totalFVCSoldAmount]
  const totalBonded = saleProgress ? Number(formatUnits(saleProgress[2], 6)) : 0;
  const totalFVCSold = saleProgress ? Number(formatUnits(saleProgress[3], 18)) : 0;
  const currentMilestoneIndex = saleProgress ? Number(saleProgress[1]) : 0;
  const progress = saleProgress ? Number(saleProgress[0]) / 10000 : 0; // progress is in 4 decimal precision
  
  // Get current milestone data
  const currentPrice = currentMilestoneData ? Number(currentMilestoneData.price) / 1000 : 0.025;
  const currentMilestoneName = currentMilestoneData?.name || 'Early Bird';

  // Calculate FVC amount based on current milestone price
  const calculateFVCAmount = (usdcAmount: string) => {
    if (!usdcAmount || parseFloat(usdcAmount) <= 0) return '0';
    
    const usdcValue = parseFloat(usdcAmount);
    // FVC = USDC / price per FVC
    const fvcAmount = usdcValue / currentPrice;
    
    return fvcAmount.toFixed(2);
  };

  // Handle percentage button clicks
  const handlePercent = (pct: number) => {
    if (!usdcBalance) return;
    const value = (parseFloat(usdcBalance.formatted) * pct) / 100;
    setUsdcAmount(value.toString());
  };

  const fvcAmount = calculateFVCAmount(usdcAmount);

  // Find next milestone
  const nextMilestone = milestones && milestones.length > currentMilestoneIndex + 1 
    ? milestones[currentMilestoneIndex + 1] 
    : null;
  
  const usdcToNextMilestone = nextMilestone 
    ? Number(formatUnits(nextMilestone.usdcThreshold, 6)) - totalBonded 
    : 0;
  
  // Ensure we don't show the "Round Complete" milestone as next
  const displayNextMilestone = nextMilestone && Number(formatUnits(nextMilestone.fvcAllocation, 18)) > 0 ? nextMilestone : null;

  const handleInvestment = async () => {
    if (!address) {
      setError('Please connect your wallet');
      return;
    }

    if (!usdcAmount || parseFloat(usdcAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    // Check wallet cap (2M USDC)
    if (parseFloat(usdcAmount) > 2000000) {
      setError('Maximum investment per wallet is 2M USDC');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setIsSuccess(false);
    
    try {
      const usdcAmountBigInt = parseUnits(usdcAmount, 6);
      
      // First, approve USDC spending
      console.log('Approving USDC spending...');
      writeUSDC({
        address: ('USDC' in CONTRACTS ? CONTRACTS.USDC : CONTRACTS.MOCK_USDC) as `0x${string}`,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [CONTRACTS.BONDING as `0x${string}`, usdcAmountBigInt],
      });
      
    } catch (err) {
      console.error('Investment failed:', err);
      setError('Failed to initiate USDC approval. Please try again.');
      setIsProcessing(false);
    }
  };

  // Handle approval success and initiate bonding
  useEffect(() => {
    if (isApprovalSuccess && !isBondingPending && !bondingHash) {
      console.log('USDC approval successful, initiating bonding...');
      
      const usdcAmountBigInt = parseUnits(usdcAmount, 6);
      
      // Then, bond USDC for FVC
      writeBonding({
        address: CONTRACTS.BONDING as `0x${string}`,
        abi: BONDING_ABI,
        functionName: 'bond',
        args: [usdcAmountBigInt],
      });
    }
  }, [isApprovalSuccess, isBondingPending, bondingHash, usdcAmount]);

  // Handle approval error
  useEffect(() => {
    if (isApprovalError) {
      console.error('USDC approval failed');
      setError('USDC approval failed. Please try again.');
      setIsProcessing(false);
    }
  }, [isApprovalError]);

  // Handle bonding error
  useEffect(() => {
    if (isBondingError) {
      console.error('Bonding failed');
      setError('Bonding failed. Please try again.');
      setIsProcessing(false);
    }
  }, [isBondingError]);

  // Handle bonding success
  useEffect(() => {
    if (isBondingSuccess) {
      console.log('Bonding successful!');
      setIsSuccess(true);
      setUsdcAmount('');
      setIsProcessing(false);
      
      // Refresh contract data to show updated numbers
      setTimeout(() => {
        refetchSaleProgress();
        refetchCurrentMilestone();
        refetchMilestones();
        refetchUSDCBalance(); // Refresh USDC balance
      }, 2000); // Wait 2 seconds for blockchain to settle
      
      // Reset success state after 5 seconds
      setTimeout(() => {
        setIsSuccess(false);
      }, 5000);
    }
  }, [isBondingSuccess, refetchSaleProgress, refetchCurrentMilestone, refetchMilestones]);

  // Progressive loading - show interface immediately, load data progressively
  const isLoading = milestonesLoading || currentMilestoneLoading || progressLoading || saleActiveLoading;

  // Render disconnected state
  if (!address) {
    return (
      <div style={{
        background: theme.modalBackground,
        color: theme.primaryText,
        borderRadius: 16,
        padding: 28,
        fontWeight: 500,
        fontSize: 20,
        boxShadow: `0 4px 24px ${theme.accentGlow}`,
        margin: '16px auto',
        maxWidth: 800,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
        border: `1px solid ${theme.darkBorder}`,
        boxSizing: 'border-box',
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Private Sale</div>
        <div style={{ fontSize: 16, color: theme.secondaryText, textAlign: 'center' }}>
          Connect your wallet to participate in the private seeding round
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
      fontWeight: 500,
      fontSize: 20,
      boxShadow: `0 4px 24px ${theme.accentGlow}`,
      margin: '16px auto',
      maxWidth: 800,
      width: '100%',
      border: `1px solid ${theme.darkBorder}`,
      boxSizing: 'border-box',
      fontFamily: 'Inter, sans-serif',
      transition: 'all 0.2s ease',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8, color: theme.primaryText }}>
          Private Seeding Round
        </h1>
        <p style={{ fontSize: 16, color: theme.secondaryText }}>
          Target: 20M USDC • 225M FVC
        </p>
        
        {/* Subtle loading indicator */}
        {isLoading && (
          <div style={{ 
            marginTop: 16,
            padding: '8px 16px',
            background: theme.darkBorder,
            borderRadius: 20,
            fontSize: 12,
            color: theme.secondaryText,
            display: 'inline-block',
          }}>
            ⏳ Loading contract data...
          </div>
        )}
      </div>

      {/* Progress Section */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 14, color: theme.secondaryText }}>Progress</span>
          <span style={{ fontSize: 14, color: theme.primaryText }}>
            {progressLoading ? 'Loading...' : `${totalBonded.toLocaleString()} / 20,000,000 USDC`}
          </span>
        </div>
        <div style={{
          width: '100%',
          height: 12,
          background: theme.darkBorder,
          borderRadius: 6,
          overflow: 'hidden',
          marginBottom: 16,
        }}>
          <div style={{
            width: progressLoading ? '0%' : `${progress * 100}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${theme.accentGlow}, ${theme.accentGlow}80)`,
            borderRadius: 6,
            transition: 'width 0.3s ease',
          }} />
        </div>
        
        {/* Current Price and Milestone */}
        <div style={{
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 16,
          padding: '16px',
          background: theme.darkBorder,
          borderRadius: 8,
        }}>
            <div>
            <div style={{ fontSize: 14, color: theme.secondaryText, marginBottom: 4 }}>
              Current Price
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: theme.primaryText }}>
              {currentMilestoneLoading ? 'Loading...' : `$${currentPrice.toFixed(4)} USDC/FVC`}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, color: theme.secondaryText, marginBottom: 4 }}>
              {currentMilestoneLoading ? 'Loading...' : currentMilestoneName}
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: theme.accentGlow }}>
              {currentMilestoneLoading ? 'Loading...' : `$${currentPrice.toFixed(4)}`}
            </div>
          </div>
        </div>

        {/* Next Tier Info */}
        {milestonesLoading ? (
          <div style={{ 
            padding: '12px 16px',
            background: theme.darkBorder,
            borderRadius: 8,
            fontSize: 14,
            color: theme.secondaryText,
            textAlign: 'center',
          }}>
            Loading milestone data...
          </div>
        ) : displayNextMilestone && (
          <div style={{ 
            padding: '12px 16px',
            background: theme.darkBorder,
            borderRadius: 8,
            fontSize: 14,
            color: theme.secondaryText,
            textAlign: 'center',
          }}>
            Next tier at {Number(formatUnits(displayNextMilestone.fvcAllocation, 18)).toLocaleString()} FVC 
            ({usdcToNextMilestone.toLocaleString()} USDC to go)
          </div>
        )}
      </div>

      {/* Investment Form */}
      <div style={{
        background: theme.cardHover,
        padding: '24px',
        borderRadius: 12,
        border: `1px solid ${theme.darkBorder}`,
        marginBottom: 24,
        maxWidth: '100%',
        overflow: 'hidden',
      }}>
        <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20, color: theme.primaryText }}>
          Invest in Private Sale
        </h3>
        
        <div style={{ marginBottom: 20, width: '100%' }}>
          <label style={{ display: 'block', fontSize: 14, color: theme.secondaryText, marginBottom: 8 }}>
            USDC Amount
          </label>
          <input
            type="number"
            value={usdcAmount}
            onChange={(e) => setUsdcAmount(e.target.value)}
            placeholder="Amount"
            style={{
              width: '100%',
              minWidth: '200px',
              padding: '12px 16px',
              background: theme.modalBackground,
              border: `1px solid ${theme.darkBorder}`,
              borderRadius: 8,
              color: theme.primaryText,
              fontSize: 16,
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'Inter, sans-serif',
              transition: 'all 0.2s ease',
            }}
            onFocus={(e) => {
              e.target.style.border = `1px solid ${theme.modalButton}`;
              e.target.style.boxShadow = `0 0 0 3px ${theme.accentGlow}`;
            }}
            onBlur={(e) => {
              e.target.style.border = `1px solid ${theme.darkBorder}`;
              e.target.style.boxShadow = 'none';
            }}
          />
          
          {/* Balance and Percentage Buttons */}
          <div style={{ 
            width: '100%', 
            margin: '8px 0 0 0', 
            display: 'flex', 
            flexDirection: 'row', 
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ 
              fontSize: 13, 
              color: theme.secondaryText, 
              fontFamily: 'Inter, sans-serif', 
              flex: 1 
            }}>
              Balance: {usdcBalanceLoading ? 'Loading...' : usdcBalance ? 
                `${Number(usdcBalance.formatted).toFixed(4)} USDC` : '0 USDC'}
            </span>
            <div style={{ display: 'flex', justifyContent: 'flex-end', flex: 1, gap: 4 }}>
              {percentButtons.map(pct => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handlePercent(pct)}
                  style={{
                    background: 'transparent',
                    color: theme.secondaryText,
                    border: '1px solid transparent',
                    borderRadius: 5,
                    padding: '2px 10px',
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: 'pointer',
                    height: 22,
                    minWidth: 32,
                    fontFamily: 'Inter, sans-serif',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = theme.cardHover;
                    e.currentTarget.style.border = `1px solid ${theme.darkBorder}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.border = '1px solid transparent';
                  }}
                >
                  {pct === 100 ? 'MAX' : `${pct}%`}
                </button>
              ))}
            </div>
          </div>
          
          <div style={{ fontSize: 12, color: theme.secondaryText, marginTop: 4 }}>
            Max: 2M USDC per wallet
          </div>
        </div>

        {usdcAmount && parseFloat(usdcAmount) > 0 && (
          <div style={{
            background: theme.modalBackground,
            padding: 16,
            borderRadius: 8,
            border: `1px solid ${theme.darkBorder}`,
            marginBottom: 20,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: theme.secondaryText }}>You'll receive:</span>
              <span style={{ color: theme.primaryText, fontWeight: 600 }}>
                {fvcAmount} FVC
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <span style={{ color: theme.secondaryText }}>Price per FVC:</span>
              <span style={{ color: theme.modalButton, fontWeight: 600 }}>
                ${currentPrice.toFixed(4)}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={handleInvestment}
          disabled={isProcessing || isBondingPending || isUSDCPending || isApprovalPending || isBondingPendingReceipt || !usdcAmount || parseFloat(usdcAmount) <= 0}
          style={{
            width: '100%',
            padding: '14px 24px',
            background: isProcessing || isBondingPending || isUSDCPending || isApprovalPending || isBondingPendingReceipt ? theme.darkBorder : theme.modalButton,
            color: theme.primaryText,
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            cursor: isProcessing || isBondingPending || isUSDCPending || isApprovalPending || isBondingPendingReceipt ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Invest Now
        </button>

        {/* Transaction Status */}
        {(isProcessing || isBondingPending || isUSDCPending || isApprovalPending || isBondingPendingReceipt) && (
          <div style={{
            background: '#dbeafe',
            color: '#1e40af',
            padding: 16,
            borderRadius: 8,
            marginTop: 16,
            fontSize: 14,
            border: '1px solid #93c5fd',
          }}>
            {isApprovalPending && '⏳ Waiting for USDC approval confirmation...'}
            {isApprovalSuccess && isBondingPending && '⏳ USDC approved! Waiting for bonding transaction...'}
            {isBondingPendingReceipt && '⏳ Bonding transaction submitted! Waiting for confirmation...'}
            {!isApprovalPending && !isBondingPending && !isBondingPendingReceipt && '⏳ Processing...'}
          </div>
        )}

        {/* Error with Retry Button */}
        {error && (
          <div style={{
            background: '#fee2e2',
            color: '#dc2626',
            padding: 16,
            borderRadius: 8,
            marginTop: 16,
            fontSize: 14,
            border: '1px solid #fecaca',
          }}>
            <div style={{ marginBottom: 12 }}>{error}</div>
            <button
              onClick={() => {
                setError(null);
                setIsProcessing(false);
              }}
              style={{
                background: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                padding: '8px 16px',
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Manual Refresh Button */}
        <button
          onClick={() => {
            refetchSaleProgress();
            refetchCurrentMilestone();
            refetchMilestones();
            refetchUSDCBalance();
          }}
          style={{
            width: '100%',
            padding: '12px 24px',
            background: 'transparent',
            color: theme.secondaryText,
            border: `1px solid ${theme.darkBorder}`,
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            marginTop: 16,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = theme.cardHover;
            e.currentTarget.style.borderColor = theme.modalButton;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = theme.darkBorder;
          }}
        >
          🔄 Refresh Data
        </button>

        {isSuccess && (
          <div style={{
            background: theme.modalButton,
            color: theme.primaryText,
            padding: 16,
            borderRadius: 8,
            marginTop: 16,
            textAlign: 'center',
            fontSize: 14,
          }}>
            Investment successful! Your FVC tokens will be available after the vesting period.
          </div>
        )}
      </div>

      {/* Vesting Schedule Summary */}
      <div style={{ marginTop: 24, padding: 16, background: theme.modalBackground, borderRadius: 8, border: `1px solid ${theme.darkBorder}` }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 600, color: theme.primaryText }}>Vesting Schedule</h3>
        <div style={{ fontSize: 14, color: theme.secondaryText, lineHeight: 1.5 }}>
          <div style={{ marginBottom: 8 }}>
            <strong>Cliff Period:</strong> 12 months - No tokens released
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong>Vesting Period:</strong> 24 months - Linear release after cliff
          </div>
          <div style={{ fontSize: 12, color: theme.secondaryText, fontStyle: 'italic' }}>
            Total vesting duration: 36 months (12-month cliff + 24-month linear release)
          </div>
        </div>
      </div>

      {/* FVC Allocation Chart */}
      <div style={{ marginTop: 24 }}>
        <FVCAllocationChart />
      </div>
    </div>
  );
};

export default PrivateSaleCard;
