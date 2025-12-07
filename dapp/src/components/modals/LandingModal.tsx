import React from 'react';
import { theme } from '@/constants/theme';
import { FaDiscord, FaTelegram, FaXTwitter } from 'react-icons/fa6';
import { useRouter } from 'next/router';

const socials = [
  { icon: <FaDiscord size={24} />, label: 'Discord' },
  { icon: <FaXTwitter size={24} />, label: 'X' },
  { icon: <FaTelegram size={24} />, label: 'Telegram' },
];

const cardStyle: React.CSSProperties = {
  maxWidth: 520,
  width: '100%',
  borderRadius: 24,
  boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 100px rgba(56,189,248,0.15)',
  background: theme.modalBackground,
  padding: 48,
  margin: '0 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: 28,
  alignItems: 'center',
  outline: `1px solid ${theme.modalButton}`,
  outlineOffset: 0,
  fontFamily: 'Inter, sans-serif',
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: theme.appBackground,
  minHeight: '100vh',
  minWidth: '100vw',
};

const logoStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 12,
};

const titleStyle: React.CSSProperties = {
  fontWeight: 800, 
  fontSize: 28, 
  color: theme.primaryText, 
  textAlign: 'center', 
  fontFamily: 'Inter, sans-serif',
  lineHeight: 1.3,
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 17, 
  color: theme.secondaryText, 
  textAlign: 'center', 
  maxWidth: 420, 
  fontFamily: 'Inter, sans-serif',
  lineHeight: 1.6,
};

const buttonStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  background: theme.gradientPrimary,
  color: '#FFFFFF',
  fontWeight: 700,
  fontSize: 18,
  borderRadius: 12,
  padding: '16px 0',
  textAlign: 'center',
  textDecoration: 'none',
  marginTop: 12,
  boxShadow: '0 4px 20px rgba(56,189,248,0.3)',
  transition: 'all 0.3s ease',
  fontFamily: 'Inter, sans-serif',
  border: 'none',
  cursor: 'pointer',
};

const socialsStyle: React.CSSProperties = {
  display: 'flex', 
  gap: 20, 
  marginTop: 12
};

const disclaimerStyle: React.CSSProperties = {
  fontSize: 13, 
  color: theme.secondaryText, 
  textAlign: 'center', 
  marginTop: 12, 
  fontFamily: 'Inter, sans-serif',
  lineHeight: 1.5,
  maxWidth: 440,
};

const LandingModal: React.FC = () => {
  const router = useRouter();
  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <div style={logoStyle}>
          <img 
            src="/logo.png" 
            alt="Logo" 
            style={{
              height: 80,
              width: 'auto',
              borderRadius: 16,
            }} 
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <div style={titleStyle}>Your Wallet. Your Vote.<br/>Your Venture Fund.</div>
          <div style={subtitleStyle}>
            Join the world's first interest-free, community-governed protocol for startup funding. Powered by transparent on-chain governance and sustainable treasury yields.
          </div>
        </div>
        <button
          style={buttonStyle}
          onClick={() => {
            window.location.hash = '#/dashboard';
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 30px rgba(56,189,248,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(56,189,248,0.3)';
          }}
        >
          Enter Protocol
        </button>
        <div style={socialsStyle}>
          {socials.map(({ icon, label }) => (
            <button
              key={label}
              aria-label={label}
              style={{
                background: 'none',
                border: 'none',
                color: theme.secondaryText,
                fontSize: 24,
                cursor: 'pointer',
                padding: 8,
                transition: 'all 0.2s ease',
                borderRadius: 8,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = theme.generalButton;
                e.currentTarget.style.background = theme.modalButton;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = theme.secondaryText;
                e.currentTarget.style.background = 'none';
              }}
              tabIndex={-1}
            >
              {icon}
            </button>
          ))}
        </div>
        <div style={disclaimerStyle}>
          <strong>Regulatory Notice:</strong> This protocol is designed for FCA-compliant, community-governed venture funding. Participation may be subject to regulatory requirements in your jurisdiction. Currently operating on testnet.
        </div>
      </div>
    </div>
  );
};

export default LandingModal;
