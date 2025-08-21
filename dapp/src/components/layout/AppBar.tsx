import React from 'react';
import ConnectWalletButton from '@/components/wallet/ConnectWalletButton';
import { theme } from '@/constants/theme';
import { TabId } from '@/constants/tabs';

interface TabItem {
  id: TabId;
  label: string;
  icon?: React.ReactNode;
}

interface AppBarProps {
  isMobile?: boolean;
  onMenuToggle: () => void;
}

const AppBar: React.FC<AppBarProps> = ({ 
  isMobile = false, 
  onMenuToggle
}) => (
  <header
    className="w-full flex items-center justify-between py-4"
    style={{
      background: theme.modalBackground,
      borderBottom: `1px solid ${theme.modalButton}`,
      minHeight: 64,
      zIndex: 1001,
      position: 'relative',
      marginLeft: isMobile ? 0 : 280,
      width: isMobile ? '100%' : 'calc(100% - 280px)',
    }}
  >
    {/* Left side - Logo */}
    <div className="flex items-center">
      <div
        className="text-xl font-bold tracking-tight"
        style={{
          color: theme.primaryText,
          fontFamily: 'Inter',
          marginLeft: isMobile ? 16 : 48,
        }}
      >
        FVC
      </div>
    </div>
    
    {/* Right side - Wallet Only (Desktop) or Wallet + Burger Menu (Mobile) */}
    <div className="flex items-center gap-4">
      <ConnectWalletButton />
      {isMobile && (
        <button
          onClick={onMenuToggle}
          style={{
            background: 'none',
            border: 'none',
            color: theme.primaryText,
            cursor: 'pointer',
            padding: '12px',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}
          aria-label="Open menu"
        >
          <span style={{ fontSize: 20, fontWeight: 'bold' }}>☰</span>
        </button>
      )}
    </div>
  </header>
);

export default AppBar; 