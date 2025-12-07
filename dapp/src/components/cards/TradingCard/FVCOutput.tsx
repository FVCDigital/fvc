import React from 'react';
import { cn } from '@/lib/utils';

const FVCOutput: React.FC<{ fvcAmount: string, currentDiscount: number }> = ({ fvcAmount, currentDiscount }) => (
  <div className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground text-lg font-medium h-12 flex items-center shadow-sm">
    {fvcAmount ? `${fvcAmount} FVC (${currentDiscount}% discount)` : `FVC (${currentDiscount}% discount)`}
  </div>
);

export default FVCOutput;
