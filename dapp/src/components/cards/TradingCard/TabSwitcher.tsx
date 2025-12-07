import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const TabSwitcher: React.FC<{ tab: 'wallet' | 'card', setTab: (tab: 'wallet' | 'card') => void }> = ({ tab, setTab }) => (
  <div className="flex w-full mb-6 bg-muted/30 p-1 rounded-xl">
    <Button 
      variant="ghost"
      onClick={() => setTab('wallet')}
      className={cn(
        "flex-1 font-semibold text-base transition-all rounded-lg",
        tab === 'wallet' 
          ? "bg-background shadow-sm text-foreground" 
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      Wallet
    </Button>
    <Button 
      variant="ghost"
      onClick={() => setTab('card')}
      className={cn(
        "flex-1 font-semibold text-base transition-all rounded-lg",
        tab === 'card' 
          ? "bg-background shadow-sm text-foreground" 
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      Card
    </Button>
  </div>
);

export default TabSwitcher;
