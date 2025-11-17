import React from 'react';
import { CenteredFlexCol } from '@/components/atomic/CenteredFlexCol';
import StakingCard from '@/components/cards/StakingCard';
import { theme } from '@/constants/theme';

const StakingView: React.FC = () => {
  const handleViewPartners = () => {
    window.location.hash = '#/partners';
  };

  return (
    <CenteredFlexCol>
      <StakingCard />
      <button
        onClick={handleViewPartners}
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
        View Our Partners →
      </button>
    </CenteredFlexCol>
  );
};

export default StakingView; 