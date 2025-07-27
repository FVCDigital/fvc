import React from 'react';
import { theme } from '@/constants/theme';
import { FaDiscord, FaTelegram, FaXTwitter } from 'react-icons/fa6';
import { useRouter } from 'next/router';

const socials = [
  { icon: <FaDiscord size={20} />, label: 'Discord' },
  { icon: <FaXTwitter size={20} />, label: 'X' },
  { icon: <FaTelegram size={20} />, label: 'Telegram' },
];

const cardStyle: React.CSSProperties = {
  maxWidth: 420,
  width: '100%',
  borderRadius: 20,
  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  background: theme.modalBackground,
  padding: 36,
  margin: '0 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: 24,
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
  width: 56,
  height: 56,
  borderRadius: 16,
  background: 'none',
  marginBottom: 8,
  fontWeight: 700,
  fontSize: 24,
  color: theme.primaryText,
  letterSpacing: 2,
  fontFamily: 'Inter, sans-serif',
};

const titleStyle: React.CSSProperties = {
  fontWeight: 700, fontSize: 22, color: theme.primaryText, textAlign: 'center', fontFamily: 'Inter, sans-serif'
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 16, color: theme.secondaryText, textAlign: 'center', maxWidth: 340, fontFamily: 'Inter, sans-serif'
};

const buttonStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  background: theme.modalButton,
  color: theme.primaryText,
  fontWeight: 600,
  fontSize: 16,
  borderRadius: 8,
  padding: '14px 0',
  textAlign: 'center',
  textDecoration: 'none',
  marginTop: 8,
  boxShadow: '0 2px 8px rgba(56,189,248,0.08)',
  transition: 'background 0.2s',
  fontFamily: 'Inter, sans-serif',
  border: 'none',
  cursor: 'pointer',
};

const socialsStyle: React.CSSProperties = {
  display: 'flex', gap: 16, marginTop: 8
};

const disclaimerStyle: React.CSSProperties = {
  fontSize: 12, color: theme.secondaryText, textAlign: 'center', marginTop: 8, fontFamily: 'Inter, sans-serif'
};

const LandingModal: React.FC = () => {
  const router = useRouter();
  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <div style={logoStyle}>
          FVC
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          <div style={titleStyle}>Your Wallet. Your Vote. Your Venture Fund.</div>
          <div style={subtitleStyle}>
            Join the world’s first interest-free, community-governed protocol for startup funding.
          </div>
        </div>
        <button
          style={buttonStyle}
          onClick={() => router.push('/home')}
        >
          Get Started
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
                fontSize: 20,
                cursor: 'pointer',
                padding: 0,
                transition: 'color 0.2s',
              }}
              tabIndex={-1}
            >
              {icon}
            </button>
          ))}
        </div>
        <div style={disclaimerStyle}>
          FCA Disclaimer: This protocol is designed for FCA-compliant, community-governed venture funding. Participation may be subject to regulatory requirements in your jurisdiction.
        </div>
      </div>
    </div>
  );
};

export default LandingModal;