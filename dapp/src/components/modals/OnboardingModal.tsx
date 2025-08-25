import React from 'react';
import { theme } from '@/constants/theme';
import { useConnectModal } from '@rainbow-me/rainbowkit';

interface OnboardingModalProps {
  title: string;
  desc: string;
  buttonLabel?: string;
  onAction?: () => void;
  isConnectStep?: boolean;
  extra?: React.ReactNode;
}

const cardStyle: React.CSSProperties = {
  maxWidth: 420,
  width: '100%',
  borderRadius: 20,
  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  background: theme.modalBackground,
  padding: 36,
  margin: '0 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: 24,
  alignItems: 'center',
  outline: `1px solid ${theme.darkBorder}`,
  outlineOffset: 0,
  transition: 'all 0.2s ease'
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.8)',
  minHeight: '100vh',
  minWidth: '100vw',
  backdropFilter: 'blur(8px)'
};

const titleStyle: React.CSSProperties = {
  fontWeight: 700, fontSize: 22, color: theme.primaryText, textAlign: 'center', marginBottom: 8
};

const descStyle: React.CSSProperties = {
  fontSize: 16, color: theme.secondaryText, textAlign: 'center', maxWidth: 340, marginBottom: 16
};

const buttonStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  background: theme.generalButton,
  color: theme.buttonText,
  fontWeight: 600,
  fontSize: 16,
  borderRadius: 8,
  padding: '14px 0',
  textAlign: 'center',
  textDecoration: 'none',
  marginTop: 8,
  boxShadow: '0 2px 8px rgba(56,189,248,0.08)',
  transition: 'background 0.2s',
  border: 'none',
  cursor: 'pointer',
};

const OnboardingModal: React.FC<OnboardingModalProps> = ({ title, desc, buttonLabel, onAction, isConnectStep, extra }) => {
  const { openConnectModal } = useConnectModal();
  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <div style={titleStyle}>{title}</div>
        <div style={descStyle}>{desc}</div>
        {buttonLabel && (
          <button
            type="button"
            style={buttonStyle}
            onClick={isConnectStep ? openConnectModal : onAction}
          >
            {buttonLabel}
          </button>
        )}
        {extra}
      </div>
    </div>
  );
};

export default OnboardingModal;