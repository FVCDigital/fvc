/**
 * Tab Content component for rendering different tab views
 * @module components/layout/TabContent
 */
import React from 'react';
import DashboardCard from '@/components/cards/DashboardCard';
import { TradingCard, PrivateSaleCard } from '@/components/cards';
import ComingSoonCard from '@/components/cards/ComingSoonCard';
import FVCAllocationChart from '@/components/cards/FVCAllocationChart/FVCAllocationChart';
import { RoadmapFlowchart } from '@/components/roadmap';
import { TabId } from '@/constants/tabs';

/**
 * Props for TabContent component
 */
interface TabContentProps {
  /** The active tab ID */
  activeTab: TabId;
  /** Whether the user is connected */
  isConnected: boolean;
  /** User's wallet address */
  address?: string;
}

/**
 * Component for rendering the appropriate content based on the active tab
 * Centralises all tab content rendering logic
 * @param props - Component props
 * @returns React.JSX.Element
 */
export default function TabContent({ activeTab, isConnected, address }: TabContentProps): React.JSX.Element {
  switch (activeTab) {
    case 'dashboard':
      return (
        <div>
          <DashboardCard />
          <FVCAllocationChart />
        </div>
      );
    case 'private-sale':
      return <PrivateSaleCard />;
    case 'staking':
      return <ComingSoonCard title="Staking" />;
    case 'governance':
      return <ComingSoonCard title="Governance" />;
    case 'roadmap':
      return <RoadmapFlowchart />;
    default:
      return <ComingSoonCard title="Not Found" description="This tab is not available." />;
  }
} 