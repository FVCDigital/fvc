import React, { useEffect, useMemo, useState } from 'react';
import { formatEther } from 'viem';
import { useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { theme } from '@/constants/theme';
import { useToast } from '@/hooks/use-toast';
import {
  VESTING_ABI,
  VESTING_CONTRACT,
  calcVestingProgress,
  useAllVestingSchedules,
  type OnChainVestingSchedule,
} from '@/utils/contracts/vestingContract';

interface VestingDashboardProps {
  isConnected: boolean;
  address?: string;
}

interface DisplaySchedule {
  id: number;
  schedule: OnChainVestingSchedule;
  releasable: bigint;
  progress: number;
}

function formatAmount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M FVC`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K FVC`;
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 4 })} FVC`;
}

function formatDate(timestamp: bigint): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(Number(timestamp) * 1000));
}

export const VestingDashboard: React.FC<VestingDashboardProps> = ({
  isConnected,
  address,
}) => {
  const { toast } = useToast();
  const [claimingId, setClaimingId] = useState<number | null>(null);

  const { data: schedules, isLoading, isError, error, refetch, isFetched } = useAllVestingSchedules(address);

  const releasableContracts = useMemo(
    () =>
      (schedules ?? []).map((_, id) => ({
        address: VESTING_CONTRACT,
        abi: VESTING_ABI,
        functionName: 'releasableAmount' as const,
        args: [address as `0x${string}`, BigInt(id)] as const,
      })),
    [address, schedules]
  );

  const { data: releasableResults } = useReadContracts({
    contracts: releasableContracts,
    query: {
      enabled: !!address && !!VESTING_CONTRACT && !!schedules?.length,
    },
  });

  const { writeContract, data: hash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const displaySchedules: DisplaySchedule[] = useMemo(() => {
    if (!schedules?.length) return [];

    return schedules.map((schedule, id) => {
      const releasable = releasableResults?.[id]?.result ?? 0n;
      return {
        id,
        schedule,
        releasable,
        progress: calcVestingProgress(schedule),
      };
    });
  }, [releasableResults, schedules]);

  useEffect(() => {
    if (!isConfirmed) return;

    toast({
      title: 'Tokens claimed',
      description: 'Your vesting balance will update shortly.',
    });
    setClaimingId(null);
    reset();
    void refetch();
  }, [isConfirmed, refetch, reset, toast]);

  const stats = useMemo(() => {
    let total = 0;
    let claimed = 0;
    let claimable = 0;

    for (const { schedule, releasable } of displaySchedules) {
      total += Number(formatEther(schedule.totalAmount));
      claimed += Number(formatEther(schedule.released));
      claimable += Number(formatEther(releasable));
    }

    return { total, claimed, claimable };
  }, [displaySchedules]);

  const handleClaim = async (scheduleId: number, releasable: bigint) => {
    if (!address || releasable === 0n || !VESTING_CONTRACT) return;

    try {
      setClaimingId(scheduleId);
      writeContract({
        address: VESTING_CONTRACT,
        abi: VESTING_ABI,
        functionName: 'release',
        args: [BigInt(scheduleId)],
      });
    } catch (error) {
      console.error('Failed to claim tokens:', error);
      setClaimingId(null);
      toast({
        title: 'Claim failed',
        description: 'Could not submit the claim transaction. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (!isConnected) {
    return (
      <div style={cardStyle}>
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: theme.primaryText }}>
          Connect Your Wallet
        </div>
        <div style={{ fontSize: 16, color: theme.secondaryText, textAlign: 'center' }}>
          Connect your wallet to view private sale vesting schedules and claim vested FVC.
        </div>
      </div>
    );
  }

  if (!VESTING_CONTRACT) {
    return (
      <div style={cardStyle}>
        <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Configuration required</div>
        <div style={{ fontSize: 15, color: theme.secondaryText, textAlign: 'center' }}>
          Set <code>NEXT_PUBLIC_VESTING_ADDRESS</code> in <code>dapp/.env.local</code> to load schedules.
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Investor Vesting</div>
      <div style={{ fontSize: 16, color: theme.secondaryText, marginBottom: 24, textAlign: 'center' }}>
        View and claim your private sale FVC allocations
      </div>

      <div style={statsGridStyle}>
        <StatCard label="Total Allocated" value={formatAmount(stats.total)} color="#3B82F6" />
        <StatCard label="Total Claimed" value={formatAmount(stats.claimed)} color="#10B981" />
        <StatCard label="Available to Claim" value={formatAmount(stats.claimable)} color="#8B5CF6" />
      </div>

      <div style={{ width: '100%' }}>
        <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, color: theme.primaryText }}>
          Your Vesting Schedules
        </div>

        {isLoading && !isFetched ? (
          <div style={emptyStateStyle}>Loading vesting schedules...</div>
        ) : isError ? (
          <div style={emptyStateStyle}>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Could not load schedules</div>
            <div style={{ fontSize: 15, color: theme.secondaryText, marginBottom: 12 }}>
              {(error as Error)?.message || 'RPC request failed. Check your network connection.'}
            </div>
            <button
              onClick={() => void refetch()}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: '#3B82F6',
                color: 'white',
              }}
            >
              Retry
            </button>
          </div>
        ) : displaySchedules.length === 0 ? (
          <div style={emptyStateStyle}>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>No vesting schedules</div>
            <div style={{ fontSize: 15, color: theme.secondaryText }}>
              Purchases with vesting will appear here once confirmed on-chain.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {displaySchedules.map(({ id, schedule, releasable, progress }) => {
              const claimable = Number(formatEther(releasable));
              const cliffEnd = schedule.startTime + schedule.cliff;
              const endTime = schedule.startTime + schedule.duration;
              const cliffPassed = Date.now() / 1000 > Number(cliffEnd);
              const isClaiming = claimingId === id && (isPending || isConfirming);

              return (
                <div key={id} style={scheduleCardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
                        Schedule #{id + 1}
                      </div>
                      <div style={{ fontSize: 14, color: theme.secondaryText }}>
                        {schedule.revoked ? 'Revoked' : cliffPassed ? 'Cliff passed' : 'In cliff period'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#3B82F6' }}>
                        {formatAmount(Number(formatEther(schedule.totalAmount)))}
                      </div>
                      <div style={{ fontSize: 12, color: theme.secondaryText }}>Total allocation</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 14, color: theme.secondaryText }}>Vesting progress</span>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{progress}%</span>
                    </div>
                    <div style={{ width: '100%', height: 8, background: theme.modalButton, borderRadius: 4 }}>
                      <div
                        style={{
                          width: `${progress}%`,
                          height: '100%',
                          background: progress === 100 ? '#10B981' : '#3B82F6',
                          borderRadius: 4,
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>

                  <div style={detailsGridStyle}>
                    <Detail label="Start" value={formatDate(schedule.startTime)} />
                    <Detail label="Cliff ends" value={formatDate(cliffEnd)} />
                    <Detail label="Fully vested" value={formatDate(endTime)} />
                    <Detail label="Claimed" value={formatAmount(Number(formatEther(schedule.released)))} accent />
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: 16,
                      background: claimable > 0 ? 'rgba(59, 130, 246, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                      borderRadius: 8,
                      border: `1px solid ${claimable > 0 ? '#3B82F6' : theme.modalButton}`,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
                        {claimable > 0 ? 'Ready to claim' : schedule.revoked ? 'Revoked' : cliffPassed ? 'Nothing to claim yet' : 'Cliff period'}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: claimable > 0 ? '#3B82F6' : theme.secondaryText }}>
                        {formatAmount(claimable)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleClaim(id, releasable)}
                      disabled={claimable === 0 || isClaiming || schedule.revoked}
                      style={{
                        padding: '10px 20px',
                        borderRadius: 8,
                        fontWeight: 600,
                        border: 'none',
                        cursor: claimable > 0 && !isClaiming ? 'pointer' : 'not-allowed',
                        opacity: claimable === 0 || isClaiming || schedule.revoked ? 0.5 : 1,
                        background: claimable > 0 ? '#3B82F6' : theme.modalButton,
                        color: claimable > 0 ? 'white' : theme.secondaryText,
                      }}
                    >
                      {isClaiming ? 'Confirming...' : claimable > 0 ? 'Claim FVC' : 'No tokens available'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const cardStyle: React.CSSProperties = {
  background: theme.modalBackground,
  color: theme.primaryText,
  borderRadius: 16,
  padding: 28,
  fontWeight: 500,
  boxShadow: `0 4px 24px ${theme.accentGlow}`,
  margin: '16px auto',
  maxWidth: 800,
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  border: `1px solid ${theme.darkBorder}`,
  boxSizing: 'border-box',
  fontFamily: 'Inter, sans-serif',
};

const statsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 16,
  width: '100%',
  marginBottom: 32,
};

const emptyStateStyle: React.CSSProperties = {
  background: theme.appBackground,
  borderRadius: 12,
  padding: 32,
  border: `1px solid ${theme.modalButton}`,
  textAlign: 'center',
};

const scheduleCardStyle: React.CSSProperties = {
  background: theme.appBackground,
  borderRadius: 12,
  padding: 24,
  border: `1px solid ${theme.modalButton}`,
};

const detailsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: 16,
  marginBottom: 16,
};

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        background: theme.appBackground,
        borderRadius: 12,
        padding: 20,
        border: `1px solid ${theme.modalButton}`,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 14, color: theme.secondaryText, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function Detail({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: theme.secondaryText, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 500, color: accent ? '#10B981' : theme.primaryText }}>{value}</div>
    </div>
  );
}
