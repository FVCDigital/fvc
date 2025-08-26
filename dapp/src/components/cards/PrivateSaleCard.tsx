import React, { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { theme } from '@/constants/theme';
import { parseUnits, formatUnits } from 'viem';
import { PRIVATE_SEEDING_CONFIG } from '../../../contracts/bonding';
import { BaseCardProps } from '@/types';
import FVCAllocationChart from './FVCAllocationChart/FVCAllocationChart';
import { CONTRACTS } from '@/utils/contracts/bondingContract';

interface PrivateSaleCardProps extends BaseCardProps {
  className?: string;
}

const PrivateSaleCard: React.FC<PrivateSaleCardProps> = ({ className = '' }) => {
  const { address } = useAccount();
  const [usdcAmount, setUsdcAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Mock data - replace with real contract calls
  const [totalBonded, setTotalBonded] = useState(0);
  const [currentMilestone, setCurrentMilestone] = useState(0);
  
  // USDC Balance
  const usdcBalance = useBalance({ 
    address: address as `0x${string}` | undefined,
    token: ('USDC' in CONTRACTS ? CONTRACTS.USDC : '0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e') as `0x${string}`,
    query: { enabled: !!address }
  });

  // Percentage buttons
  const percentButtons = [0, 50, 100];
  
  // Calculate progress and current milestone
  useEffect(() => {
    const progress = (totalBonded / parseFloat(PRIVATE_SEEDING_CONFIG.epochCap)) * 100;
    
    // Find current milestone based on progress
    for (let i = PRIVATE_SEEDING_CONFIG.milestones.length - 1; i >= 0; i--) {
      const milestone = PRIVATE_SEEDING_CONFIG.milestones[i];
      if (totalBonded >= parseFloat(milestone.usdcSold)) {
        setCurrentMilestone(i);
        break;
      }
    }
  }, [totalBonded]);

  // Get current milestone data
  const currentMilestoneData = PRIVATE_SEEDING_CONFIG.milestones[currentMilestone];
  const currentPrice = currentMilestoneData?.price || 0.025;

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
    if (!usdcBalance?.data) return;
    const value = (parseFloat(usdcBalance.data.formatted) * pct) / 100;
    setUsdcAmount(value.toString());
  };

  const fvcAmount = calculateFVCAmount(usdcAmount);

  const handleInvestment = async () => {
    if (!address) {
      alert('Please connect your wallet');
      return;
    }

    if (!usdcAmount || parseFloat(usdcAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (parseFloat(usdcAmount) > parseFloat(PRIVATE_SEEDING_CONFIG.walletCap)) {
      alert(`Maximum investment per wallet is ${parseFloat(PRIVATE_SEEDING_CONFIG.walletCap) / 1000000}M USDC`);
      return;
    }

    setIsProcessing(true);
    
    // Simulate processing time
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      setUsdcAmount('');
      
      // Update mock total bonded
      setTotalBonded(prev => prev + parseFloat(usdcAmount));
      
      // Reset success state after 3 seconds
      setTimeout(() => {
        setIsSuccess(false);
      }, 3000);
    }, 2000);
  };

  const progress = (totalBonded / parseFloat(PRIVATE_SEEDING_CONFIG.epochCap)) * 100;
  const nextMilestone = PRIVATE_SEEDING_CONFIG.milestones[currentMilestone + 1];
  const usdcToNextMilestone = nextMilestone ? parseFloat(nextMilestone.usdcSold) - totalBonded : 0;

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
          {PRIVATE_SEEDING_CONFIG.name}
        </h1>
        <p style={{ fontSize: 16, color: theme.secondaryText }}>
          Target: {parseFloat(PRIVATE_SEEDING_CONFIG.epochCap) / 1000000}M USDC • {parseFloat(PRIVATE_SEEDING_CONFIG.fvcAllocation) / 1000000}M FVC
        </p>
      </div>

      {/* Progress Section */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 14, color: theme.secondaryText }}>Progress</span>
          <span style={{ fontSize: 14, color: theme.primaryText }}>
            {formatUnits(parseUnits(totalBonded.toString(), 6), 6)} / {formatUnits(parseUnits(PRIVATE_SEEDING_CONFIG.epochCap, 6), 6)} USDC
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
            width: `${Math.min(progress, 100)}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${theme.accentGlow}, ${theme.modalButton})`,
            borderRadius: 6,
            transition: 'width 0.3s ease',
          }} />
        </div>
        
        {/* Current Status */}
        <div style={{
          background: theme.cardHover,
          padding: 20,
          borderRadius: 12,
          border: `1px solid ${theme.darkBorder}`,
          marginBottom: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: theme.primaryText }}>
                Current Price: {currentPrice.toFixed(4)} USDC/FVC
              </div>
              <div style={{ fontSize: 14, color: theme.secondaryText }}>
                {currentMilestoneData?.name}
              </div>
            </div>
                          <div style={{
                background: theme.modalButton,
                color: theme.primaryText,
                padding: '8px 16px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
              }}>
                ${currentPrice.toFixed(4)}
              </div>
          </div>
          
          {nextMilestone && (
            <div style={{ fontSize: 14, color: theme.secondaryText }}>
              Next tier at {formatUnits(parseUnits(nextMilestone.usdcSold, 6), 6)} USDC 
              ({usdcToNextMilestone > 0 ? `${formatUnits(parseUnits(usdcToNextMilestone.toString(), 6), 6)} USDC to go` : 'Milestone reached'})
            </div>
          )}
        </div>
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
              Balance: {usdcBalance?.isLoading ? '...' : usdcBalance?.data ? 
                `${Number(usdcBalance.data.formatted).toFixed(4)} USDC` : '0 USDC'}
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
          disabled={isProcessing || !usdcAmount || parseFloat(usdcAmount) <= 0}
          style={{
            width: '100%',
            padding: '14px 24px',
            background: isProcessing ? theme.darkBorder : theme.modalButton,
            color: theme.primaryText,
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          {isProcessing ? 'Processing...' : 'Invest Now'}
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
