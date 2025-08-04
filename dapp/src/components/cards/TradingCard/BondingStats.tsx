import React from 'react';
import { theme } from '@/constants/theme';
import { formatUnits } from 'viem';

const interFont: React.CSSProperties = { fontFamily: 'Inter, sans-serif' };

interface BondingStatsProps {
  totalBonded: bigint;
  epochCap: bigint;
  currentDiscount: number;
}

const BondingStats: React.FC<BondingStatsProps> = ({ totalBonded, epochCap, currentDiscount }) => {
  // Calculate FVC tokens bought (with current discount)
  const fvcBought = totalBonded * BigInt(100 + currentDiscount) / BigInt(100) * BigInt(1e12);
  
  // Calculate total FVC that can be bought in this round (with average discount)
  const averageDiscount = 15; // Average of initial (20%) and final (10%) discount
  const totalFVCAvailable = epochCap * BigInt(100 + averageDiscount) / BigInt(100) * BigInt(1e12);
  
  // Calculate remaining FVC
  const fvcRemaining = totalFVCAvailable - fvcBought;

  // Format numbers for display
  const fvcBoughtFormatted = parseFloat(formatUnits(fvcBought, 18)).toLocaleString();
  const fvcRemainingFormatted = parseFloat(formatUnits(fvcRemaining, 18)).toLocaleString();

  return (
    <div style={{ 
      width: '100%', 
      maxWidth: 340, 
      margin: '0 0 18px 0',
      padding: '12px 16px',
      background: 'rgba(56,189,248,0.05)',
      borderRadius: 8,
      border: `1px solid ${theme.modalButton}`,
      ...interFont 
    }}>
      <div style={{ fontSize: 13, color: theme.secondaryText, marginBottom: 8 }}>
        Round Statistics
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: theme.secondaryText }}>FVC Bought:</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: theme.primaryText }}>
          {fvcBoughtFormatted} FVC
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: theme.secondaryText }}>FVC Remaining:</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: theme.primaryText }}>
          {fvcRemainingFormatted} FVC
        </span>
      </div>
    </div>
  );
};

export default BondingStats; 