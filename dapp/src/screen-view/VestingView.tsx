import React from 'react';
import { VestingDashboard } from '@/components/cards/VestingDashboard';

interface VestingViewProps {
  isConnected: boolean;
  address?: string;
}

const VestingView: React.FC<VestingViewProps> = ({ isConnected, address }) => (
  <VestingDashboard isConnected={isConnected} address={address} />
);

export default VestingView;
