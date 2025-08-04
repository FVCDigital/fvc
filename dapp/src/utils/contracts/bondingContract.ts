import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

// Mock contract addresses (deployed to localhost)
export const MOCK_CONTRACTS = {
  BONDING: '0x5FbDB2315678afecb367f032d93F642f64180aa3', // Will be deployed
  MOCK_USDC: '0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e', // Deployed
  MOCK_GBP: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0', // FCA-regulated GBP stablecoin
  MOCK_FVC: '0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0', // Deployed
};

// Real contract addresses (for mainnet deployment)
export const MAINNET_CONTRACTS = {
  BONDING: '0x...', // Will be set after deployment
  USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // Polygon USDC
  FVC: '0x...', // Will be set after deployment
};

// Testnet contract addresses (for Amoy deployment) - REAL DEPLOYED CONTRACTS
export const TESTNET_CONTRACTS = {
  BONDING: '0x0C81CCEB47507a1F030f13002325a6e8A99953E9', // New bonding contract with decimal fix
  USDC: '0x11Cf72a75e284B61548B87fB5ad8B8693FCfB1fb', // Mock USDC
  FVC: '0x8Bf97817B8354b960e26662c65F9d0b3732c9057', // New FVC token
};

// Use this to switch between environments
export const CONTRACTS = process.env.NODE_ENV === 'production' 
  ? MAINNET_CONTRACTS 
  : process.env.NEXT_PUBLIC_NETWORK === 'testnet'
  ? TESTNET_CONTRACTS
  : MOCK_CONTRACTS;

// Bonding contract ABI (minimal for bonding operations)
export const BONDING_ABI = [
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
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
        "components": [
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
        "internalType": "struct IBonding.RoundConfig",
        "name": "",
        "type": "tuple"
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
  }
];

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