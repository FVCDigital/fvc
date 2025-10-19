import React from 'react';
import { CenteredFlexCol } from '@/components/atomic/CenteredFlexCol';
import { HomeTitle } from '@/components/atomic/HomeTitle';
import FaucetCard from '@/components/cards/FaucetCard';
import StakingCard from '@/components/cards/StakingCard';

const StakingView: React.FC = () => (
  <CenteredFlexCol>
    <HomeTitle>Staking</HomeTitle>
    <FaucetCard />
    <StakingCard />
  </CenteredFlexCol>
);

export default StakingView; 