import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ConnectWalletButton: React.FC = () => {
  return (
    <div className="flex items-center justify-center px-3 py-1">
      <ConnectButton.Custom>
        {({
          account,
          chain,
          openAccountModal,
          openChainModal,
          openConnectModal,
          mounted,
        }) => {
          const ready = mounted;
          const connected = ready && account && chain;

          return (
            <div
              {...(!ready && {
                'aria-hidden': true,
                style: {
                  opacity: 0,
                  pointerEvents: 'none',
                  userSelect: 'none',
                },
              })}
            >
              {(() => {
                if (!connected) {
                  return (
                    <Button
                      onClick={openConnectModal}
                      variant="default"
                      size="sm"
                      className="font-semibold shadow-md"
                    >
                      Connect Wallet
                    </Button>
                  );
                }

                if (chain.unsupported) {
                  return (
                    <Button
                      onClick={openChainModal}
                      variant="destructive"
                      size="sm"
                      className="font-semibold shadow-md"
                    >
                      Wrong network
                    </Button>
                  );
                }

                return (
                  <div className="flex gap-2">
                    <Button
                      onClick={openChainModal}
                      variant="outline"
                      size="sm"
                      className="h-9 gap-1.5 px-3 bg-background/50 backdrop-blur-sm border-border hover:bg-muted"
                    >
                      {chain.hasIcon && (
                        <div
                          className="w-4 h-4 rounded-full overflow-hidden bg-muted"
                        >
                          {chain.iconUrl && (
                            <img
                              alt={chain.name ?? 'Chain icon'}
                              src={chain.iconUrl}
                              className="w-full h-full"
                            />
                          )}
                        </div>
                      )}
                      <span className="text-xs font-semibold">{chain.name}</span>
                    </Button>

                    <Button
                      onClick={openAccountModal}
                      variant="default"
                      size="sm"
                      className="h-9 font-semibold shadow-md"
                    >
                      {account.displayName}
                      {account.displayBalance
                        ? ` (${account.displayBalance})`
                        : ''}
                    </Button>
                  </div>
                );
              })()}
            </div>
          );
        }}
      </ConnectButton.Custom>
    </div>
  );
};

export default ConnectWalletButton;
