import React from 'react';
import { FaDiscord, FaTelegram, FaXTwitter, FaXmark } from 'react-icons/fa6';
import { BriefcaseBusiness, LayoutDashboard, Lock, Map as MapIcon, TrendingUp } from 'lucide-react';
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
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'vesting', label: 'Investor', icon: TrendingUp },
    { id: 'staking', label: 'Staking', icon: Lock },
    { id: 'portfolio', label: 'Portfolio', icon: BriefcaseBusiness },
    { id: 'roadmap', label: 'Roadmap', icon: MapIcon },
  ];

  const socialLinks = [
    { name: 'Discord', icon: <FaDiscord size={20} />, url: 'https://discord.gg/fvc' },
    { name: 'X', icon: <FaXTwitter size={20} />, url: 'https://x.com/fvcprotocol' },
    { name: 'Telegram', icon: <FaTelegram size={20} />, url: 'https://t.me/+5_EubY-5euBkNWI0' },
  ];

  const handleTabClick = (tabId: TabId) => {
    onTabChange(tabId);
    if (isMobile && onClose) {
      onClose();
    }
  };

  const SidebarContent = () => (
    <div className={cn(
      "fixed left-0 top-0 bottom-0 w-[280px] flex flex-col z-[1002] transition-transform duration-300 ease-in-out font-sans",
      "bg-black/60 backdrop-blur-2xl border-r border-white/5",
      isMobile && !isOpen ? "-translate-x-full" : "translate-x-0"
    )}>
      {/* Header with Logo */}
      <div className="p-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-brand/20 blur-xl rounded-full"></div>
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="h-10 w-auto relative z-10 rounded-xl"
            />
          </div>
          {!isMobile && (
            <div className="bg-brand/10 text-brand-soft border border-brand/45 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-[0.14em]">
              MAINNET
            </div>
          )}
        </div>
        {isMobile && onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-muted-foreground"
          >
            <FaXmark size={20} />
          </Button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex-1 px-4 py-6 space-y-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id as TabId)}
            className={cn(
              "w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden",
              activeTab === tab.id 
                ? "text-white bg-brand/[0.12] border border-brand/30 shadow-[inset_3px_0_0_#6A70E4]"
                : "text-[#8B8B93] border border-transparent hover:text-white hover:bg-white/[0.04]"
            )}
          >
            <tab.icon
              size={18}
              strokeWidth={1.75}
              className={cn(
                "relative z-10 transition-colors",
                activeTab === tab.id ? "text-brand-soft" : "text-[#8B8B93] group-hover:text-white"
              )}
            />
            <span className="relative z-10 font-space tracking-wide">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Social Links */}
      <div className="p-6 m-4 rounded-2xl bg-white/5 border border-white/5">
        <div className="text-[10px] text-gray-500 mb-4 font-bold uppercase tracking-[0.2em]">
          Community
        </div>
        <div className="flex justify-between">
          {socialLinks.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-brand/10"
            >
              {link.icon}
            </a>
          ))}
        </div>
        
        {/* Version Info */}
        <div className="mt-4 pt-4 border-t border-white/5 text-[10px] text-gray-600 text-center font-mono">
          v1.0.0
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
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1001] animate-in fade-in duration-200"
          />
        )}
        <SidebarContent />
      </>
    );
  }

  return <SidebarContent />;
};

export default Sidebar;
