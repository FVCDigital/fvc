import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
// Mock contract addresses (deployed to localhost)
export const MOCK_CONTRACTS = {
  BONDING: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // Will be deployed
  MOCK_USDC: '0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e', // Deployed
  MOCK_GBP: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0', // FCA-regulated GBP stablecoin
  MOCK_FVC: '0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0', // Deployed
};

// Mainnet contract addresses (from environment variables)
export const MAINNET_CONTRACTS = {
  BONDING: process.env.NEXT_PUBLIC_MAINNET_BONDING_ADDRESS || '',
  USDC: process.env.NEXT_PUBLIC_MAINNET_USDC_ADDRESS || '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  FVC: process.env.NEXT_PUBLIC_MAINNET_FVC_ADDRESS || '',
  VESTING: process.env.NEXT_PUBLIC_MAINNET_VESTING_ADDRESS || '',
};

// Testnet contract addresses (from environment variables)
export const TESTNET_CONTRACTS = {
  BONDING: process.env.NEXT_PUBLIC_BONDING_ADDRESS || '',
  USDC: process.env.NEXT_PUBLIC_MOCK_USDC_ADDRESS || '',
  FVC: process.env.NEXT_PUBLIC_FVC_ADDRESS || '',
  VESTING: process.env.NEXT_PUBLIC_VESTING_ADDRESS || '',
};

// Use this to switch between environments
export const CONTRACTS = process.env.NODE_ENV === 'production' 
  ? MAINNET_CONTRACTS 
  : process.env.NEXT_PUBLIC_NETWORK === 'testnet'
  ? TESTNET_CONTRACTS
  : TESTNET_CONTRACTS; // Default to testnet for now

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
      },
      {
        "internalType": "uint256",
        "name": "_initialDiscount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_finalDiscount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_epochCap",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_walletCap",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_vestingPeriod",
        "type": "uint256"
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
        "name": "amount",
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
        "internalType": "uint256",
        "name": "roundId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "FVCAllocated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "roundId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "initialDiscount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "finalDiscount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "epochCap",
        "type": "uint256"
      }
    ],
    "name": "RoundStarted",
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
        "name": "fvcAmount",
        "type": "uint256"
      }
    ],
    "name": "allocateFVC",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "fvcAmount",
        "type": "uint256"
      }
    ],
    "name": "bond",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "fvcAmount",
        "type": "uint256"
      }
    ],
    "name": "calculateUSDCAmount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "usdcAmount",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "completeCurrentRound",
    "outputs": [],
    "stateMutability": "nonpayable",
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
    "name": "emergencyUnlockAllVesting",
    "outputs": [],
    "stateMutability": "nonpayable",
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
    "name": "emergencyUnlockVesting",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "epochCap",
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
    "name": "fvc",
    "outputs": [
      {
        "internalType": "contract IFVC",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "fvcAllocated",
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
    "name": "fvcSold",
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
    "name": "getCurrentDiscount",
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
    "name": "getCurrentRound",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "roundId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "initialDiscount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "finalDiscount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "epochCap",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "walletCap",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "vestingPeriod",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "fvcAllocated",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "fvcSold",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "isActive",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "totalBonded",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getRemainingFVC",
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
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getVestingSchedule",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "startTime",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "endTime",
            "type": "uint256"
          }
        ],
        "internalType": "struct IBonding.VestingSchedule",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "initialDiscount",
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
        "name": "user",
        "type": "address"
      }
    ],
    "name": "isLocked",
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
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_initialDiscount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_finalDiscount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_epochCap",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_walletCap",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_vestingPeriod",
        "type": "uint256"
      }
    ],
    "name": "startNewRound",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_vestingPeriod",
        "type": "uint256"
      }
    ],
    "name": "setVestingPeriod",
    "outputs": [],
    "stateMutability": "nonpayable",
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
    "name": "treasury",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "usdc",
    "outputs": [
      {
        "internalType": "contract IERC20",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "vestingPeriod",
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
    "name": "walletCap",
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

// Bonding contract address - using the existing deployed contract
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

// Hook to get current bonding round
export const useCurrentRound = () => {
  const { data: currentRound, isLoading, error } = useReadContract({
    address: CONTRACTS.BONDING as `0x${string}`,
    abi: BONDING_ABI,
    functionName: 'getCurrentRound',
  });

  return { currentRound, isLoading, error };
};

// Hook to get current discount
export const useCurrentDiscount = () => {
  const { data: discount, isLoading, error } = useReadContract({
    address: CONTRACTS.BONDING as `0x${string}`,
    abi: BONDING_ABI,
    functionName: 'getCurrentDiscount',
  });

  return { discount, isLoading, error };
};

// Hook to get vesting schedule
export const useVestingSchedule = (userAddress?: string) => {
  const { data: vestingSchedule, isLoading, error } = useReadContract({
    address: CONTRACTS.BONDING as `0x${string}`,
    abi: BONDING_ABI,
    functionName: 'getVestingSchedule',
    args: userAddress ? [userAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });

  return { vestingSchedule, isLoading, error };
};

// Hook to check if user is locked
export const useIsLocked = (userAddress?: string) => {
  const { data: isLocked, isLoading, error } = useReadContract({
    address: CONTRACTS.BONDING as `0x${string}`,
    abi: BONDING_ABI,
    functionName: 'isLocked',
    args: userAddress ? [userAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });

  return { isLocked, isLoading, error };
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