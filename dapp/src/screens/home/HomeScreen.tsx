import React, { useEffect } from 'react';
import BaseCard from '@/components/cards/BaseCard';
import { CenteredFlexCol } from '@/components/atomic';
import { HomeTitle } from '@/components/atomic/HomeTitle';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import usePolygonId from '@/utils/hooks/usePolygonID';
import { KYCPolygonIdCard } from '@/components/cards';

const bondingGraphic = (
  <span style={{
    fontSize: 48,
    filter: 'drop-shadow(0 0 16px #38bdf8) drop-shadow(0 0 32px #0ea5e9)',
    color: '#38bdf8',
    display: 'inline-block',
  }}>🔄</span>
);

const stakingGraphic = (
  <span style={{
    fontSize: 48,
    filter: 'drop-shadow(0 0 16px #a21caf) drop-shadow(0 0 32px #38bdf8)',
    color: '#a21caf',
    display: 'inline-block',
  }}>💎</span>
);

export default function HomeScreen() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { isVerified, triggerVerification, QrModal } = usePolygonId();
  const [showKycModal, setShowKycModal] = React.useState(false);

  const handleKyc = () => {
    setShowKycModal(true);
    setTimeout(() => { triggerVerification(); }, 0);
  };

  useEffect(() => {
    if (!isConnected) {
      router.replace('/onboarding');
    }
  }, [isConnected, router]);

  return (
    <CenteredFlexCol>
      <HomeTitle>Welcome to FVC Protocol!</HomeTitle>
      <br/>
      <div style={{ width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <KYCPolygonIdCard onClick={handleKyc} showKycModal={showKycModal} QrModal={showKycModal && <QrModal onClose={() => setShowKycModal(false)} />} />
        <BaseCard
          title="Bonding"
          description="Swap stablecoins for discounted $FVC"
          graphic={bondingGraphic}
          onClick={() => router.push('/bonding')}
        />
        <BaseCard
          title="Staking"
          description="Lock $FVC to earn from protocol revenue"
          graphic={stakingGraphic}
          onClick={() => router.push('/staking')}
        />
      </div>
    </CenteredFlexCol>
  );
}
