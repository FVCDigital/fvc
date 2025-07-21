import React from 'react';
import { theme } from '@/constants/theme';

const interFont: React.CSSProperties = { fontFamily: 'Inter, sans-serif' };

const FVCGOutput: React.FC<{ fvcgAmount: string, currentDiscount: number }> = ({ fvcgAmount, currentDiscount }) => (
  <div style={{
    width: '100%',
    padding: '10px 14px',
    borderRadius: 10,
    border: `1.5px solid ${theme.modalButton}`,
    background: theme.appBackground,
    color: theme.primaryText,
    fontSize: 18,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    boxSizing: 'border-box',
    ...interFont,
  }}>
    {fvcgAmount ? `${fvcgAmount} FVCG (${currentDiscount}% discount)` : `FVCG (${currentDiscount}% discount)`}
  </div>
);

export default FVCGOutput; 