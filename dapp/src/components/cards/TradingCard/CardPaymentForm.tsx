import React from 'react';
import { theme } from '@/constants/theme';

const interFont: React.CSSProperties = { fontFamily: 'Inter, sans-serif' };

const CardPaymentForm: React.FC<{
  cardNumber: string,
  setCardNumber: (v: string) => void,
  expiry: string,
  setExpiry: (v: string) => void,
  cvc: string,
  setCvc: (v: string) => void
}> = ({ cardNumber, setCardNumber, expiry, setExpiry, cvc, setCvc }) => (
  <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'Inter, sans-serif' }}>
    <input
      type="text"
      placeholder="Card Number"
      value={cardNumber}
      onChange={e => setCardNumber(e.target.value)}
      style={{
        width: '100%',
        padding: '10px 12px',
        borderRadius: 8,
        border: `1px solid ${theme.modalButton}`,
        background: theme.appBackground,
        color: theme.primaryText,
        fontSize: 18,
        marginBottom: 8,
        boxSizing: 'border-box',
        fontFamily: 'Inter, sans-serif',
      }}
    />
    <div style={{ display: 'flex', gap: 8, width: '100%', marginBottom: 10, boxSizing: 'border-box' }}>
      <input
        type="text"
        placeholder="MM/YY"
        value={expiry}
        onChange={e => setExpiry(e.target.value)}
        style={{
          width: 'calc(50% - 4px)',
          padding: '10px 12px',
          borderRadius: 8,
          border: `1px solid ${theme.modalButton}`,
          background: theme.appBackground,
          color: theme.primaryText,
          fontSize: 18,
          boxSizing: 'border-box',
          fontFamily: 'Inter, sans-serif',
          height: '44px',
        }}
      />
      <input
        type="text"
        placeholder="CVC"
        value={cvc}
        onChange={e => setCvc(e.target.value)}
        style={{
          width: 'calc(50% - 4px)',
          padding: '10px 12px',
          borderRadius: 8,
          border: `1px solid ${theme.modalButton}`,
          background: theme.appBackground,
          color: theme.primaryText,
          fontSize: 18,
          boxSizing: 'border-box',
          fontFamily: 'Inter, sans-serif',
          height: '44px',
        }}
      />
    </div>
    <button
      type="button"
      disabled
      style={{
        width: '100%',
        padding: '12px 0',
        borderRadius: 8,
        background: theme.generalButton,
        color: theme.buttonText,
        fontWeight: 700,
        fontSize: 18,
        border: 'none',
        marginTop: 8,
        opacity: 0.6,
        cursor: 'not-allowed',
        ...interFont,
      }}
    >
      Pay (Coming Soon)
    </button>
  </div>
);

export default CardPaymentForm; 