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
        <div>
          <DashboardCard />
          <FVCAllocationChart />
          <FVCProtocolFeatures />
        </div>
      );
    case 'private-sale':
      return <PrivateSaleCard />;
    case 'staking':
      return (
        <FVCFeatureCard
          title="FVC Staking Vaults"
          subtitle="Earn 8-12% APY on your FVC tokens"
          description="Lock your FVC tokens in our staking vaults to earn rewards and gain governance power. Multiple lock periods available with bonus rewards for early stakers."
          features={[
            "Earn 8-12% APY on staked FVC tokens",
            "Multiple vault options: Flexible, 3-month, 6-month, 12-month",
            "Early stakers get bonus rewards and higher APY",
            "Staking duration affects governance voting power",
            "Lock FVC to participate in protocol decisions",
            "Real-time rewards tracking and compound options"
          ]}
          launchDate="Q1 2025"
          icon="🔒"
          accentColor="#38BDF8"
        />
      );
    case 'governance':
      return (
        <FVCFeatureCard
          title="FVC DAO Governance"
          subtitle="Stake FVC to participate in protocol decisions"
          description="Join the FVC DAO and help shape the future of the protocol. Vote on treasury allocation, staking rewards, and new features."
          features={[
            "Stake FVC to participate in protocol decisions",
            "Vote on treasury allocation and protocol upgrades",
            "Proposal submission requires 100K FVC minimum",
            "Governance power based on staking duration",
            "Weekly voting rounds with transparent results",
            "Delegate voting power to trusted representatives"
          ]}
          launchDate="Q2 2025"
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