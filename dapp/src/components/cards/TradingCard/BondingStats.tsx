import React from 'react';
import { formatUnits } from 'viem';
import { useBondingContractFVCBalance } from '@/utils/contracts/bondingContract';
import { cn } from '@/lib/utils';

interface BondingStatsProps {
  totalBonded: bigint;
  epochCap: bigint;
  currentDiscount: number;
  initialDiscount: number;
  fvcAllocated?: bigint;
  fvcSold?: bigint;
  bondingContractBalance?: bigint;
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
  const { bondingContractFVCBalance, isLoading: isLoadingBalance } = useBondingContractFVCBalance();
  
  const fvcBought = fvcSold;
  const fvcRemaining = fvcAllocated - fvcSold;

  const fvcBoughtFormatted = fvcBought && typeof fvcBought === 'bigint' ? parseFloat(formatUnits(fvcBought, 18)).toLocaleString() : '0';
  const fvcRemainingFormatted = fvcRemaining && typeof fvcRemaining === 'bigint' ? parseFloat(formatUnits(fvcRemaining, 18)).toLocaleString() : '10,000,000';
  const fvcAllocatedFormatted = fvcAllocated && typeof fvcAllocated === 'bigint' ? parseFloat(formatUnits(fvcAllocated, 18)).toLocaleString() : '10,000,000';

  return (
    <div className="w-full bg-sky-500/5 border border-sky-500/20 rounded-xl p-4 mb-4">
      <h3 className="text-sm font-semibold text-foreground mb-3 text-center">
        Round Statistics
      </h3>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">FVC Allocated:</span>
          <span className="font-medium text-foreground">{fvcAllocatedFormatted} FVC</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">FVC Bought:</span>
          <span className="font-medium text-foreground">{fvcBoughtFormatted} FVC</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">FVC Remaining:</span>
          <span className="font-medium text-foreground">
            {isLoadingBalance ? 'Loading...' : fvcRemainingFormatted} FVC
          </span>
        </div>
      </div>
    </div>
  );
};

export default BondingStats;
