import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

// Amoy Testnet contract addresses (deployed contracts)
export const AMOY_CONTRACTS = {
  BONDING: '0xEE4aAF73394bDfb5434Faa055CB56Aa761fDE2F8',
  MOCK_USDC: '0xFaa4Eb32240f7735a4F912495E89a9A4e3511e03',
  FVC: '0xAFe27839294fb50Ca1DA999A852323a2DaC8834e', // Actual FVC address used by bonding contract
};

// Mainnet contract addresses (from environment variables)
export const MAINNET_CONTRACTS = {
  BONDING: process.env.NEXT_PUBLIC_MAINNET_BONDING_ADDRESS || '',
  MOCK_USDC: process.env.NEXT_PUBLIC_MAINNET_USDC_ADDRESS || '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  FVC: process.env.NEXT_PUBLIC_MAINNET_FVC_ADDRESS || '',
  VESTING: process.env.NEXT_PUBLIC_MAINNET_VESTING_ADDRESS || '',
};

// Use this to switch between environments
export const CONTRACTS = process.env.NODE_ENV === 'production' 
  ? MAINNET_CONTRACTS 
  : AMOY_CONTRACTS; // Default to Amoy testnet for now

// New milestone-based bonding ABI
export const BONDING_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_fvc",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_usdc",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_treasury",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "usdcAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "fvcAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "milestone",
        "type": "uint256"
      }
    ],
    "name": "Bonded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "startTime",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "endTime",
        "type": "uint256"
      }
    ],
    "name": "VestingScheduleCreated",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "usdcAmount",
        "type": "uint256"
      }
    ],
    "name": "bond",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllMilestones",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "usdcThreshold",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "price",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "fvcAllocation",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "name",
            "type": "string"
          },
          {
            "internalType": "bool",
            "name": "isActive",
            "type": "bool"
          }
        ],
        "internalType": "struct IBonding.Milestone",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getCurrentMilestone",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "usdcThreshold",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "price",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "name",
            "type": "string"
          },
          {
            "internalType": "bool",
            "name": "isActive",
            "type": "bool"
          }
        ],
        "internalType": "struct IBonding.Milestone",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getSaleProgress",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "progress",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "currentMilestoneIndex",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalBonded",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalFVCSold",
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
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getVestedAmount",
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
    "name": "privateSaleActive",
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
        "internalType": "uint256",
        "name": "duration",
        "type": "uint256"
      }
    ],
    "name": "startPrivateSale",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "endPrivateSale",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "currentMilestone",
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
    "name": "totalBonded",
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
    "name": "totalFVCSold",
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
        "internalType": "uint256",
        "name": "milestoneIndex",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "fvcAmount",
        "type": "uint256"
      }
    ],
    "name": "allocateFVCToMilestone",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// Bonding contract address - using the deployed contract on Amoy
export const BONDING_CONTRACT = CONTRACTS.BONDING as `0x${string}`;

// USDC ABI (minimal for approval operations)
export const USDC_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "balanceOf",
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
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "mint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// FVC ABI (for balance checking)
export const FVC_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "balanceOf",
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
];

// Hook to get all milestones
export const useAllMilestones = () => {
  const { data: milestones, isLoading, error, refetch } = useReadContract({
    address: CONTRACTS.BONDING as `0x${string}`,
    abi: BONDING_ABI,
    functionName: 'getAllMilestones',
    query: {
      staleTime: 30000, // Cache for 30 seconds
      gcTime: 60000,    // Keep in memory for 1 minute
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnMount: true,        // Refetch on mount
    },
  });

  return { milestones, isLoading, error, refetch };
};

// Hook to get current milestone
export const useCurrentMilestone = () => {
  const { data: currentMilestone, isLoading, error, refetch } = useReadContract({
    address: CONTRACTS.BONDING as `0x${string}`,
    abi: BONDING_ABI,
    functionName: 'getCurrentMilestone',
    query: {
      staleTime: 30000, // Cache for 30 seconds
      gcTime: 60000,    // Keep in memory for 1 minute
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnMount: true,        // Refetch on mount
    },
  });

  return { currentMilestone, isLoading, error, refetch };
};

// Hook to get sale progress
export const useSaleProgress = () => {
  const { data: saleProgress, isLoading, error, refetch } = useReadContract({
    address: CONTRACTS.BONDING as `0x${string}`,
    abi: BONDING_ABI,
    functionName: 'getSaleProgress',
    query: {
      staleTime: 15000, // Cache for 15 seconds (more frequent updates)
      gcTime: 30000,    // Keep in memory for 30 seconds
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnMount: true,        // Refetch on mount
    },
  });

  return { saleProgress, isLoading, error, refetch };
};

