import * as React from "react";
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import LandingModal from '@/components/modals/LandingModal';

export default function LandingPage() {
  const router = useRouter();
  const { isConnected } = useAccount();

  React.useEffect(() => {
    if (isConnected) {
      router.replace('/home');
    }
  }, [isConnected, router]);

  // Optionally, render nothing while redirecting
  if (isConnected) return null;

  return <LandingModal />;
} 