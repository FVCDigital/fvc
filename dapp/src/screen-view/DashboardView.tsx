import React from 'react';
import { useRouter } from 'next/router';
import { CenteredFlexCol } from '@/components/atomic/CenteredFlexCol';
import { HomeTitle } from '@/components/atomic/HomeTitle';
import FaucetCard from '@/components/cards/FaucetCard';
import { theme } from '@/constants/theme';

const DashboardView: React.FC = () => {
  const router = useRouter();

  const handleNextPage = () => {
    window.location.hash = '#/staking';
  };

  return (
    <CenteredFlexCol>
      <FaucetCard />
      <button
        onClick={handleNextPage}
        style={{
          marginTop: 24,
          padding: '14px 28px',
          borderRadius: 12,
          border: 'none',
          background: theme.generalButton,
          color: '#000000',
          fontSize: 16,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'Inter, sans-serif',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#0EA5E9';
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(56, 189, 248, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = theme.generalButton;
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        Stake →
      </button>
    </CenteredFlexCol>
  );
};

export default DashboardView;
