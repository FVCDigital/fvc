import React from 'react';
import ConnectWalletButton from '@/components/wallet/ConnectWalletButton';
import { theme } from '@/constants/theme';

const AppBar: React.FC = () => (
  <header
    className="w-full flex items-center justify-between py-4"
    style={{
      background: theme.modalBackground,
      borderBottom: `1px solid ${theme.modalButton}`,
      minHeight: 64,
    }}
  >
    <div
      className="text-xl font-bold tracking-tight"
      style={{
        color: theme.primaryText,
        fontFamily: 'Inter',
        marginLeft: 48,
      }}
    >
      FVC Protocol
    </div>
    <div className="flex items-center">
      <ConnectWalletButton />
    </div>
  </header>
);

export default AppBar; 