/**
 * Dashboard card component
 * Displays user's FVC balance and vesting status
 * @module components/cards/DashboardCard
 */

import React from 'react';
import { useAccount } from 'wagmi';
import { useVestingSchedule, useIsLocked, useCurrentRound } from '@/utils/contracts/bondingContract';
import { theme } from '@/constants/theme';
import { formatUnits } from 'viem';
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
  const { currentRound, isLoading: isLoadingRound } = useCurrentRound();

  // Cast vestingSchedule to proper type
  const schedule = vestingSchedule as VestingSchedule | undefined;

  // Calculate round progress (same as bonding progress)
  // Vesting lasts the entire bonding round, so progress should match
  const roundProgress = currentRound && typeof currentRound === 'object' && currentRound !== null
    ? Number((currentRound as any).totalBonded) / Number((currentRound as any).epochCap) * 100 
    : 0;
  
  // Use round progress for vesting status (since tokens are locked until round concludes)
  const progress = roundProgress;
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
        maxWidth: 800,
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
      minHeight: 340,
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
          padding: '16px',
          borderRadius: 10,
          border: `1.5px solid ${theme.modalButton}`,
          background: theme.appBackground,
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 14, color: theme.secondaryText, marginBottom: 8 }}>FVC Balance</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: theme.primaryText }}>
            {parseFloat(fvcAmount) < 0.01 && parseFloat(fvcAmount) > 0 
              ? `${parseFloat(fvcAmount).toFixed(8)} FVC` 
              : `${parseFloat(fvcAmount).toFixed(2)} FVC`}
          </div>
        </div>

        {/* Vesting Status - Matches bonding round progress */}
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
                {progress >= 100 ? 'Round Complete' : 'Round in Progress'}
              </span>
              <span style={{ fontSize: 14, color: theme.secondaryText }}>
                {progress.toFixed(1)}%
              </span>
            </div>
            <div style={{
              width: '100%',
              height: 10,
              background: theme.modalButton,
              borderRadius: 6,
              overflow: 'hidden',
              position: 'relative',
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                background: theme.generalButton,
                borderRadius: 6,
                transition: 'width 0.3s',
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