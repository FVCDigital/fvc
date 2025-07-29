import React from 'react';
import { theme } from '@/constants/theme';

const interFont: React.CSSProperties = { fontFamily: 'Inter, sans-serif' };
const percentButtons = [0, 50, 100];

const AmountInput: React.FC<{
  input: string,
  setInput: (v: string) => void,
  balance: any,
  isLoading: boolean,
  selectedAsset: any,
  handlePercent: (pct: number) => void
}> = ({ input, setInput, balance, isLoading, selectedAsset, handlePercent }) => (
  <div style={{ width: '100%', maxWidth: 340, marginBottom: 16 }}>
    <input
      type="number"
      min="0"
      value={input}
      onChange={e => setInput(e.target.value)}
      placeholder="Amount"
      style={{
        width: '100%',
        padding: '10px 14px',
        borderRadius: 10,
        border: `1.5px solid ${theme.modalButton}`,
        background: theme.appBackground,
        color: theme.primaryText,
        fontSize: 18,
        height: 44,
        outline: 'none',
        boxShadow: '0 1px 4px rgba(56,189,248,0.04)',
        transition: 'border 0.15s',
        boxSizing: 'border-box',
        marginBottom: 8,
        ...interFont,
      }}
    />
    <div style={{ width: '100%', maxWidth: 340, margin: '-8px 0 8px 0', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
      <span style={{ fontSize: 13, color: theme.secondaryText, ...interFont, flex: 1 }}>
        Balance: {isLoading ? '...' : balance?.data ? `${Number(balance.data.formatted).toFixed(4)} ${selectedAsset.symbol}` : '0'}
      </span>
      <div style={{ display: 'flex', justifyContent: 'flex-end', flex: 1 }}>
        {percentButtons.map(pct => (
          <button
            key={pct}
            type="button"
            onClick={() => handlePercent(pct)}
            style={{
              background: 'transparent',
              color: theme.secondaryText,
              border: '1px solid transparent',
              borderRadius: 5,
              padding: '2px 10px',
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
              height: 22,
              minWidth: 32,
              ...interFont,
            }}
          >
            {pct === 100 ? 'MAX' : `${pct}%`}
          </button>
        ))}
      </div>
    </div>
  </div>
);

export default AmountInput; 