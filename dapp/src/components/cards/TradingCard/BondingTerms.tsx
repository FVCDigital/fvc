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
    • $FVCG is sold at a discount (20% initial, decaying to 5% over 30 days).<br/>
    • 90-day vesting lock after purchase.<br/>
    • Max 1% of total supply per wallet during bonding.<br/>
    • KYC required via Polygon ID.<br/>
    • See Litepaper for full details.
  </div>
);

export default BondingTerms; 