import React from 'react';
import ConnectWalletButton from '@/components/wallet/ConnectWalletButton';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface AppBarProps {
  isMobile?: boolean;
  onMenuToggle: () => void;
}

const AppBar: React.FC<AppBarProps> = ({ 
  isMobile = false, 
  onMenuToggle
}) => (
  <header
    className={cn(
      "fixed top-0 right-0 z-[1001] flex items-center justify-between py-4 border-b border-border bg-card/80 backdrop-blur-md",
      isMobile ? "left-0 px-4" : "left-[280px] px-12"
    )}
    style={{ minHeight: 64 }}
  >
    {/* Left side - Logo */}
    {!isMobile && (
      <div className="flex items-center gap-3 font-sans">
        <img 
          src="/logo.png" 
          alt="Logo" 
          className="h-10 w-auto rounded-xl"
        />
      </div>
    )}
    
    {/* Right side - Wallet (Desktop) or Wallet + Burger Menu (Mobile) */}
    <div className="flex items-center gap-4 ml-auto">
      <ConnectWalletButton />
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuToggle}
          className="text-foreground"
          aria-label="Open menu"
        >
          <span className="text-xl font-bold">☰</span>
        </Button>
      )}
    </div>
  </header>
);

export default AppBar;
