import * as React from "react";
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import LandingModal from '@/components/modals/LandingModal';

export default function LandingPage() {
  const router = useRouter();
  const { isConnected } = useAccount();

  // No redirect
  return <LandingModal />;
} 