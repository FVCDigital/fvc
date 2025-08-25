/**
 * Dashboard card component
 * Displays user's FVC balance and basic portfolio status
 * @module components/cards/DashboardCard
 */

import React from 'react';
import { useAccount } from 'wagmi';
import { theme } from '@/constants/theme';
import { formatUnits } from 'viem';
import { useVestingSchedule } from '@/utils/contracts/bondingContract';
import { BaseCardProps, VestingSchedule } from '@/types';

/**
 * Props for the DashboardCard component
 */
interface DashboardCardProps extends BaseCardProps {
  /** Additional CSS class names */
  className?: string;
}

/**
 * Dashboard card component that displays user's FVC balance and basic portfolio status
 * @param props - Component props
 * @returns Dashboard card JSX element
 */
const DashboardCard: React.FC<DashboardCardProps> = ({ className = '' }) => {
  const { address } = useAccount();
  const { vestingSchedule, isLoading: isLoadingSchedule } = useVestingSchedule(address);

  // Cast vestingSchedule to proper type
  const schedule = vestingSchedule as VestingSchedule | undefined;
  const isVesting = schedule && schedule.amount > 0n;
  const fvcAmount = isVesting ? formatUnits(schedule.amount, 18) : '0';

  // Render disconnected state
  if (!address) {
    return (
      <div style={{
        background: theme.modalBackground,
        color: theme.primaryText,
        borderRadius: 16,
        padding: 28,
        fontWeight: 500,
        fontSize: 20,
        boxShadow: `0 4px 24px ${theme.accentGlow}`,
        margin: '16px auto',
        maxWidth: 800,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
        border: `1px solid ${theme.darkBorder}`,
        boxSizing: 'border-box',
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Dashboard</div>
        <div style={{ fontSize: 16, color: theme.secondaryText, textAlign: 'center', marginBottom: 24 }}>
          Connect your wallet to view your FVC balance
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: theme.modalBackground,
      color: theme.primaryText,
      borderRadius: 16,
      padding: 28,
      fontWeight: 500,
      fontSize: 20,
      boxShadow: `0 4px 24px ${theme.accentGlow}`,
      margin: '16px auto',
      maxWidth: 800,
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 300,
      border: `1px solid ${theme.darkBorder}`,
      boxSizing: 'border-box',
      fontFamily: 'Inter, sans-serif',
      transition: 'all 0.2s ease',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Dashboard</div>
        <div style={{ fontSize: 16, color: theme.secondaryText, marginBottom: 16, textAlign: 'center' }}>
          Your FVC Protocol overview
        </div>

        {/* FVC Balance */}
        <div style={{
          width: '100%',
          padding: '20px',
          borderRadius: 12,
          border: `1px solid ${theme.darkBorder}`,
          background: theme.cardHover,
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 14, color: theme.secondaryText, marginBottom: 8 }}>FVC Balance</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: theme.primaryText }}>
            {parseFloat(fvcAmount) < 0.01 && parseFloat(fvcAmount) > 0 
              ? `${parseFloat(fvcAmount).toFixed(8)} FVC` 
              : `${parseFloat(fvcAmount).toFixed(2)} FVC`}
          </div>
        </div>

        {/* Portfolio Status */}
        <div style={{
          width: '100%',
          padding: '20px',
          borderRadius: 12,
          border: `1px solid ${theme.darkBorder}`,
          background: theme.cardHover,
        }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: theme.primaryText }}>
            Portfolio Status
          </div>
          
          {isVesting ? (
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: theme.modalButton,
                marginRight: 12,
              }} />
              <span style={{ fontSize: 14, color: theme.secondaryText }}>
                FVC tokens locked in vesting schedule
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: theme.darkBorder,
                marginRight: 12,
              }} />
              <span style={{ fontSize: 14, color: theme.secondaryText }}>
                No FVC tokens in vesting
              </span>
            </div>
          )}
          
          <div style={{ fontSize: 12, color: theme.secondaryText, lineHeight: 1.5 }}>
            {isVesting 
              ? 'Your FVC tokens are locked and will unlock gradually over the vesting period.'
              : 'Participate in the private sale to start building your FVC portfolio.'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardCard; 