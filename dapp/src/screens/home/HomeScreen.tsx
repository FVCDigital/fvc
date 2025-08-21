/**
 * Home Screen component - Main application interface
 * @module screens/home/HomeScreen
 */
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import useKYC from '@/utils/hooks/useKYC';
import { KYCCard } from '@/components/cards';
import VestingCard from '@/components/cards/VestingCard';
import AppBar from '@/components/layout/AppBar';
import Sidebar from '@/components/layout/Sidebar';
import MainLayout from '@/components/layout/MainLayout';
import TabContent from '@/components/layout/TabContent';
import { theme } from '@/constants/theme';
import { useHashRouting } from '@/hooks/useHashRouting';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { Toaster } from '@/components/ui/toaster';

/**
 * Main home screen component that orchestrates the application layout
 * Handles routing, responsive design, and tab management
 * @returns React.JSX.Element
 */
export default function HomeScreen(): React.JSX.Element {
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const { isVerified, triggerVerification, QrModal } = useKYC();
  const [showKycModal, setShowKycModal] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Custom hooks for routing and responsive behavior
  const { activeTab, setActiveTab, isClient: isRoutingClient } = useHashRouting();
  const { isMobile, isClient: isLayoutClient } = useResponsiveLayout();
  
  // Use the client state from routing hook for consistency
  const isClient = isRoutingClient;

  const handleKyc = () => {
    setShowKycModal(true);
    setTimeout(() => { triggerVerification(); }, 0);
  };

  const handleMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: theme.appBackground }}>
      {/* AppBar */}
      {isClient && (
        <AppBar 
          isMobile={isMobile} 
          onMenuToggle={handleMenuToggle}
        />
      )}
      
      {/* Sidebar - Desktop always visible, Mobile with burger menu */}
      {isClient && (
        <Sidebar 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
          isMobile={isMobile}
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Main Content */}
      <MainLayout isMobile={isMobile} isClient={isClient} fullWidth={activeTab === 'roadmap'}>
        <TabContent 
          activeTab={activeTab} 
          isConnected={isConnected}
          address={address}
        />
      </MainLayout>
      
      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}
