import React from 'react';
import BaseCard from '@/components/cards/BaseCard';
import { CenteredFlexCol } from '@/components/atomic';
import { HomeTitle } from '@/components/atomic/HomeTitle';
import { Paragraph } from '@/components/atomic/Paragraph';
import { useRouter } from 'next/router';

const bondingGraphic = (
  <span style={{
    fontSize: 48,
    filter: 'drop-shadow(0 0 16px #38bdf8) drop-shadow(0 0 32px #0ea5e9)',
    color: '#38bdf8',
    display: 'inline-block',
  }}>🔄</span>
);

const stakingGraphic = (
  <span style={{
    fontSize: 48,
    filter: 'drop-shadow(0 0 16px #a21caf) drop-shadow(0 0 32px #38bdf8)',
    color: '#a21caf',
    display: 'inline-block',
  }}>💎</span>
);

export default function HomeScreen() {
  const router = useRouter();
  return (
    <CenteredFlexCol>
      <HomeTitle>Welcome to FVC Protocol!</HomeTitle>
      <br/>
      <BaseCard
        title="Bonding"
        description="Swap stablecoins for discounted $FVCG"
        graphic={bondingGraphic}
        onClick={() => router.push('/bonding')}
      />
      <br/>
      <BaseCard
        title="Staking"
        description="Lock $FVCG to earn yield from protocol revenue and repayments"
        graphic={stakingGraphic}
        onClick={() => router.push('/staking')}
      />
    </CenteredFlexCol>
  );
}
