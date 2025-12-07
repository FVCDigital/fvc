import React from 'react';
import { FaDiscord, FaTelegram, FaXTwitter, FaXmark } from 'react-icons/fa6';
import { TabId } from '@/constants/tabs';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  onTabChange, 
  isMobile = false, 
  isOpen = false, 
  onClose 
}) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'staking', label: 'Staking', icon: '🔒' },
    { id: 'roadmap', label: 'Roadmap', icon: '🗺️' },
  ];

  const socialLinks = [
    { name: 'Discord', icon: <FaDiscord size={20} />, url: 'https://discord.gg/fvc' },
    { name: 'X', icon: <FaXTwitter size={20} />, url: 'https://x.com/fvcprotocol' },
    { name: 'Telegram', icon: <FaTelegram size={20} />, url: 'https://t.me/fvcprotocol' },
  ];

  const handleTabClick = (tabId: TabId) => {
    onTabChange(tabId);
    if (isMobile && onClose) {
      onClose();
    }
  };

  const SidebarContent = () => (
    <div className={cn(
      "fixed left-0 top-0 bottom-0 w-[280px] bg-card border-r border-border flex flex-col z-[1002] transition-transform duration-300 ease-in-out font-sans",
      isMobile && !isOpen ? "-translate-x-full" : "translate-x-0"
    )}>
      {/* Header with Logo and Mobile Close Button */}
      <div className="p-6 h-[80px] border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.png" 
            alt="Logo" 
            className="h-12 w-auto"
          />
          {!isMobile && (
            <div className="bg-gradient-to-r from-yellow-300 to-amber-400 text-black px-2.5 py-1 rounded-md text-[10px] font-bold font-sans w-fit">
              TESTNET
            </div>
          )}
        </div>
        {isMobile && onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-10 w-10 p-2 text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <FaXmark size={24} />
          </Button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex-1 py-6 overflow-y-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id as TabId)}
            className={cn(
              "w-full flex items-center gap-3 px-6 py-4 text-base font-medium transition-all duration-200 text-left border-l-[3px]",
              activeTab === tab.id 
                ? "bg-primary/10 text-primary border-primary font-semibold" 
                : "text-muted-foreground border-transparent hover:bg-primary/5 hover:text-foreground"
            )}
          >
            <span className="text-xl">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Social Links */}
      <div className="p-6 border-t border-border">
        <div className="text-xs text-muted-foreground mb-4 font-semibold uppercase tracking-widest">
          Community
        </div>
        <div className="flex gap-3">
          {socialLinks.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {link.icon}
            </a>
          ))}
        </div>
        
        {/* Version Info */}
        <div className="mt-5 text-[11px] text-muted-foreground text-center">
          v1.0.0-testnet
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        {/* Mobile Overlay with Blur */}
        {isOpen && (
          <div
            onClick={onClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[1001]"
          />
        )}
        <SidebarContent />
      </>
    );
  }

  return <SidebarContent />;
};

export default Sidebar;
