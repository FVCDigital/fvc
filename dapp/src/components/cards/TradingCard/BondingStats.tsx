import React from 'react';
import { theme } from '@/constants/theme';
import { formatUnits } from 'viem';
import { useBondingContractFVCBalance } from '@/utils/contracts/bondingContract';

const interFont: React.CSSProperties = { fontFamily: 'Inter, sans-serif' };

interface BondingStatsProps {
  totalBonded: bigint;
  epochCap: bigint;
  currentDiscount: number;
  initialDiscount: number;
  fvcAllocated?: bigint; // Add actual FVC allocated from contract
  fvcSold?: bigint; // Add actual FVC sold from contract
  bondingContractBalance?: bigint; // Add actual bonding contract balance
}

const BondingStats: React.FC<BondingStatsProps> = ({ 
  totalBonded, 
  epochCap, 
  currentDiscount, 
  initialDiscount,
  fvcAllocated = 0n,
  fvcSold = 0n,
  bondingContractBalance = 0n
}) => {
  // Get actual bonding contract FVC balance
  const { bondingContractFVCBalance, isLoading: isLoadingBalance } = useBondingContractFVCBalance();
  
  // Calculate correct FVC remaining (allocated - sold)
  const fvcBought = fvcSold;
  const fvcRemaining = fvcAllocated - fvcSold; // Use allocated minus sold, not contract balance

  // Debug logging
  console.log('BondingStats Debug:');
  console.log('bondingContractFVCBalance:', bondingContractFVCBalance.toString());
  console.log('fvcSold:', fvcSold.toString());
  console.log('fvcAllocated:', fvcAllocated.toString());
  console.log('fvcBought:', fvcBought.toString());
  console.log('fvcRemaining:', fvcRemaining.toString());

  // Format numbers for display with fallbacks
  const fvcBoughtFormatted = fvcBought && typeof fvcBought === 'bigint' ? parseFloat(formatUnits(fvcBought, 18)).toLocaleString() : '0';
  const fvcRemainingFormatted = fvcRemaining && typeof fvcRemaining === 'bigint' ? parseFloat(formatUnits(fvcRemaining, 18)).toLocaleString() : '10,000,000';
  const fvcAllocatedFormatted = fvcAllocated && typeof fvcAllocated === 'bigint' ? parseFloat(formatUnits(fvcAllocated, 18)).toLocaleString() : '10,000,000';

  return (
    <div style={{
      background: 'rgba(56,189,248,0.05)',
      border: '1px solid rgba(56,189,248,0.2)',
      borderRadius: 12,
      padding: '16px',
      marginBottom: 16,
      width: '100%'
    }}>
      <h3 style={{
        fontSize: 16,
        fontWeight: 600,
        color: theme.primaryText,
        marginBottom: 12,
        textAlign: 'center',
        ...interFont
      }}>
        Round Statistics
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: theme.secondaryText, ...interFont }}>
            FVC Allocated:
          </span>
          <span style={{ fontSize: 14, fontWeight: 500, color: theme.primaryText, ...interFont }}>
            {fvcAllocatedFormatted} FVC
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: theme.secondaryText, ...interFont }}>
            FVC Bought:
          </span>
          <span style={{ fontSize: 14, fontWeight: 500, color: theme.primaryText, ...interFont }}>
            {fvcBoughtFormatted} FVC
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: theme.secondaryText, ...interFont }}>
            FVC Remaining:
          </span>
          <span style={{ fontSize: 14, fontWeight: 500, color: theme.primaryText, ...interFont }}>
            {isLoadingBalance ? 'Loading...' : fvcRemainingFormatted} FVC
          </span>
        </div>
      </div>
    </div>
  );
};

export default BondingStats; 