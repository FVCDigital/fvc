import * as React from "react";
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import LandingModal from '@/components/modals/LandingModal';
import HomeScreen from '@/screens/home/HomeScreen';

export default function LandingPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const [isHashRoute, setIsHashRoute] = React.useState(false);
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
    const checkHashRoute = () => {
      setIsHashRoute(window.location.hash.startsWith('#/'));
    };
    checkHashRoute();
    
    // Listen for hash changes
    window.addEventListener('hashchange', checkHashRoute);
    return () => window.removeEventListener('hashchange', checkHashRoute);
  }, []);

  // Show loading state during SSR
  if (!isClient) {
    return <div className="min-h-screen bg-background" />;
  }

  // Check if we're accessing a hash route (main app)
  if (isHashRoute) {
    return <HomeScreen />;
  }

  // Show landing page for root path
  return <LandingModal />;
}