// Hook to get vesting amount
export const useVestedAmount = (userAddress?: string) => {
  const { data: vestedAmount, isLoading, error } = useReadContract({
    address: CONTRACTS.BONDING as `0x${string}`,
    abi: BONDING_ABI,
    functionName: 'getVestedAmount',
    args: userAddress ? [userAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });

  return { vestedAmount, isLoading, error };
};

// Hook to get vesting schedule (for DashboardCard compatibility)
export const useVestingSchedule = (userAddress?: string) => {
  const { data: vestingData, isLoading, error } = useReadContract({
    address: CONTRACTS.BONDING as `0x${string}`,
    abi: BONDING_ABI,
    functionName: 'getVestedAmount',
    args: userAddress ? [userAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!userAddress,
      staleTime: 10000, // Cache for 10 seconds
      gcTime: 30000,    // Keep in memory for 30 seconds
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    },
  });

  // getVestedAmount returns a tuple: [vestedAmount, totalAmount]
  // We want the totalAmount (the bonded FVC amount)
  const totalAmount = vestingData && Array.isArray(vestingData) && vestingData.length > 1 
    ? vestingData[1] as bigint 
    : 0n;

  // Return a mock vesting schedule structure for compatibility
  // The new contract doesn't have separate vesting schedules, it calculates vested amounts directly
  const mockSchedule = totalAmount > 0n ? {
    amount: totalAmount,
    startTime: BigInt(Math.floor(Date.now() / 1000) - (12 * 24 * 60 * 60)), // 12 months ago (cliff period)
    endTime: BigInt(Math.floor(Date.now() / 1000) + (24 * 24 * 60 * 60)), // 24 months from now (linear vesting)
  } : undefined;

  return { vestingSchedule: mockSchedule, isLoading, error };
};

// Hook to check if user is locked (for VestingCard compatibility)
export const useIsLocked = (userAddress?: string) => {
  const { data: vestingData, isLoading, error } = useReadContract({
    address: CONTRACTS.BONDING as `0x${string}`,
    abi: BONDING_ABI,
    functionName: 'getVestedAmount',
    args: userAddress ? [userAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });

  // getVestedAmount returns a tuple: [vestedAmount, totalAmount]
  // We want the totalAmount (the bonded FVC amount)
  const totalAmount = vestingData && Array.isArray(vestingData) && vestingData.length > 1 
    ? vestingData[1] as bigint 
    : 0n;

  // In the new contract, users are "locked" if they have a vesting schedule (totalAmount > 0)
  const isLocked = totalAmount > 0n;

  return { isLocked, isLoading, error };
};

// Hook to get current round (for TradingCard compatibility)
export const useCurrentRound = () => {
  const { data: saleProgress, isLoading, error } = useReadContract({
    address: CONTRACTS.BONDING as `0x${string}`,
    abi: BONDING_ABI,
    functionName: 'getSaleProgress',
  });

  // Return a mock round structure for compatibility
  // The new contract uses milestones instead of rounds
  const mockRound = saleProgress && Array.isArray(saleProgress) && saleProgress.length >= 4 ? {
    roundId: saleProgress[1], // currentMilestoneIndex is at index 1
    initialDiscount: 0, // No discount in new system
    finalDiscount: 0,   // No discount in new system
    epochCap: 20000000000n, // 20M USDC target
    walletCap: 2000000000n, // 2M USDC wallet cap
    vestingPeriod: 1095n,   // 36 months in days
    fvcAllocated: saleProgress[3], // totalFVCSold is at index 3
    fvcSold: saleProgress[3], // totalFVCSold is at index 3
    isActive: true,
    totalBonded: saleProgress[2], // totalBonded is at index 2
  } : undefined;

  return { currentRound: mockRound, isLoading, error };
};

// Hook to get current discount (for TradingCard compatibility)
export const useCurrentDiscount = () => {
  // In the new milestone system, there are no discounts
  // Return 0 discount for compatibility
  return { discount: 0n, isLoading: false, error: null };
};

// Hook to check if private sale is active
export const usePrivateSaleActive = () => {
  const { data: isActive, isLoading, error } = useReadContract({
    address: CONTRACTS.BONDING as `0x${string}`,
    abi: BONDING_ABI,
    functionName: 'privateSaleActive',
  });

  return { isActive, isLoading, error };
};

// Hook to get FVC balance of bonding contract
export const useBondingContractFVCBalance = () => {
  const { data: balance, isLoading, error } = useReadContract({
    address: CONTRACTS.FVC as `0x${string}`,
    abi: FVC_ABI,
    functionName: 'balanceOf',
    args: [CONTRACTS.BONDING as `0x${string}`],
  });

  return { bondingContractFVCBalance: balance || 0n, isLoading, error };
};

// Hook to get user's bonded FVC amount from bonding contract (for DashboardCard)
export const useUserFVCBalance = (userAddress?: string) => {
  // Try to get vesting data from bonding contract
  const { data: vestingData, isLoading: vestingLoading, error: vestingError } = useReadContract({
    address: CONTRACTS.BONDING as `0x${string}`,
    abi: BONDING_ABI,
    functionName: 'getVestedAmount',
    args: userAddress ? [userAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!userAddress,
      staleTime: 10000,
      gcTime: 30000,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    },
  });
  
  // Fallback: Get FVC balance directly if vesting fails
  const { data: fvcBalance, isLoading: fvcLoading, error: fvcError } = useReadContract({
    address: CONTRACTS.FVC as `0x${string}`,
    abi: FVC_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!userAddress && (!vestingData || vestingData === 0n),
      staleTime: 10000,
      gcTime: 30000,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    },
  });
  
  // Determine the final balance
  let finalBalance = 0n;
  if (vestingData && Array.isArray(vestingData) && vestingData.length > 1) {
    // Use vesting data if it's a proper tuple
    finalBalance = vestingData[1] as bigint;
    console.log('🔍 useUserFVCBalance: Using vesting data:', finalBalance);
  } else if (fvcBalance && typeof fvcBalance === 'bigint' && fvcBalance > 0n) {
    // Fallback to direct FVC balance
    finalBalance = fvcBalance;
    console.log('🔍 useUserFVCBalance: Using fallback FVC balance:', finalBalance);
  }
  
  const isLoading = vestingLoading || fvcLoading;
  const error = vestingError || fvcError;
    
  return { userFVCBalance: finalBalance, isLoading, error };
};

// Hook to get vesting progress and timeline (for enhanced dashboard)
export const useVestingProgress = (userAddress?: string) => {
  const { data: vestingData, isLoading, error } = useReadContract({
    address: CONTRACTS.BONDING as `0x${string}`,
    abi: BONDING_ABI,
    functionName: 'getVestedAmount',
    args: userAddress ? [userAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!userAddress,
      staleTime: 10000,
      gcTime: 30000,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    },
  });
  
  // Calculate vesting progress
  const calculateProgress = () => {
    if (!vestingData || !Array.isArray(vestingData) || vestingData.length < 2) {
      return null;
    }
    
    const totalAmount = vestingData[1] as bigint;
    const vestedAmount = vestingData[0] as bigint;
    
    if (totalAmount === 0n) return null;
    
    // Calculate percentage (with 2 decimal precision)
    const percentage = Number((vestedAmount * 10000n) / totalAmount) / 100;
    
    // Determine current phase
    let currentPhase = 'cliff';
    let phaseProgress = 0;
    let timeRemaining = '';
    
    if (percentage === 0) {
      currentPhase = 'cliff';
      phaseProgress = 0;
      timeRemaining = '12 months until cliff ends';
    } else if (percentage < 100) {
      currentPhase = 'vesting';
      phaseProgress = percentage;
      timeRemaining = `${Math.ceil((100 - percentage) * 0.24)} months until fully vested`;
    } else {
      currentPhase = 'completed';
      phaseProgress = 100;
      timeRemaining = 'Fully vested!';
    }
    
    return {
      totalAmount,
      vestedAmount,
      percentage,
      currentPhase,
      phaseProgress,
      timeRemaining,
      isCliffPeriod: currentPhase === 'cliff',
      isVestingPeriod: currentPhase === 'vesting',
      isCompleted: currentPhase === 'completed'
    };
  };
  
  const progress = calculateProgress();
  
  return { progress, isLoading, error };
};

// DEBUG: Simple test hook to isolate the issue
export const useDebugContractCall = (userAddress?: string) => {
  console.log('🔍 DEBUG: Contract addresses being used:', {
    BONDING: CONTRACTS.BONDING,
    FVC: CONTRACTS.FVC,
    userAddress
  });
  
  const { data: result, isLoading, error } = useReadContract({
    address: CONTRACTS.BONDING as `0x${string}`,
    abi: BONDING_ABI,
    functionName: 'getVestedAmount',
    args: userAddress ? [userAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });
  
  console.log('🔍 DEBUG: Raw contract call result:', {
    result,
    isLoading,
    error,
    type: typeof result,
    isArray: Array.isArray(result)
  });
  
  return { result, isLoading, error };
};
