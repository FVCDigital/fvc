import React from 'react';
import { theme } from '@/constants/theme';
import { formatUnits } from 'viem';

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
  // Use actual contract data if available, otherwise fall back to theoretical calculation
  const fvcBought = fvcSold;
  const fvcRemaining = bondingContractBalance; // Use actual contract balance

  // Debug logging
  console.log('BondingStats Debug:');
  console.log('bondingContractBalance:', bondingContractBalance.toString());
  console.log('fvcSold:', fvcSold.toString());
  console.log('fvcBought:', fvcBought.toString());
  console.log('fvcRemaining:', fvcRemaining.toString());

  // Format numbers for display
  const fvcBoughtFormatted = parseFloat(formatUnits(fvcBought, 18)).toLocaleString();
  const fvcRemainingFormatted = parseFloat(formatUnits(fvcRemaining, 18)).toLocaleString();

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4" style={interFont}>
        Round Statistics
      </h3>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600" style={interFont}>
            FVC Bought:
          </span>
          <span className="text-sm font-medium text-gray-900" style={interFont}>
            {fvcBoughtFormatted} FVC
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600" style={interFont}>
            FVC Remaining:
          </span>
          <span className="text-sm font-medium text-gray-900" style={interFont}>
            {fvcRemainingFormatted} FVC
          </span>
        </div>
      </div>
    </div>
  );
};

export default BondingStats; 