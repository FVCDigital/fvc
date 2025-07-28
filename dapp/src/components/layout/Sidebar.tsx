import React from 'react';
import { theme } from '@/constants/theme';
import { FaDiscord, FaTelegram, FaXTwitter } from 'react-icons/fa6';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'bonding', label: 'Bonding' },
    { id: 'buy', label: 'Buy FVC' },
    { id: 'staking', label: 'Staking' },
    { id: 'governance', label: 'Governance' },
    { id: 'roadmap', label: 'Roadmap' },
  ];

  const socialLinks = [
    { name: 'Discord', icon: <FaDiscord size={18} />, url: 'https://discord.gg/fvc' },
    { name: 'X', icon: <FaXTwitter size={18} />, url: 'https://x.com/fvcprotocol' },
    { name: 'Telegram', icon: <FaTelegram size={18} />, url: 'https://t.me/fvcprotocol' },
  ];

  return (
    <div style={{
      position: 'fixed',
      left: 0,
      top: 0,
      bottom: 0,
      width: 280,
      background: theme.modalBackground,
      borderRight: `1px solid ${theme.modalButton}`,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      fontFamily: 'Inter, sans-serif',
    }}>
      {/* FVC Logo */}
      <div style={{
        padding: '32px 24px',
        borderBottom: `1px solid ${theme.modalButton}`,
      }}>
        <div style={{
          fontSize: 24,
          fontWeight: 700,
          color: theme.primaryText,
          display: 'flex',
          alignItems: 'center',
        }}>
          FVC Protocol
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ flex: 1, padding: '24px 0' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: 8,
                background: 'rgba(255,255,255,0.05)',
                color: theme.secondaryText,
                textDecoration: 'none',
                fontSize: 18,
                transition: 'all 0.2s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(56,189,248,0.1)';
                e.currentTarget.style.color = theme.primaryText;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.color = theme.secondaryText;
              }}
            >
              {link.icon}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 