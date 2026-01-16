import React from 'react';
import { theme } from '../assets/css/shadstrap.min.css';
import { TokenLogoWithBadge } from './TokenLogoWithBadge';

const interFont: React.CSSProperties = { fontFamily: 'Inter, sans-serif' };

const AssetSelector: React.FC<{ assets: any[], selectedAsset: any, setSelectedAsset: (a: any) => void }> = ({ assets, selectedAsset, setSelectedAsset }) => (
  <div style={{ display: 'flex', gap: 12, width: '100%', justifyContent: 'center', marginBottom: 10 }}>
    {assets.map((asset) => (
      <button
        key={asset.symbol}
        type="button"
        onClick={() => setSelectedAsset(asset)}
        style={{
          minWidth: 60,
          padding: '8px 10px',
          borderRadius: 14,
          border: selectedAsset.symbol === asset.symbol ? `2px solid ${theme.generalButton}` : `1.5px solid ${theme.modalButton}`,
          background: selectedAsset.symbol === asset.symbol ? theme.generalButton : theme.appBackground,
          color: selectedAsset.symbol === asset.symbol ? theme.buttonText : theme.primaryText,
          fontWeight: 700,
          fontSize: 16,
          letterSpacing: 1,
          cursor: 'pointer',
          boxShadow: selectedAsset.symbol === asset.symbol ? '0 2px 8px rgba(56,189,248,0.10)' : 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          transition: 'border 0.15s, background 0.15s',
          ...interFont,
        }}
      >
        <TokenLogoWithBadge token={asset.symbol as 'ETH' | 'USDC' | 'POL'} size={24} />
        {asset.symbol}
      </button>
    ))}
  </div>
);

export default AssetSelector; 