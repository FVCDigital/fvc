/**
 * Dashboard card component
 * Displays user's FVC balance and vesting status
 * @module components/cards/DashboardCard
 */

import React from 'react';
import { useAccount } from 'wagmi';
import { useVestingSchedule, useIsLocked } from '@/utils/contracts/bondingContract';
import { theme } from '@/constants/theme';
import { formatUnits } from 'viem';
import { calculateVestingProgress } from '@/services/bondingService';
import { BaseCardProps, VestingSchedule } from '@/types';

/**
 * Props for the DashboardCard component
 */
interface DashboardCardProps extends BaseCardProps {
  /** Additional CSS class names */
  className?: string;
}

/**
 * Dashboard card component that displays user's FVC balance and vesting status
 * @param props - Component props
 * @returns Dashboard card JSX element
 */
const DashboardCard: React.FC<DashboardCardProps> = ({ className = '' }) => {
  const { address } = useAccount();
  const { vestingSchedule, isLoading: isLoadingSchedule } = useVestingSchedule(address);
  const { isLocked, isLoading: isLoadingLocked } = useIsLocked(address);

  // Cast vestingSchedule to proper type
  const schedule = vestingSchedule as VestingSchedule | undefined;

  // Calculate vesting progress using service function
  const progress = calculateVestingProgress(schedule);
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
        boxShadow: '0 4px 24px rgba(56,189,248,0.10)',
        margin: '16px auto',
        maxWidth: 420,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
        border: `1px solid ${theme.modalButton}`,
        boxSizing: 'border-box',
        fontFamily: 'Inter, sans-serif',
      }}>
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Dashboard</div>
        <div style={{ fontSize: 16, color: theme.secondaryText, textAlign: 'center' }}>
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
      boxShadow: '0 4px 24px rgba(56,189,248,0.10)',
      margin: '16px auto',
      maxWidth: 420,
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 340,
      border: `1px solid ${theme.modalButton}`,
      boxSizing: 'border-box',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Dashboard</div>
        <div style={{ fontSize: 16, color: theme.secondaryText, marginBottom: 16, textAlign: 'center' }}>
          Your FVC Protocol overview
        </div>

        {/* FVC Balance */}
        <div style={{
          width: '100%',
          padding: '16px',
          borderRadius: 10,
          border: `1.5px solid ${theme.modalButton}`,
          background: theme.appBackground,
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 14, color: theme.secondaryText, marginBottom: 8 }}>FVC Balance</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: theme.primaryText }}>
            {parseFloat(fvcAmount).toFixed(2)} FVC
          </div>
        </div>

        {/* Vesting Status */}
        {isVesting ? (
          <div style={{
            width: '100%',
            padding: '16px',
            borderRadius: 10,
            border: `1.5px solid ${theme.modalButton}`,
            background: theme.appBackground,
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 14, color: theme.secondaryText, marginBottom: 8 }}>Vesting Status</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: theme.primaryText }}>
                {progress >= 100 ? 'Fully Vested' : 'Vesting'}
              </span>
              <span style={{ fontSize: 14, color: theme.secondaryText }}>
                {progress.toFixed(1)}%
              </span>
            </div>
            <div style={{
              width: '100%',
              height: 6,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 3,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
                borderRadius: 3,
                transition: 'width 0.3s ease',
                width: `${progress}%`,
              }} />
            </div>
          </div>
        ) : (
          <div style={{
            width: '100%',
            padding: '16px',
            borderRadius: 10,
            border: `1.5px solid ${theme.modalButton}`,
            background: theme.appBackground,
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 14, color: theme.secondaryText, marginBottom: 8 }}>Vesting Status</div>
            <div style={{ fontSize: 16, color: theme.secondaryText }}>
              No tokens in vesting
            </div>
          </div>
        )}

        {/* Transfer Status */}
        <div style={{
          width: '100%',
          padding: '16px',
          borderRadius: 10,
          border: `1.5px solid ${theme.modalButton}`,
          background: theme.appBackground,
        }}>
          <div style={{ fontSize: 14, color: theme.secondaryText, marginBottom: 8 }}>Transfer Status</div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: 16, color: theme.primaryText }}>
              {isLocked ? 'Locked' : 'Unlocked'}
            </span>
            <div style={{
              background: isLocked ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
              color: isLocked ? '#ef4444' : '#10b981',
              padding: '4px 12px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
            }}>
              {isLocked ? 'Locked' : 'Unlocked'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardCard; 