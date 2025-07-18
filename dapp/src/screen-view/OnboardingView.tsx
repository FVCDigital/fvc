import React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import ConnectWalletButton from '@/components/onboarding/ConnectWalletButton';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface OnboardingViewProps {
  step: number;
  totalSteps: number;
  isConnected: boolean;
  onCompleteKYC: () => void;
  onFinish: () => void;
}

const getContent = (
  step: number,
  onCompleteKYC: () => void,
  onFinish: () => void
) => {
  switch (step) {
    case 1:
      return {
        title: 'Welcome to FVC Protocol',
        desc: 'Connect your wallet to get started.',
        action: (
          <div className="w-full flex justify-center mt-2 mb-2">
            <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
          </div>
        ),
      };
    case 2:
      return {
        title: 'Step 2: Complete KYC',
        desc: 'Polygon ID KYC integration coming soon. For now, click below to simulate completion.',
        action: (
          <button
            className="w-full max-w-xs text-lg font-semibold rounded-xl neon-glow mt-2 mb-2 bg-gradient-to-r from-[#0ea5e9] to-[#38bdf8] text-white px-8 py-3 shadow-lg transition hover:from-[#38bdf8] hover:to-[#0ea5e9] focus:outline-none focus:ring-2 focus:ring-[#38bdf8] focus:ring-offset-2"
            onClick={onCompleteKYC}
          >
            Complete KYC (Simulate)
          </button>
        ),
      };
    case 3:
      return {
        title: '🎉 Onboarding Complete!',
        desc: 'You are now ready to use FVC Protocol.',
        action: (
          <button
            className="w-full max-w-xs text-lg font-semibold rounded-xl neon-glow mt-2 mb-2 bg-gradient-to-r from-[#0ea5e9] to-[#38bdf8] text-white px-8 py-3 shadow-lg transition hover:from-[#38bdf8] hover:to-[#0ea5e9] focus:outline-none focus:ring-2 focus:ring-[#38bdf8] focus:ring-offset-2"
            onClick={onFinish}
          >
            Go to Welcome Page
          </button>
        ),
      };
    default:
      return { title: '', desc: '', action: null };
  }
};

const AnimatedGradientBg: React.FC = () => (
  <div
    className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
    aria-hidden="true"
  >
    <div
      className="absolute inset-0 w-full h-full animate-gradient-blur"
      style={{
        background:
          'linear-gradient(120deg, #0ea5e9 0%, #a21caf 50%, #38bdf8 100%)',
        opacity: 0.7,
        filter: 'blur(48px)',
      }}
    />
  </div>
);

const OnboardingView: React.FC<OnboardingViewProps> = ({
  step,
  onCompleteKYC,
  onFinish,
}) => {
  const { title, desc, action } = getContent(
    step,
    onCompleteKYC,
    onFinish
  );
  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-black overflow-hidden">
      <AnimatedGradientBg />
      <Card className="relative z-50 w-full max-w-lg rounded-3xl shadow-2xl border border-white/10 bg-white/90 font-inter backdrop-blur-xl">
        <CardContent className="flex flex-col items-center px-8 py-10">
          <CardTitle className="text-6xl leading-tight font-bold text-center mb-3 drop-shadow bg-gradient-to-r from-[#0ea5e9] via-[#a21caf] to-[#38bdf8] bg-clip-text text-transparent animate-gradient-x">{title}</CardTitle>
          <CardDescription className="text-center mb-7 text-lg text-black/80">{desc}</CardDescription>
          {action}
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingView; 