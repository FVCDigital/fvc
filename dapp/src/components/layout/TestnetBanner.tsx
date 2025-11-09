import React from 'react';

const TestnetBanner: React.FC = () => {
  return (
    <div style={{
      background: 'linear-gradient(90deg, #FCD34D 0%, #FBBF24 100%)',
      color: '#000000',
      padding: '8px 16px',
      textAlign: 'center',
      fontSize: 14,
      fontWeight: 600,
      fontFamily: 'Inter, sans-serif',
      borderBottom: '1px solid #F59E0B',
      position: 'fixed',
      top: 64,
      left: 280,
      right: 0,
      zIndex: 1000,
      boxSizing: 'border-box',
    }}>
      TESTNET: FVC Token is currently on Base Sepolia. Do not use real funds.
    </div>
  );
};

export default TestnetBanner;
