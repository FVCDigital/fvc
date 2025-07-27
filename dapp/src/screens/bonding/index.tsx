import * as React from "react";
import Link from "next/link";
import { CenteredFlexCol } from '@/components/atomic';
import { TradingCard, KYCButton } from '@/components/cards';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/router';
import useKYC from '@/utils/hooks/useKYC';

export default function BondingScreen() {
  const { isConnected } = useAccount();
  const router = useRouter();
  const { isVerified, triggerVerification, QrModal } = useKYC();
  const [showKycModal, setShowKycModal] = React.useState(false);
  const handleKyc = () => {
    setShowKycModal(true);
    setTimeout(() => { triggerVerification(); }, 0);
  };

  React.useEffect(() => {
    // No redirect
  }, []);

  return (
    <CenteredFlexCol>
      <div style={{ position: 'relative', width: '100%', maxWidth: 420 }}>
        <TradingCard mode="crypto" />
      </div>
      <button style={{ marginTop: 16 }}>
        <Link href="/home">Back to Home</Link>
      </button>
    </CenteredFlexCol>
  );
} 