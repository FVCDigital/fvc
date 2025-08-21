import { useReadContract } from 'wagmi';

// FVCVesting contract ABI - key functions for the dapp
export const VESTING_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "vestingSchedules",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "totalAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "releasedAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "startTime",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "cliffTime",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "endTime",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "beneficiary",
        "type": "address"
      }
    ],
    "name": "calculateVestedAmount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "beneficiary",
        "type": "address"
      }
    ],
    "name": "getReleasableAmount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "beneficiary",
        "type": "address"
      }
    ],
    "name": "isCliffPassed",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "beneficiary",
        "type": "address"
      }
    ],
    "name": "release",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "CLIFF_DURATION",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "VESTING_DURATION",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "beneficiary",
        "type": "address"
      }
    ],
    "name": "getVestingProgress",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Get vesting contract address from environment
import { CONTRACTS } from './bondingContract';

// Use the test vesting contract that has claimable tokens for testing
export const VESTING_CONTRACT = "0xaf656599C1AA60C9Eb49e0B8ccB76E7C18d35AdB" as `0x${string}`;
// export const VESTING_CONTRACT = CONTRACTS.VESTING as `0x${string}`; // Production contract

// Hook to check if user has a vesting schedule
export function useVestingSchedule(address?: string) {
  return useReadContract({
    address: VESTING_CONTRACT,
    abi: VESTING_ABI,
    functionName: 'vestingSchedules',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address && !!VESTING_CONTRACT,
    },
  });
}

// Hook to get releasable amount
export function useReleasableAmount(address?: string) {
  return useReadContract({
    address: VESTING_CONTRACT,
    abi: VESTING_ABI,
    functionName: 'getReleasableAmount',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address && !!VESTING_CONTRACT,
    },
  });
}

// Hook to check if cliff has passed
export function useIsCliffPassed(address?: string) {
  return useReadContract({
    address: VESTING_CONTRACT,
    abi: VESTING_ABI,
    functionName: 'isCliffPassed',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address && !!VESTING_CONTRACT,
    },
  });
}

// Hook to get vested amount
export function useVestedAmount(address?: string) {
  return useReadContract({
    address: VESTING_CONTRACT,
    abi: VESTING_ABI,
    functionName: 'calculateVestedAmount',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address && !!VESTING_CONTRACT,
    },
  });
}

// Hook to get vesting progress percentage
export function useVestingProgress(address?: string) {
  return useReadContract({
    address: VESTING_CONTRACT,
    abi: VESTING_ABI,
    functionName: 'getVestingProgress',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!address && !!VESTING_CONTRACT,
    },
  });
}
