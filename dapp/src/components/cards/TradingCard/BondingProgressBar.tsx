import React from 'react';
import { theme } from '@/constants/theme';

const interFont: React.CSSProperties = { fontFamily: 'Inter, sans-serif' };

const BondingProgressBar: React.FC<{ progress: number }> = ({ progress }) => (
  <div style={{ width: '100%', maxWidth: 340, margin: '0 0 18px 0' }}>
    <div style={{ fontSize: 13, color: theme.secondaryText, marginBottom: 4, ...interFont }}>
      Bonding Round Progress
    </div>
    <div style={{ width: '100%', height: 10, background: theme.modalButton, borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
      <div style={{ width: `${progress * 100}%`, height: '100%', background: theme.generalButton, borderRadius: 6, transition: 'width 0.3s' }} />
    </div>
    <div style={{ fontSize: 12, color: theme.secondaryText, marginTop: 2, textAlign: 'right', ...interFont }}>
      {Math.round(progress * 100)}% sold
    </div>
  </div>
);

export default BondingProgressBar; 