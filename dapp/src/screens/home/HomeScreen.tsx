import React, { useEffect, useState } from 'react';
import BaseCard from '@/components/cards/BaseCard';
import { CenteredFlexCol } from '@/components/atomic';
import { HomeTitle } from '@/components/atomic/HomeTitle';
import { useRouter } from 'next/router';
import { useAccount } from 'wagmi';
import useKYC from '@/utils/hooks/useKYC';
import { KYCCard } from '@/components/cards';
import VestingCard from '@/components/cards/VestingCard';
import DashboardCard from '@/components/cards/DashboardCard';
import BuyFVCCard from '@/components/cards/BuyFVCCard';
import AppBar from '@/components/layout/AppBar';
import BottomTabBar from '@/components/layout/BottomTabBar';
import Sidebar from '@/components/layout/Sidebar';
import { theme } from '@/constants/theme';
import BondingGraphic from '@/components/graphics/BondingGraphic';
import StakingGraphic from '@/components/graphics/StakingGraphic';
import { BondingIcon, VestingIcon, RoadmapIcon } from '@/components/graphics/TabIcons';
import { TradingCard } from '@/components/cards';

export default function HomeScreen() {
  const router = useRouter();
  const { isConnected, address } = useAccount();
  const { isVerified, triggerVerification, QrModal } = useKYC();
  const [showKycModal, setShowKycModal] = React.useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobile, setIsMobile] = useState(false);

  const handleKyc = () => {
    setShowKycModal(true);
    setTimeout(() => { triggerVerification(); }, 0);
  };

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle hash-based routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '');
      const validTabs = ['dashboard', 'bonding', 'staking', 'governance', 'buy', 'roadmap'];
      if (validTabs.includes(hash)) {
        setActiveTab(hash);
      } else {
        // Default to dashboard if no valid hash
        setActiveTab('dashboard');
        window.location.hash = '#/dashboard';
      }
    };

    // Set initial tab from hash
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update hash when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    window.location.hash = `#/${tab}`;
  };

  const mobileTabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'bonding', label: 'Bonding' },
    { id: 'buy', label: 'Buy FVC' },
    { id: 'staking', label: 'Staking' },
    { id: 'governance', label: 'Governance' },
    { id: 'roadmap', label: 'Roadmap' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardCard />;
      case 'bonding':
        return <TradingCard />;
      case 'buy':
        return <BuyFVCCard />;
      case 'staking':
        return (
          <div style={{
            background: theme.modalBackground,
            color: theme.primaryText,
            borderRadius: 16,
            padding: 28,
            fontWeight: 500,
            fontSize: 20,
            boxShadow: '0 4px 24px rgba(56,189,248,0.10)',
            margin: '16px auto',
            maxWidth: 420,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 200,
            border: `1px solid ${theme.modalButton}`,
            boxSizing: 'border-box',
            fontFamily: 'Inter, sans-serif',
          }}>
            <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Staking</div>
            <div style={{ fontSize: 16, color: theme.secondaryText, textAlign: 'center' }}>
              Coming soon...
            </div>
          </div>
        );
      case 'governance':
        return (
          <div style={{
            background: theme.modalBackground,
            color: theme.primaryText,
            borderRadius: 16,
            padding: 28,
            fontWeight: 500,
            fontSize: 20,
            boxShadow: '0 4px 24px rgba(56,189,248,0.10)',
            margin: '16px auto',
            maxWidth: 420,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 200,
            border: `1px solid ${theme.modalButton}`,
            boxSizing: 'border-box',
            fontFamily: 'Inter, sans-serif',
          }}>
            <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Governance</div>
            <div style={{ fontSize: 16, color: theme.secondaryText, textAlign: 'center' }}>
              Coming soon...
            </div>
          </div>
        );
      case 'roadmap':
        return (
          <div style={{
            background: theme.modalBackground,
            color: theme.primaryText,
            borderRadius: 16,
            padding: 28,
            fontWeight: 500,
            fontSize: 20,
            boxShadow: '0 4px 24px rgba(56,189,248,0.10)',
            margin: '16px auto',
            maxWidth: 420,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 200,
            border: `1px solid ${theme.modalButton}`,
            boxSizing: 'border-box',
            fontFamily: 'Inter, sans-serif',
          }}>
            <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Roadmap</div>
            <div style={{ fontSize: 16, color: theme.secondaryText, textAlign: 'center' }}>
              Coming soon...
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  useEffect(() => {
    // No redirect
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: theme.appBackground }}>
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
      )}
      
      {/* Main Content */}
      <div style={{ 
        marginLeft: isMobile ? 0 : 280,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <AppBar />
        <main className="flex-1 flex flex-col items-center justify-center" style={{ 
          paddingBottom: isMobile ? 80 : 20,
          paddingLeft: isMobile ? 16 : 32,
          paddingRight: isMobile ? 16 : 32,
        }}>
          <HomeTitle>Welcome to FVC Protocol!</HomeTitle>
          <br/>
          <div style={{ width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* KYC Card - Commented out, now handled within TradingCard
            <KYCCard onClick={handleKyc} showKycModal={showKycModal} QrModal={showKycModal && <QrModal onClose={() => setShowKycModal(false)} />} />
            */}
            
            {/* Tab Content */}
            {renderTabContent()}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      {isMobile && (
        <BottomTabBar 
          activeTab={activeTab}
          onTabChange={handleTabChange}
          tabs={mobileTabs}
        />
      )}
    </div>
  );
}
