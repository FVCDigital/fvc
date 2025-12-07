import React from 'react';
import { Progress } from '@/components/ui/progress';

const BondingProgressBar: React.FC<{ progress: number }> = ({ progress }) => (
  <div className="w-full mb-5">
    <div className="text-xs text-muted-foreground mb-1.5 font-medium">
      Bonding Round Progress
    </div>
    <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
      <div 
        className="h-full bg-primary transition-all duration-300 ease-in-out"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
    <div className="text-xs text-muted-foreground mt-1 text-right font-medium">
      {progress.toFixed(2)}% of round allocated
    </div>
  </div>
);

export default BondingProgressBar;
