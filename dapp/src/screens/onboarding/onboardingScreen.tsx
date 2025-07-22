import React from "react";
import { useRouter } from 'next/router';
import OnboardingView from '@/screen-view/OnboardingView';
import { useAccount } from 'wagmi';
import usePolygonId from '@/utils/hooks/usePolygonID';
import { simulateKYCCompletion } from '@/utils/handlers/onboardingHandlers';

const TOTAL_STEPS = 3;

const OnboardingScreen: React.FC = () => {
  const router = useRouter();
  const { isConnected } = useAccount();
  const [step, setStep] = React.useState(1);
  const [wasConnected, setWasConnected] = React.useState(false);
  const { triggerVerification, QrModal, isVerified } = usePolygonId();
  const [showKycModal, setShowKycModal] = React.useState(false);

  // Only advance to step 2 after a real wallet connection
  React.useEffect(() => {
    if (!wasConnected && isConnected && step === 1) {
      setStep(2);
      setWasConnected(true);
    }
    if (!isConnected && wasConnected) {
      setWasConnected(false);
      setStep(1);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('kycComplete');
      }
    }
  }, [isConnected, step, wasConnected]);

  // Handler for showing KYC QR modal
  const handleCompleteKYC = async () => {
    setShowKycModal(true);
    // Always show modal, then trigger QR
    setTimeout(() => { triggerVerification(); }, 0);
  };

  // Handler for finishing onboarding
  const handleFinish = () => {
    if (isConnected) {
      router.push('/home');
    }
  };

  // Handler for skipping KYC
  const handleSkipKYC = () => {
    setStep(3);
  };

  // Handler for continuing after KYC is complete
  const handleContinueAfterKYC = () => {
    setShowKycModal(false);
    setStep(3);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kycComplete', 'true');
    }
  };

  // Handler for closing the modal without verifying
  const handleCloseKycModal = () => {
    setShowKycModal(false);
  };

  return (
    <>
      <OnboardingView
        step={step}
        totalSteps={TOTAL_STEPS}
        isConnected={isConnected}
        onCompleteKYC={handleCompleteKYC}
        onFinish={handleFinish}
        onSkipKYC={handleSkipKYC}
      />
      {/* Show QR modal only during KYC step and when requested */}
      {step === 2 && showKycModal && (
        <>
          <QrModal onClose={handleCloseKycModal} />
          {isVerified && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ position: 'absolute', top: '60%', left: '50%', transform: 'translate(-50%, 0)', pointerEvents: 'auto' }}>
                <button
                  style={{
                    background: '#2563eb',
                    color: '#fff',
                    borderRadius: 8,
                    padding: '12px 32px',
                    fontWeight: 600,
                    fontSize: 18,
                    marginTop: 24,
                    cursor: 'pointer',
                    border: 'none',
                    boxShadow: '0 2px 8px rgba(56,189,248,0.08)'
                  }}
                  onClick={handleContinueAfterKYC}
                >
                  Continue
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
};

export default OnboardingScreen;