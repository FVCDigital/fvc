/**
 * Tab Content component for rendering different tab views
 * @module components/layout/TabContent
 */
import React from 'react';
import DashboardCard from '@/components/cards/DashboardCard';
import { TradingCard, PrivateSaleCard, FVCFeatureCard, FVCProtocolFeatures } from '@/components/cards';
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <DashboardCard />
        </div>
      );
    case 'private-sale':
      return <PrivateSaleCard />;
    case 'staking':
      return (
        <FVCFeatureCard
          title="FVC Staking"
          subtitle="Staking features coming soon"
          description="FVC Protocol staking features and details will be displayed here. Please provide the actual staking mechanics, rewards, and features."
          features={[
            "Staking details to be confirmed",
            "Reward structure to be defined",
            "Lock periods to be determined",
            "Governance integration to be specified"
          ]}
          launchDate="TBD"
          icon="🔒"
          accentColor="#38BDF8"
        />
      );
    case 'governance':
      return (
        <FVCFeatureCard
          title="FVC Governance"
          subtitle="Governance features coming soon"
          description="FVC Protocol governance features and details will be displayed here. Please provide the actual governance mechanics, voting power, and features."
          features={[
            "Governance details to be confirmed",
            "Voting mechanisms to be defined",
            "Proposal requirements to be determined",
            "Staking integration to be specified"
          ]}
          launchDate="TBD"
          icon="🗳️"
          accentColor="#10B981"
        />
      );
    case 'roadmap':
      return <RoadmapFlowchart />;
    default:
      return <ComingSoonCard title="Not Found" description="This tab is not available." />;
  }
} 