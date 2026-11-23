import { useReadContract } from 'wagmi';
import { CONTRACTS } from './bondingContract';

export const VESTING_CONTRACT = (CONTRACTS.VESTING || '') as `0x${string}`;

export const VESTING_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'beneficiary', type: 'address' }],
    name: 'scheduleCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'beneficiary', type: 'address' }],
    name: 'getAllSchedules',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'totalAmount', type: 'uint256' },
          { internalType: 'uint256', name: 'released', type: 'uint256' },
          { internalType: 'uint256', name: 'startTime', type: 'uint256' },
          { internalType: 'uint256', name: 'cliff', type: 'uint256' },
          { internalType: 'uint256', name: 'duration', type: 'uint256' },
          { internalType: 'bool', name: 'revoked', type: 'bool' },
        ],
        internalType: 'struct Vesting.VestingSchedule[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'beneficiary', type: 'address' },
      { internalType: 'uint256', name: 'scheduleId', type: 'uint256' },
    ],
    name: 'releasableAmount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'scheduleId', type: 'uint256' }],
    name: 'release',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export type OnChainVestingSchedule = {
  totalAmount: bigint;
  released: bigint;
  startTime: bigint;
  cliff: bigint;
  duration: bigint;
  revoked: boolean;
};

export function useVestingScheduleCount(address?: string) {
  return useReadContract({
    address: VESTING_CONTRACT,
    abi: VESTING_ABI,
    functionName: 'scheduleCount',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address && !!VESTING_CONTRACT,
    },
  });
}

export function useAllVestingSchedules(address?: string) {
  return useReadContract({
    address: VESTING_CONTRACT,
    abi: VESTING_ABI,
    functionName: 'getAllSchedules',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address && !!VESTING_CONTRACT,
    },
  });
}

export function useScheduleReleasableAmount(address?: string, scheduleId?: number) {
  return useReadContract({
    address: VESTING_CONTRACT,
    abi: VESTING_ABI,
    functionName: 'releasableAmount',
    args:
      address !== undefined && scheduleId !== undefined
        ? [address as `0x${string}`, BigInt(scheduleId)]
        : undefined,
    query: {
      enabled: !!address && scheduleId !== undefined && !!VESTING_CONTRACT,
    },
  });
}

export function calcVestingProgress(schedule: OnChainVestingSchedule): number {
  const now = Math.floor(Date.now() / 1000);
  const start = Number(schedule.startTime);
  const cliffEnd = start + Number(schedule.cliff);
  const vestEnd = start + Number(schedule.duration);

  if (now >= vestEnd) return 100;
  if (now <= cliffEnd) return 0;

  const vestingWindow = vestEnd - cliffEnd;
  if (vestingWindow <= 0) return 100;

  return Math.min(100, Math.floor(((now - cliffEnd) / vestingWindow) * 100));
}
