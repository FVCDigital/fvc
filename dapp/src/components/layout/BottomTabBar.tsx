import React from 'react';
import { theme } from '@/constants/theme';
import { TabId } from '@/constants/tabs';

interface TabItem {
  id: TabId;
  label: string;
  icon?: React.ReactNode;
}

interface BottomTabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  tabs: TabItem[];
}

const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab, onTabChange, tabs }) => {
  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: theme.modalBackground,
      borderTop: `1px solid ${theme.modalButton}`,
      padding: '12px 16px',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      zIndex: 1000,
      fontFamily: 'Inter, sans-serif',
    }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            padding: '8px 12px',
            borderRadius: 8,
            background: activeTab === tab.id ? 'rgba(56,189,248,0.1)' : 'transparent',
            color: activeTab === tab.id ? theme.primaryText : theme.secondaryText,
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: activeTab === tab.id ? 600 : 500,
            transition: 'all 0.2s ease',
            minWidth: 60,
          }}
        >
          <div style={{ fontSize: 20 }}>
            {tab.icon}
          </div>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
};

export default BottomTabBar; 