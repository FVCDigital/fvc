import React from 'react';

interface KYCButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const KYCButton: React.FC<KYCButtonProps> = ({ onClick, children, style }) => (
  <button
    onClick={onClick}
    style={{
      background: '#a259ff',
      color: '#fff',
      borderRadius: 8,
      padding: '10px 22px',
      fontWeight: 600,
      fontSize: 16,
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'Inter, sans-serif',
      ...style,
    }}
  >
    {children}
  </button>
);

export default KYCButton; 