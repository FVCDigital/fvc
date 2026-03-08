/**
 * Dashboard card component
 * Displays user's FVC balance and basic portfolio status
 * @module components/cards/DashboardCard
 */

import React from 'react';
import { useAccount } from 'wagmi';
import { theme } from '@/constants/theme';
import { formatUnits } from 'viem';
import { useVestingSchedule, useUserFVCBalance, useVestingProgress } from '@/utils/contracts/bondingContract';
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
  const { userFVCBalance, isLoading: isLoadingBalance } = useUserFVCBalance(address);
  const { progress: vestingProgress, isLoading: isLoadingProgress } = useVestingProgress(address);

  // Cast vestingSchedule to proper type
  const schedule = vestingSchedule as VestingSchedule | undefined;
  const isVesting = schedule && schedule.amount > 0n;
  
  // Use bonded FVC amount (locked in vesting) for dashboard display
  const fvcAmount = userFVCBalance > 0n ? formatUnits(userFVCBalance, 18) : '0';
  
  // Check if user has bonded FVC
  const hasBondedFVC = userFVCBalance > 0n;

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
          Your FVC overview
        </div>
        <a 
          href="#/staking"
          style={{
            background: theme.modalBackground,
            border: `1px solid ${theme.generalButton}`,
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 16,
            textAlign: 'center',
            cursor: 'pointer',
            textDecoration: 'none',
            display: 'block',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = theme.cardHover;
            e.currentTarget.style.borderColor = theme.generalButton;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = theme.modalBackground;
            e.currentTarget.style.borderColor = theme.generalButton;
          }}
        >
          <div style={{ fontSize: 14, color: theme.generalButton, fontWeight: 600 }}>
            Staking is live →
          </div>
        </a>

        {/* FVC Balance */}
        <div style={{
          width: '100%',
          padding: '20px',
          borderRadius: 12,
          border: `1px solid ${theme.darkBorder}`,
          background: theme.cardHover,
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 14, color: theme.secondaryText, marginBottom: 8 }}>Bonded FVC (Locked)</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: theme.primaryText }}>
            {parseFloat(fvcAmount) < 0.01 && parseFloat(fvcAmount) > 0 
              ? `${parseFloat(fvcAmount).toFixed(8)} FVC` 
              : `${parseFloat(fvcAmount).toFixed(2)} FVC`}
          </div>
        </div>

        {/* Vesting Timeline */}
        {hasBondedFVC && (
          <div style={{
            width: '100%',
            padding: '20px',
            borderRadius: 12,
            border: `1px solid ${theme.darkBorder}`,
            background: theme.cardHover,
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: theme.primaryText }}>
              Vesting Timeline
            </div>
            
            {/* Current Phase Indicator */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: 8,
                padding: '8px 12px',
                background: theme.modalButton,
                borderRadius: 8,
                width: 'fit-content'
              }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: theme.primaryText,
                  marginRight: 8,
                }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: theme.primaryText }}>
                  {vestingProgress?.isCliffPeriod ? 'Currently in Cliff Period' : 
                   vestingProgress?.isVestingPeriod ? 'Currently in Vesting Period' : 
                   vestingProgress?.isCompleted ? 'Vesting Completed' : 'Loading...'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: theme.secondaryText }}>
                {vestingProgress?.isCliffPeriod ? 'No tokens released during cliff period' :
                 vestingProgress?.isVestingPeriod ? `${vestingProgress.percentage.toFixed(2)}% of tokens vested` :
                 vestingProgress?.isCompleted ? 'All tokens have been released' : 'Calculating vesting status...'}
              </div>
            </div>

            {/* Progress Bar */}
            {vestingProgress && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: theme.secondaryText }}>Vesting Progress</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: theme.primaryText }}>
                    {vestingProgress.percentage.toFixed(2)}%
                  </span>
                </div>
                <div style={{ 
                  width: '100%', 
                  height: 8, 
                  background: theme.darkBorder, 
                  borderRadius: 4,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${vestingProgress.percentage}%`,
                    height: '100%',
                    background: theme.modalButton,
                    borderRadius: 4,
                    transition: 'width 0.3s ease',
                  }} />
                </div>
              </div>
            )}

            {/* Time Remaining */}
            {vestingProgress && (
              <div style={{ 
                marginBottom: 16, 
                padding: '12px', 
                background: theme.modalBackground, 
                borderRadius: 8,
                textAlign: 'center'
              }}>
                <div style={{ fontSize: 12, color: theme.secondaryText, marginBottom: 4 }}>
                  {vestingProgress.isCliffPeriod ? 'Time Until Cliff Ends' :
                   vestingProgress.isVestingPeriod ? 'Time Until Fully Vested' :
                   'Status'}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: theme.primaryText }}>
                  {vestingProgress.timeRemaining}
                </div>
              </div>
            )}

            {/* Timeline Visualization */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ 
                  width: '100%', 
                  height: 8, 
                  background: theme.darkBorder, 
                  borderRadius: 4,
                  position: 'relative'
                }}>
                  {/* Cliff Period */}
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '33.33%',
                    height: '100%',
                    background: theme.modalButton,
                    borderRadius: '4px 0 0 4px',
                  }} />
                  {/* Vesting Period */}
                  <div style={{
                    position: 'absolute',
                    left: '33.33%',
                    top: 0,
                    width: '66.67%',
                    height: '100%',
                    background: theme.accentGlow,
                    borderRadius: '0 4px 4px 0',
                  }} />
                </div>
              </div>
              
              {/* Timeline Labels */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: theme.secondaryText }}>
                <span>Cliff Start</span>
                <span>Cliff End</span>
                <span>Vesting End</span>
              </div>
            </div>

            {/* Vesting Details */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: 16,
              fontSize: 12 
            }}>
              <div>
                <div style={{ color: theme.secondaryText, marginBottom: 4 }}>Cliff Period</div>
                <div style={{ fontWeight: 600, color: theme.primaryText }}>12 months</div>
                <div style={{ color: theme.secondaryText, fontSize: 11 }}>
                  No tokens released
                </div>
              </div>
              <div>
                <div style={{ color: theme.secondaryText, marginBottom: 4 }}>Vesting Period</div>
                <div style={{ fontWeight: 600, color: theme.primaryText }}>24 months</div>
                <div style={{ color: theme.secondaryText, fontSize: 11 }}>
                  Linear token release
                </div>
              </div>
            </div>

            {/* Total Duration */}
            <div style={{ 
              marginTop: 16, 
              padding: '12px', 
              background: theme.modalBackground, 
              borderRadius: 8,
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 12, color: theme.secondaryText, marginBottom: 4 }}>
                Total Vesting Duration
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: theme.primaryText }}>
                36 months (3 years)
              </div>
            </div>
          </div>
        )}

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
          
          {hasBondedFVC ? (
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
            {hasBondedFVC 
              ? 'Your FVC tokens are locked and will unlock gradually over the vesting period.'
              : 'Participate in the private sale to start building your FVC portfolio.'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardCard; 