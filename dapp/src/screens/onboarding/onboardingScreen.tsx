import React from "react";
import { useRouter } from 'next/router';
import OnboardingView from '@/screen-view/OnboardingView';
import { useAccount } from 'wagmi';
import usePolygonID from '@/utils/hooks/usePolygonID';
import { simulateKYCCompletion } from '@/utils/handlers/onboardingHandlers';

const TOTAL_STEPS = 3;

const OnboardingScreen: React.FC = () => {
  const router = useRouter();
  const { isConnected } = useAccount();
  const [step, setStep] = React.useState(1);
  const [wasConnected, setWasConnected] = React.useState(false);

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

  // Handler for completing KYC (simulate for now)
  const handleCompleteKYC = async () => {
    await simulateKYCCompletion();
    setStep(3);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kycComplete', 'true');
    }
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

  return (
    <OnboardingView
      step={step}
      totalSteps={TOTAL_STEPS}
      isConnected={isConnected}
      onCompleteKYC={handleCompleteKYC}
      onFinish={handleFinish}
      onSkipKYC={handleSkipKYC}
    />
  );
};

export default OnboardingScreen;