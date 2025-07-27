import React, { useEffect } from 'react';
import BaseCard from '@/components/cards/BaseCard';
import { CenteredFlexCol } from '@/components/atomic';
import { HomeTitle } from '@/components/atomic/HomeTitle';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import useKYC from '@/utils/hooks/useKYC';
import { KYCCard } from '@/components/cards';
import AppBar from '@/components/layout/AppBar';
import { theme } from '@/constants/theme';
import BondingGraphic from '@/components/graphics/BondingGraphic';
import StakingGraphic from '@/components/graphics/StakingGraphic';

export default function HomeScreen() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { isVerified, triggerVerification, QrModal } = useKYC();
  const [showKycModal, setShowKycModal] = React.useState(false);

  const handleKyc = () => {
    setShowKycModal(true);
    setTimeout(() => { triggerVerification(); }, 0);
  };

  useEffect(() => {
    // No redirect
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: theme.appBackground }}>
      <AppBar />
      <main className="flex-1 flex flex-col items-center justify-center">
        <HomeTitle>Welcome to FVC Protocol!</HomeTitle>
        <br/>
        <div style={{ width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <KYCCard onClick={handleKyc} showKycModal={showKycModal} QrModal={showKycModal && <QrModal onClose={() => setShowKycModal(false)} />} />
          <BaseCard
            title="Bonding"
            description="Swap stablecoins for discounted $FVC"
            graphic={<BondingGraphic />}
            onClick={() => router.push('/bonding')}
          />
          <BaseCard
            title="Staking"
            description="Lock $FVC to earn from protocol revenue"
            graphic={<StakingGraphic />}
            onClick={() => router.push('/staking')}
          />
        </div>
      </main>
    </div>
  );
}
