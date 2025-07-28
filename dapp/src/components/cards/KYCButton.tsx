import React from 'react';
import { theme } from '@/constants/theme';

interface KYCButtonProps {
  onClick: () => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

const KYCButton: React.FC<KYCButtonProps> = ({ onClick, children, style }) => (
  <button
    onClick={onClick}
    style={{
      background: theme.modalButton,
      color: theme.modalBackground,
      border: 'none',
      borderRadius: 8,
      padding: '12px 24px',
      fontSize: 16,
      fontWeight: 600,
      cursor: 'pointer',
      fontFamily: 'Inter, sans-serif',
      ...style,
    }}
  >
    {children || 'Verify KYC'}
  </button>
);

export default KYCButton; 