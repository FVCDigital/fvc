import React from 'react';
import { FaBars } from 'react-icons/fa6';
import ConnectWalletButton from '@/components/wallet/ConnectWalletButton';
import { theme } from '@/constants/theme';

interface AppBarProps {
  isMobile?: boolean;
  onMenuClick?: () => void;
}

const AppBar: React.FC<AppBarProps> = ({ isMobile = false, onMenuClick }) => (
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
    <div className="flex items-center">
      {isMobile && onMenuClick && (
        <button
          onClick={onMenuClick}
          style={{
            background: 'none',
            border: 'none',
            color: theme.primaryText,
            cursor: 'pointer',
            padding: '8px',
            borderRadius: 4,
            marginRight: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <FaBars size={20} />
        </button>
      )}
      <div
        className="text-xl font-bold tracking-tight"
        style={{
          color: theme.primaryText,
          fontFamily: 'Inter',
          marginLeft: isMobile ? 0 : 48,
        }}
      >
        FVC
      </div>
    </div>
    <div className="flex items-center">
      <ConnectWalletButton />
    </div>
  </header>
);

export default AppBar; 