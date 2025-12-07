import React from 'react';
import { cn } from '@/lib/utils';
import { TokenLogoWithBadge } from './TokenLogoWithBadge';
import { Button } from '@/components/ui/button';

interface AssetSelectorProps {
  assets: any[];
  selectedAsset: any;
  setSelectedAsset: (a: any) => void;
}

const AssetSelector: React.FC<AssetSelectorProps> = ({ assets, selectedAsset, setSelectedAsset }) => (
  <div className="flex gap-3 w-full justify-center mb-4">
    {assets.map((asset) => (
      <Button
        key={asset.symbol}
        type="button"
        variant={selectedAsset.symbol === asset.symbol ? "default" : "outline"}
        onClick={() => setSelectedAsset(asset)}
        className={cn(
          "h-auto py-2 px-4 rounded-xl font-bold tracking-wide transition-all",
          selectedAsset.symbol === asset.symbol 
            ? "shadow-md scale-105" 
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <div className="flex items-center gap-2">
          <TokenLogoWithBadge token={asset.symbol as 'ETH' | 'USDC' | 'POL'} size={24} />
          {asset.symbol}
        </div>
      </Button>
    ))}
  </div>
);

export default AssetSelector;
