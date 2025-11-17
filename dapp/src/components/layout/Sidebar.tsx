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
      {/* Header with Logo and Mobile Close Button */}
      <div style={{
        padding: '32px 24px',
        borderBottom: `1px solid ${theme.modalButton}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <img 
            src="/logo.png" 
            alt="Logo" 
            style={{
              height: 48,
              width: 'auto',
            }} 
          />
          {!isMobile && (
            <div style={{
              background: 'linear-gradient(90deg, #FCD34D 0%, #FBBF24 100%)',
              color: '#000000',
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 10,
              fontWeight: 700,
              fontFamily: 'Inter, sans-serif',
              width: 'fit-content',
            }}>
              TESTNET
            </div>
          )}
        </div>
        {isMobile && onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: theme.primaryText,
              cursor: 'pointer',
              padding: 8,
              borderRadius: 8,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = theme.modalButton;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
            }}
          >
            <FaXmark size={24} />
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
              gap: 12,
              padding: '16px 24px',
              background: activeTab === tab.id ? 'rgba(56,189,248,0.1)' : 'transparent',
              color: activeTab === tab.id ? theme.primaryText : theme.secondaryText,
              border: 'none',
              borderLeft: activeTab === tab.id ? `3px solid ${theme.generalButton}` : '3px solid transparent',
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: activeTab === tab.id ? 600 : 500,
              transition: 'all 0.2s ease',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.background = 'rgba(56,189,248,0.05)';
                e.currentTarget.style.color = theme.primaryText;
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = theme.secondaryText;
              }
            }}
          >
            <span style={{ fontSize: 20 }}>{tab.icon}</span>
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
          fontSize: 12,
          color: theme.secondaryText,
          marginBottom: 16,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: 1,
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
                transition: 'all 0.2s ease',
                padding: 8,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = theme.primaryText;
                e.currentTarget.style.background = theme.modalButton;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = theme.secondaryText;
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {link.icon}
            </a>
          ))}
        </div>
        
        {/* Version Info */}
        <div style={{
          marginTop: 20,
          fontSize: 11,
          color: theme.secondaryText,
          textAlign: 'center',
        }}>
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
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)',
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
