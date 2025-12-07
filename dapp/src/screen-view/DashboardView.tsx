import React from 'react';
import { useRouter } from 'next/router';
import { CenteredFlexCol } from '@/components/atomic/CenteredFlexCol';
import FaucetCard from '@/components/cards/FaucetCard';
import { Button } from '@/components/ui/button';

const DashboardView: React.FC = () => {
  const router = useRouter();

  const handleNextPage = () => {
    window.location.hash = '#/staking';
  };

  return (
    <CenteredFlexCol>
      <FaucetCard />
      <Button
        onClick={handleNextPage}
        size="lg"
        className="mt-6 font-bold text-base px-7 py-6 rounded-xl shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 transition-all"
      >
        Stake →
      </Button>
    </CenteredFlexCol>
  );
};

export default DashboardView;
