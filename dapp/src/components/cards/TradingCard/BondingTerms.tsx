import React from 'react';
import { theme } from '@/constants/theme';

const interFont: React.CSSProperties = { fontFamily: 'Inter, sans-serif' };

const BondingTerms: React.FC = () => (
  <div style={{
    background: 'rgba(56,189,248,0.1)',
    padding: '16px',
    borderRadius: 10,
    marginTop: 20,
    width: '100%',
    fontSize: 14,
    color: theme.secondaryText,
    lineHeight: 1.5,
    border: 'none',
    ...interFont,
  }}>
    <div style={{ fontWeight: 600, marginBottom: 8, color: theme.primaryText }}>
      Bonding Terms & Conditions
    </div>
    <ul style={{ margin: 0, paddingLeft: '16px' }}>
      <li>$FVC is sold at a discount (20% initial, decreasing to 10% over epoch).</li>
      <li>Target valuation: $0.80 - $0.90 per FVC in Round 1.</li>
      <li>Tokens are locked until the bonding round concludes.</li>
      <li>Max 1M FVC per wallet during bonding (0.1% of total supply).</li>
      <li>KYC required for all transactions.</li>
      <li>Discount decreases as epoch progresses (early buyers get better rates).</li>
      <li>See Litepaper for full details.</li>
    </ul>
  </div>
);

export default BondingTerms; 