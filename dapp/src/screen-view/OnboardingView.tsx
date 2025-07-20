import React from 'react';
import OnboardingModal from '@/components/modals/OnboardingModal';

export interface OnboardingViewProps {
  step: number;
  totalSteps: number;
  isConnected: boolean;
  onCompleteKYC: () => void;
  onFinish: () => void;
  onSkipKYC?: () => void;
}

const laterButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#8A8F98',
  fontSize: 15,
  marginTop: 8,
  cursor: 'pointer',
  padding: 0,
  display: 'block',
};

const OnboardingView: React.FC<OnboardingViewProps> = ({
  step,
  onCompleteKYC,
  onFinish,
  onSkipKYC,
}) => {
  if (step === 1) {
    return (
      <OnboardingModal
        title="Step 1: Connect your wallet to get started"
        desc="Please connect your wallet to continue."
        buttonLabel="Connect Wallet"
        isConnectStep
      />
    );
  } else if (step === 2) {
    return (
      <OnboardingModal
        title="Step 2: Complete KYC"
        desc="Polygon ID KYC integration."
        buttonLabel="Complete KYC"
        onAction={onCompleteKYC}
        extra={onSkipKYC && (
          <button style={laterButtonStyle} onClick={onSkipKYC}>Later</button>
        )}
      />
    );
  } else if (step === 3) {
    return (
      <OnboardingModal
        title="🎉 Onboarding Complete!"
        desc="You are now ready to use FVC Protocol."
        buttonLabel="Go to Home Page"
        onAction={onFinish}
      />
    );
  }
  return null;
};

export default OnboardingView; 