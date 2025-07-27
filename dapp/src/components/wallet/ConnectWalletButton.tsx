import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { theme } from '@/constants/theme';

const ConnectWalletButton: React.FC = () => {
  return (
    <div
      className="flex items-center justify-center"
      style={{
        padding: '0.25rem 0.75rem',
      }}
    >
      <ConnectButton
        showBalance={false}
        accountStatus={{ smallScreen: 'avatar', largeScreen: 'avatar' }}
        chainStatus={{ smallScreen: 'icon', largeScreen: 'icon' }}
      />
    </div>
  );
};

export default ConnectWalletButton; 