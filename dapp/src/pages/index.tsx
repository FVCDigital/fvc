import * as React from "react";
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import LandingModal from '@/components/modals/LandingModal';
import HomeScreen from '@/screens/home/HomeScreen';

export default function LandingPage() {
  const router = useRouter();
  const { isConnected } = useAccount();

  // Check if we're accessing a hash route (main app)
  const isHashRoute = typeof window !== 'undefined' && window.location.hash.startsWith('#/');
  
  if (isHashRoute) {
    return <HomeScreen />;
  }

  // Show landing page for root path
  return <LandingModal />;
} 