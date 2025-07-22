import React from 'react';
import KYCButton from './KYCButton';

interface KYCPolygonIdCardProps {
  onClick: () => void;
  showKycModal: boolean;
  QrModal: React.ReactNode;
}

const KYCPolygonIdCard: React.FC<KYCPolygonIdCardProps> = ({ onClick, showKycModal, QrModal }) => (
  <div style={{
    width: '100%',
    maxWidth: 520,
    minHeight: 120,
    borderRadius: 20,
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    background: 'rgba(162,89,255,0.08)',
    margin: '0 auto 12px auto',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    border: 'none',
    outline: '2px solid #a259ff',
    fontFamily: 'Inter, sans-serif',
    padding: 0,
  }}>
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 20,
      padding: '32px 24px',
      height: '100%',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, flex: 1 }}>
        <span style={{ fontSize: 40, display: 'flex', alignItems: 'center' }}>🛡️</span>
        <div style={{ textAlign: 'left', fontFamily: 'Inter, sans-serif' }}>
          <div style={{ fontWeight: 700, fontSize: 22, color: '#a259ff', fontFamily: 'Inter, sans-serif', margin: 0 }}>KYC Required</div>
          <p style={{ fontSize: 16, color: '#7c3aed', margin: 0, marginTop: 4, fontFamily: 'Inter, sans-serif' }}>
            Complete KYC with Polygon ID to unlock all protocol features and earn <b>+10 reputation points</b>!
          </p>
        </div>
      </div>
      <KYCButton onClick={onClick}>Verify KYC</KYCButton>
    </div>
    {showKycModal && QrModal}
  </div>
);

export default KYCPolygonIdCard; 