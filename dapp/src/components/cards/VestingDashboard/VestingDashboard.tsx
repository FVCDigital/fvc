import React, { useState, useEffect } from 'react';
import { theme } from '@/constants/theme';

// Private investor vesting schedule interface
interface VestingSchedule {
  id: string;
  roundName: string; // e.g., "Seed Round", "Private Sale A"
  totalAmount: string;
  releasedAmount: string;
  claimedAmount: string;
  startDate: Date;
  cliffDate: Date;
  endDate: Date;
  isCliffPassed: boolean;
  claimableAmount: string;
  vestingType: 'linear' | 'monthly' | 'quarterly';
  discount: string; // e.g., "20%"
}

interface VestingDashboardProps {
  isConnected: boolean;
  address?: string;
}

// Mock data for private investor vesting schedules
// TODO: Replace with real contract calls to SimpleFVCVesting
const getMockVestingSchedules = (address?: string): VestingSchedule[] => {
  if (!address) return [];
  
  // Different schedules based on address for demo
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
  const threeMonthsFromNow = new Date(now.getTime() + 3 * 30 * 24 * 60 * 60 * 1000);
  const sixMonthsFromNow = new Date(now.getTime() + 6 * 30 * 24 * 60 * 60 * 1000);
  
  return [
    {
      id: '1',
      roundName: 'Seed Round',
      totalAmount: '50000',
      releasedAmount: '12500',
      claimedAmount: '12500',
      startDate: sixMonthsAgo,
      cliffDate: threeMonthsFromNow,
      endDate: sixMonthsFromNow,
      isCliffPassed: false,
      claimableAmount: '0',
      vestingType: 'linear',
      discount: '20%'
    },
    {
      id: '2',
      roundName: 'Private Sale A',
      totalAmount: '25000',
      releasedAmount: '8750',
      claimedAmount: '5000',
      startDate: new Date(now.getTime() - 9 * 30 * 24 * 60 * 60 * 1000),
      cliffDate: new Date(now.getTime() - 3 * 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 3 * 30 * 24 * 60 * 60 * 1000),
      isCliffPassed: true,
      claimableAmount: '3750',
      vestingType: 'monthly',
      discount: '15%'
    }
  ];
};

