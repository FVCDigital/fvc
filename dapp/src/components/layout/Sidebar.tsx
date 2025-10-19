import React, { useState } from 'react';
import { theme } from '@/constants/theme';
import { FaDiscord, FaTelegram, FaXTwitter, FaXmark } from 'react-icons/fa6';
import { TabId } from '@/constants/tabs';

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
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'private-sale', label: 'Private Sale' },
    { id: 'staking', label: 'Staking' },
    { id: 'governance', label: 'Governance' },
    { id: 'roadmap', label: 'Roadmap' },
  ];

  const socialLinks = [
    { name: 'Discord', icon: <FaDiscord size={18} />, url: 'https://discord.gg/fvc' },
    { name: 'X', icon: <FaXTwitter size={18} />, url: 'https://x.com/fvcprotocol' },
    { name: 'Telegram', icon: <FaTelegram size={18} />, url: 'https://t.me/fvcprotocol' },
  ];

  const handleTabClick = (tabId: TabId) => {
    onTabChange(tabId);
    if (isMobile && onClose) {
      onClose();
    }
  };

  const sidebarContent = (
    <div style={{
      position: 'fixed',
      left: 0,
      top: 0,
      bottom: 0,
      width: 280,
      background: '#08090A',
      borderRight: `1px solid ${theme.modalButton}`,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1002,
      fontFamily: 'Inter, sans-serif',
      transform: isMobile && !isOpen ? 'translateX(-100%)' : 'translateX(0)',
      transition: 'transform 0.3s ease',
    }}>
      {/* Header with FVC Logo and Mobile Close Button */}
      <div style={{
        padding: '32px 24px',
        borderBottom: `1px solid ${theme.modalButton}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {!isMobile && (
          <div style={{
            fontSize: 24,
            fontWeight: 700,
            color: theme.primaryText,
            display: 'flex',
            alignItems: 'center',
          }}>
            FVC
          </div>
        )}
        {isMobile && onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: theme.primaryText,
              cursor: 'pointer',
              padding: 8,
              borderRadius: 4,
            }}
          >
            <FaXmark size={20} />
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div style={{ flex: 1, padding: '24px 0' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id as TabId)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              padding: '16px 24px',
              background: activeTab === tab.id ? 'rgba(56,189,248,0.1)' : 'transparent',
              color: activeTab === tab.id ? theme.primaryText : theme.secondaryText,
              border: 'none',
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: activeTab === tab.id ? 600 : 500,
              transition: 'all 0.2s ease',
              textAlign: 'left',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Social Links */}
      <div style={{
        padding: '24px',
        borderTop: `1px solid ${theme.modalButton}`,
      }}>
        <div style={{
          fontSize: 14,
          color: theme.secondaryText,
          marginBottom: 16,
          fontWeight: 600,
        }}>
          Community
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {socialLinks.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: theme.secondaryText,
                textDecoration: 'none',
                transition: 'color 0.2s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = theme.primaryText}
              onMouseLeave={(e) => e.currentTarget.style.color = theme.secondaryText}
            >
              {link.icon}
            </a>
          ))}
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
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(4px)',
              zIndex: 1001,
            }}
          />
        )}

        {/* Mobile Sidebar */}
        {sidebarContent}
      </>
    );
  }

  return sidebarContent;
};

export default Sidebar; 