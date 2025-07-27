import * as React from "react";
import Link from "next/link";
import { CenteredFlexCol } from '@/components/atomic/CenteredFlexCol';
import Card from '@/components/cards/BaseCard';
import useKYC from '@/utils/hooks/useKYC';

export default function StakingScreen() {
  const { isVerified, triggerVerification, QrModal } = useKYC();
  const [showKycModal, setShowKycModal] = React.useState(false);
  const handleKyc = () => {
    setShowKycModal(true);
    setTimeout(() => { triggerVerification(); }, 0);
  };

  return (
    <CenteredFlexCol>
      <div style={{ width: '100%', maxWidth: 520, marginBottom: 24 }}>
        <div style={{
          border: '2px solid #a259ff',
          borderRadius: 20,
          background: 'rgba(162,89,255,0.08)',
          padding: 24,
          marginBottom: 0,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 20,
        }}>
          <span style={{ fontSize: 40, marginRight: 16 }}>🛡️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 20, color: '#a259ff' }}>KYC Required</div>
            <div style={{ fontSize: 15, color: '#7c3aed', marginTop: 2 }}>You must complete KYC with KYC to interact with staking.</div>
          </div>
          <button
            onClick={handleKyc}
            style={{
              background: '#a259ff',
              color: '#fff',
              borderRadius: 8,
              padding: '10px 22px',
              fontWeight: 600,
              fontSize: 16,
              border: 'none',
              cursor: 'pointer',
              marginLeft: 8
            }}
          >
            Verify KYC
          </button>
        </div>
        {showKycModal && <QrModal onClose={() => setShowKycModal(false)} />}
      </div>
      {isVerified ? (
        <Card
          title="Staking"
          description="Staking functionality coming soon."
        />
      ) : (
        <div style={{
          background: '#f3f3fa',
          color: '#bbb',
          borderRadius: 16,
          padding: 28,
          fontWeight: 500,
          fontSize: 20,
          boxShadow: '0 4px 24px rgba(56,189,248,0.10)',
          margin: '16px auto',
          maxWidth: 420,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 200,
          border: '1px solid #e0e0e0',
          boxSizing: 'border-box',
          fontFamily: 'Inter, sans-serif',
          opacity: 0.6
        }}>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Staking</div>
          <div style={{ fontSize: 16, color: '#bbb', marginBottom: 16, textAlign: 'center' }}>
            Complete KYC to unlock staking features.
          </div>
        </div>
      )}
      <button style={{ marginTop: 16 }}>
        <Link href="/home">Back to Home</Link>
      </button>
    </CenteredFlexCol>
  );
} 