export const VestingDashboard: React.FC<VestingDashboardProps> = ({
  isConnected,
  address
}) => {
  const [schedules, setSchedules] = useState<VestingSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isConnected && address) {
      // Simulate loading delay
      setTimeout(() => {
        setSchedules(getMockVestingSchedules(address));
        setLoading(false);
      }, 1500);
    } else {
      setSchedules([]);
      setLoading(false);
    }
  }, [isConnected, address]);

  const formatAmount = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M FVC`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K FVC`;
    }
    return `${num.toLocaleString()} FVC`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  const calculateProgress = (schedule: VestingSchedule) => {
    const now = new Date();
    const start = schedule.startDate.getTime();
    const end = schedule.endDate.getTime();
    const current = now.getTime();
    
    if (current <= start) return 0;
    if (current >= end) return 100;
    
    return Math.round(((current - start) / (end - start)) * 100);
  };

  const handleClaim = async (scheduleId: string) => {
    try {
      // TODO: Implement real contract call
      console.log(`Claiming tokens for schedule ${scheduleId}`);
      
      // Update mock data
      setSchedules(prev => prev.map(s => 
        s.id === scheduleId 
          ? { 
              ...s, 
              claimedAmount: (parseFloat(s.claimedAmount) + parseFloat(s.claimableAmount)).toString(),
              claimableAmount: '0'
            }
          : s
      ));
    } catch (error) {
      console.error('Failed to claim tokens:', error);
    }
  };

  const getTotalStats = () => {
    const total = schedules.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0);
    const claimed = schedules.reduce((sum, s) => sum + parseFloat(s.claimedAmount), 0);
    const claimable = schedules.reduce((sum, s) => sum + parseFloat(s.claimableAmount), 0);
    
    return { total, claimed, claimable };
  };

  const stats = getTotalStats();

  if (!isConnected) {
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
        maxWidth: 520,
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
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: theme.primaryText }}>
          Connect Your Wallet
        </div>
        <div style={{ fontSize: 16, color: theme.secondaryText, textAlign: 'center' }}>
          Connect your wallet to view your FVC token vesting schedules
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
      <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Private Sale Vesting</div>
      <div style={{ fontSize: 16, color: theme.secondaryText, marginBottom: 24, textAlign: 'center' }}>
        Manage your private sale FVC tokens
      </div>
      
      {/* Summary Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
        gap: 16, 
        width: '100%',
        marginBottom: 32
      }}>
        <div style={{
          background: theme.appBackground,
          borderRadius: 12,
          padding: 20,
          border: `1px solid ${theme.modalButton}`,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 14, color: theme.secondaryText, marginBottom: 8 }}>Total Allocated</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#3B82F6' }}>
            {formatAmount(stats.total)}
          </div>
        </div>
        <div style={{
          background: theme.appBackground,
          borderRadius: 12,
          padding: 20,
          border: `1px solid ${theme.modalButton}`,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 14, color: theme.secondaryText, marginBottom: 8 }}>Total Claimed</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#10B981' }}>
            {formatAmount(stats.claimed)}
          </div>
        </div>
        <div style={{
          background: theme.appBackground,
          borderRadius: 12,
          padding: 20,
          border: `1px solid ${theme.modalButton}`,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 14, color: theme.secondaryText, marginBottom: 8 }}>Available to Claim</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#8B5CF6' }}>
            {formatAmount(stats.claimable)}
          </div>
        </div>
      </div>

      {/* Vesting Schedules */}
      <div style={{ width: '100%' }}>
        <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, color: theme.primaryText }}>
          Your Vesting Schedules
        </div>
        
        {schedules.length === 0 ? (
          <div style={{
            background: theme.appBackground,
            borderRadius: 12,
            padding: 32,
            border: `1px solid ${theme.modalButton}`,
            textAlign: 'center',
            marginBottom: 24
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💼</div>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: theme.primaryText }}>
              No Private Sale Allocations
            </div>
            <div style={{ fontSize: 16, color: theme.secondaryText, marginBottom: 8 }}>
              You haven't participated in any private sales yet.
            </div>
            <div style={{ fontSize: 14, color: theme.secondaryText }}>
              Private sale tokens will appear here after purchase with vesting schedules.
            </div>
          </div>
        ) : (
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            width: '100%',
            marginBottom: 24
          }}>
            {schedules.map((schedule) => {
              const progress = calculateProgress(schedule);
              const claimable = parseFloat(schedule.claimableAmount);
              
              return (
                <div key={schedule.id} style={{
                  background: theme.appBackground,
                  borderRadius: 12,
                  padding: 24,
                  border: `1px solid ${theme.modalButton}`,
                }}>
                  {/* Header */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: 16 
                  }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: theme.primaryText, marginBottom: 4 }}>
                        {schedule.roundName}
                      </div>
                      <div style={{ fontSize: 14, color: theme.secondaryText }}>
                        {schedule.discount} discount • {schedule.vestingType} vesting
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#3B82F6' }}>
                        {formatAmount(schedule.totalAmount)}
                      </div>
                      <div style={{ fontSize: 12, color: theme.secondaryText }}>
                        Total Allocation
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      marginBottom: 8 
                    }}>
                      <span style={{ fontSize: 14, color: theme.secondaryText }}>
                        Vesting Progress
                      </span>
                      <span style={{ fontSize: 14, color: theme.primaryText, fontWeight: 600 }}>
                        {progress}%
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: 8,
                      background: theme.modalButton,
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${progress}%`,
                        height: '100%',
                        background: progress === 100 ? '#10B981' : '#3B82F6',
                        borderRadius: 4,
                        transition: 'width 0.3s ease',
                      }} />
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                    gap: 16,
                    marginBottom: 16 
                  }}>
                    <div>
                      <div style={{ fontSize: 12, color: theme.secondaryText, marginBottom: 4 }}>
                        Start Date
                      </div>
                      <div style={{ fontSize: 14, color: theme.primaryText, fontWeight: 500 }}>
                        {formatDate(schedule.startDate)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: theme.secondaryText, marginBottom: 4 }}>
                        Cliff Date
                      </div>
                      <div style={{ fontSize: 14, color: theme.primaryText, fontWeight: 500 }}>
                        {formatDate(schedule.cliffDate)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: theme.secondaryText, marginBottom: 4 }}>
                        End Date
                      </div>
                      <div style={{ fontSize: 14, color: theme.primaryText, fontWeight: 500 }}>
                        {formatDate(schedule.endDate)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: theme.secondaryText, marginBottom: 4 }}>
                        Claimed
                      </div>
                      <div style={{ fontSize: 14, color: '#10B981', fontWeight: 600 }}>
                        {formatAmount(schedule.claimedAmount)}
                      </div>
                    </div>
                  </div>

                  {/* Claim Section */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 16,
                    background: claimable > 0 ? 'rgba(59, 130, 246, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                    borderRadius: 8,
                    border: `1px solid ${claimable > 0 ? '#3B82F6' : theme.modalButton}`,
                  }}>
                    <div>
                      <div style={{ fontSize: 14, color: theme.primaryText, fontWeight: 600, marginBottom: 2 }}>
                        {claimable > 0 ? 'Ready to Claim' : schedule.isCliffPassed ? 'Fully Claimed' : 'Cliff Period'}
                      </div>
                      <div style={{ fontSize: 16, color: claimable > 0 ? '#3B82F6' : theme.secondaryText, fontWeight: 700 }}>
                        {claimable > 0 ? formatAmount(schedule.claimableAmount) : 
                         schedule.isCliffPassed ? 'All tokens claimed' : 'Tokens locked until cliff'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleClaim(schedule.id)}
                      disabled={claimable === 0}
                      style={{
                        padding: '10px 20px',
                        borderRadius: 8,
                        fontWeight: 600,
                        border: 'none',
                        cursor: claimable > 0 ? 'pointer' : 'not-allowed',
                        opacity: claimable === 0 ? 0.5 : 1,
                        background: claimable > 0 ? '#3B82F6' : theme.modalButton,
                        color: claimable > 0 ? 'white' : theme.secondaryText,
                        transition: 'all 0.2s',
                      }}
                    >
                      {claimable > 0 ? 'Claim Tokens' : 'No Tokens Available'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {schedules.length > 0 && stats.claimable > 0 && (
        <div style={{
          background: theme.appBackground,
          borderRadius: 12,
          padding: 20,
          border: `1px solid ${theme.modalButton}`,
          width: '100%'
        }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: theme.primaryText }}>
            🚀 Quick Actions
          </div>
          <button
            onClick={() => {
              schedules.forEach(s => {
                if (parseFloat(s.claimableAmount) > 0) {
                  handleClaim(s.id);
                }
              });
            }}
            style={{
              padding: '12px 24px',
              borderRadius: 8,
              fontWeight: 600,
              background: 'linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginRight: 12
            }}
          >
            Claim All Available ({formatAmount(stats.claimable)})
          </button>
        </div>
      )}
    </div>
  );
};
