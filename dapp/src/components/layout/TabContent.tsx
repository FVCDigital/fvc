/**
 * Tab Content component for rendering different tab views
 * @module components/layout/TabContent
 */
import React from 'react';
import DashboardCard from '@/components/cards/DashboardCard';
import { TradingCard } from '@/components/cards';
import TradeFVCCard from '@/components/cards/TradeFVCCard';
import ComingSoonCard from '@/components/cards/ComingSoonCard';
import { TabId } from '@/constants/tabs';

/**
 * Props for TabContent component
 */
interface TabContentProps {
  /** The active tab ID */
  activeTab: TabId;
}

/**
 * Component for rendering the appropriate content based on the active tab
 * Centralizes all tab content rendering logic
 * @param props - Component props
 * @returns React.JSX.Element
 */
export default function TabContent({ activeTab }: TabContentProps): React.JSX.Element {
  switch (activeTab) {
    case 'dashboard':
      return <DashboardCard />;
    case 'bonding':
      return <TradingCard />;
    case 'buy':
      return <TradeFVCCard />;
    case 'staking':
      return <ComingSoonCard title="Staking" />;
    case 'governance':
      return <ComingSoonCard title="Governance" />;
    case 'roadmap':
      return <ComingSoonCard title="Roadmap" />;
    default:
      return <ComingSoonCard title="Not Found" description="This tab is not available." />;
  }
} 