import React from 'react';
import { useAccount } from 'wagmi';
import { useVestingSchedule, useIsLocked } from '@/utils/contracts/bondingContract';
import { theme } from '@/constants/theme';
import { formatUnits } from 'viem';

interface VestingCardProps {
  className?: string;
}

interface VestingSchedule {
  amount: bigint;
  startTime: bigint;
  endTime: bigint;
}

const VestingCard: React.FC<VestingCardProps> = ({ className = '' }) => {
  const { address } = useAccount();
  const { vestingSchedule, isLoading: isLoadingSchedule } = useVestingSchedule(address);
  const { isLocked, isLoading: isLoadingLocked } = useIsLocked(address);

  // Cast vestingSchedule to proper type
  const schedule = vestingSchedule as VestingSchedule | undefined;

  // Calculate vesting progress
  const calculateVestingProgress = () => {
    if (!schedule || !schedule.startTime || !schedule.endTime) {
      return 0;
    }

    const now = Math.floor(Date.now() / 1000);
    const startTime = Number(schedule.startTime);
    const endTime = Number(schedule.endTime);
    
    if (now >= endTime) return 100;
    if (now <= startTime) return 0;
    
    const totalDuration = endTime - startTime;
    const elapsed = now - startTime;
    return (elapsed / totalDuration) * 100;
  };

  // Calculate time remaining
  const calculateTimeRemaining = () => {
    if (!schedule || !schedule.endTime) {
      return { days: 0, hours: 0, minutes: 0 };
    }

    const now = Math.floor(Date.now() / 1000);
    const endTime = Number(schedule.endTime);
    const remaining = Math.max(0, endTime - now);

    const days = Math.floor(remaining / (24 * 60 * 60));
    const hours = Math.floor((remaining % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((remaining % (60 * 60)) / 60);

    return { days, hours, minutes };
  };

  const progress = calculateVestingProgress();
  const timeRemaining = calculateTimeRemaining();
  const isVesting = schedule && schedule.amount > 0n;

  if (isLoadingSchedule || isLoadingLocked) {
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
        <div style={{ fontSize: 16, color: theme.secondaryText, textAlign: 'center' }}>
          Loading vesting status...
        </div>
      </div>
    );
  }

  if (!isVesting) {
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
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Vesting Status</div>
        <div style={{ fontSize: 16, color: theme.secondaryText, textAlign: 'center' }}>
          No bonded tokens in vesting
        </div>
      </div>
    );
  }

  const fvcAmount = formatUnits(schedule.amount, 18);
  const isFullyVested = progress >= 100;

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
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Vesting Status</div>
        <div style={{ fontSize: 16, color: theme.secondaryText, marginBottom: 16, textAlign: 'center' }}>
          Your bonded <b>$FVC</b> vesting progress
        </div>

        {/* Status Badge */}
        <div style={{
          background: isFullyVested ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
          color: isFullyVested ? '#10b981' : '#3b82f6',
          padding: '8px 16px',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          marginBottom: 16,
        }}>
          {isFullyVested ? 'Fully Vested' : 'Vesting'}
      </div>

        {/* FVC Amount */}
        <div style={{
          width: '100%',
          padding: '12px 16px',
          borderRadius: 10,
          border: `1.5px solid ${theme.modalButton}`,
          background: theme.appBackground,
          color: theme.primaryText,
          fontSize: 18,
          marginBottom: 16,
          textAlign: 'center',
          fontWeight: 600,
        }}>
          {parseFloat(fvcAmount).toFixed(2)} FVC
        </div>

        {/* Progress Bar */}
        <div style={{ width: '100%', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 14, color: theme.secondaryText }}>Vesting Progress</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: theme.primaryText }}>{progress.toFixed(1)}%</span>
          </div>
          <div style={{
            width: '100%',
            height: 8,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 4,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
              borderRadius: 4,
              transition: 'width 0.3s ease',
              width: `${progress}%`,
            }} />
          </div>
        </div>

        {/* Time Remaining */}
        {!isFullyVested && (
          <div style={{
            width: '100%',
            padding: '16px',
            borderRadius: 10,
            border: `1.5px solid ${theme.modalButton}`,
            background: theme.appBackground,
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 14, color: theme.secondaryText, marginBottom: 12, textAlign: 'center' }}>
              Time Remaining
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: theme.primaryText }}>{timeRemaining.days}</div>
                <div style={{ fontSize: 12, color: theme.secondaryText }}>Days</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: theme.primaryText }}>{timeRemaining.hours}</div>
                <div style={{ fontSize: 12, color: theme.secondaryText }}>Hours</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: theme.primaryText }}>{timeRemaining.minutes}</div>
                <div style={{ fontSize: 12, color: theme.secondaryText }}>Minutes</div>
              </div>
            </div>
          </div>
        )}

        {/* Lock Status */}
        <div style={{
          width: '100%',
          padding: '12px 16px',
          borderRadius: 10,
          border: `1.5px solid ${theme.modalButton}`,
          background: theme.appBackground,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: 16, color: theme.secondaryText }}>Transfer Status</span>
          <div style={{
            background: isLocked ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
            color: isLocked ? '#ef4444' : '#10b981',
            padding: '4px 12px',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
          }}>
              {isLocked ? 'Locked' : 'Unlocked'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VestingCard; 