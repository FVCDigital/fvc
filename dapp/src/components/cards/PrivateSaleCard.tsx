import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { theme } from '@/constants/theme';
import { parseUnits, formatUnits } from 'viem';
import { PRIVATE_SEEDING_CONFIG } from '@/contracts/bonding';
import { BaseCardProps } from '@/types';

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
  const [currentDiscount, setCurrentDiscount] = useState(20);
  const [currentMilestone, setCurrentMilestone] = useState(0);
  
  // Calculate progress and current milestone
  useEffect(() => {
    const progress = (totalBonded / parseFloat(PRIVATE_SEEDING_CONFIG.epochCap)) * 100;
    
    // Find current milestone based on progress
    for (let i = PRIVATE_SEEDING_CONFIG.milestones.length - 1; i >= 0; i--) {
      const milestone = PRIVATE_SEEDING_CONFIG.milestones[i];
      if (totalBonded >= parseFloat(milestone.usdcSold)) {
        setCurrentMilestone(i);
        setCurrentDiscount(milestone.discount);
        break;
      }
    }
  }, [totalBonded]);

  // Calculate FVC amount based on current discount
  const calculateFVCAmount = (usdcAmount: string) => {
    if (!usdcAmount || parseFloat(usdcAmount) <= 0) return '0';
    
    const usdcValue = parseFloat(usdcAmount);
    const discountMultiplier = (100 - currentDiscount) / 100;
    const fvcAmount = usdcValue / discountMultiplier;
    
    return fvcAmount.toFixed(2);
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
                Current Discount: {currentDiscount}%
              </div>
              <div style={{ fontSize: 14, color: theme.secondaryText }}>
                {PRIVATE_SEEDING_CONFIG.milestones[currentMilestone]?.name}
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
              {currentDiscount}% OFF
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
              <span style={{ color: theme.secondaryText }}>Discount applied:</span>
              <span style={{ color: theme.modalButton, fontWeight: 600 }}>
                {currentDiscount}%
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

      {/* Vesting Information */}
      <div style={{
        background: theme.cardHover,
        padding: 20,
        borderRadius: 12,
        border: `1px solid ${theme.darkBorder}`,
      }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: theme.primaryText }}>
          Vesting Schedule
        </h3>
        <div style={{ fontSize: 14, color: theme.secondaryText, lineHeight: 1.6 }}>
          <div style={{ marginBottom: 8 }}>
            • <strong>Lock Period:</strong> 12-month cliff (no tokens unlock)
          </div>
          <div style={{ marginBottom: 8 }}>
            • <strong>Vesting Period:</strong> 24-month linear release after cliff
          </div>
          <div style={{ marginBottom: 8 }}>
            • <strong>Total Duration:</strong> 36 months from investment
          </div>
          <div>
            • <strong>Early Unlock:</strong> Not available
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivateSaleCard;
