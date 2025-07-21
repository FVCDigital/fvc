import React from 'react';
import { theme } from '@/constants/theme';

const interFont: React.CSSProperties = { fontFamily: 'Inter, sans-serif' };

const tabButtonStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: '12px 0',
  background: active ? theme.generalButton : theme.appBackground,
  color: active ? theme.buttonText : theme.primaryText,
  border: 'none',
  borderBottom: active ? `2px solid ${theme.modalButton}` : `2px solid transparent`,
  fontWeight: 600,
  fontSize: 16,
  cursor: 'pointer',
  ...interFont,
  transition: 'background 0.15s',
});

const TabSwitcher: React.FC<{ tab: 'wallet' | 'card', setTab: (tab: 'wallet' | 'card') => void }> = ({ tab, setTab }) => (
  <div style={{ display: 'flex', width: '100%', maxWidth: 340, marginBottom: 24, borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(56,189,248,0.04)' }}>
    <button style={tabButtonStyle(tab === 'wallet')} onClick={() => setTab('wallet')}>Wallet</button>
    <button style={tabButtonStyle(tab === 'card')} onClick={() => setTab('card')}>Card</button>
  </div>
);

export default TabSwitcher; 