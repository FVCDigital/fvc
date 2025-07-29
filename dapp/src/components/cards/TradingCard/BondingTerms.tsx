import React from 'react';
import { theme } from '@/constants/theme';

const interFont: React.CSSProperties = { fontFamily: 'Inter, sans-serif' };

const BondingTerms: React.FC = () => (
  <div style={{
    background: theme.appBackground,
    color: theme.secondaryText,
    borderRadius: 8,
    padding: '16px 16px',
    fontSize: 13,
    marginTop: 20,
    width: '100%',
    maxWidth: 420,
    textAlign: 'left',
    border: `1px solid ${theme.modalButton}`,
    ...interFont,
  }}>
    <b>Bonding Terms & Conditions</b><br/>
    • $FVC is sold at a premium (0% initial, increasing to 20% over epoch).<br/>
    • Target valuation: $1.00 - $1.20 per FVC in Round 1.<br/>
    • 90-day vesting lock after purchase.<br/>
    • Max 8M FVC per wallet during bonding (1% of total supply).<br/>
    • KYC required for all transactions.<br/>
    • Premium increases as epoch progresses (early buyers get better rates).<br/>
    • See Litepaper for full details.
  </div>
);

export default BondingTerms; 