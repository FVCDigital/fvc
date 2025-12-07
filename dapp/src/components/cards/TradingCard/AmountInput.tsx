import React from 'react';
import { formatUnits } from 'viem';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const percentButtons = [0, 50, 100];

interface AmountInputProps {
  input: string;
  setInput: (v: string) => void;
  balance: any;
  isLoading: boolean;
  selectedAsset: any;
  handlePercent: (pct: number) => void;
}

const AmountInput: React.FC<AmountInputProps> = ({ 
  input, 
  setInput, 
  balance, 
  isLoading, 
  selectedAsset, 
  handlePercent 
}) => (
  <div className="w-full mb-4">
    <Input
      type="number"
      min="0"
      value={input}
      onChange={e => setInput(e.target.value)}
      placeholder="Amount"
      className="h-12 text-lg font-semibold bg-background mb-2"
    />
    <div className="flex items-center justify-between w-full">
      <span className="text-xs text-muted-foreground">
        Balance: {isLoading ? '...' : balance?.data ? `${Number(balance.data.formatted).toFixed(4)} ${selectedAsset.symbol}` : '0'}
      </span>
      <div className="flex gap-1.5">
        {percentButtons.map(pct => (
          <Button
            key={pct}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handlePercent(pct)}
            className="h-6 px-2 text-[10px] font-bold min-w-[32px] hover:bg-primary/10 hover:text-primary text-muted-foreground"
          >
            {pct === 100 ? 'MAX' : `${pct}%`}
          </Button>
        ))}
      </div>
    </div>
  </div>
);

export default AmountInput;
