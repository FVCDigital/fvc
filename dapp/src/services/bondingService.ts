/**
 * Bonding service for FVC Protocol
 * Handles all bonding-related protocol interactions
 * @module services/bondingService
 */

import { parseUnits, formatUnits } from 'viem';
import { 
  BondingRound, 
  VestingSchedule, 
  VestingProgress, 
  Asset, 
  BondingFlowState,
  BondingStep,
  AppError,
  Result 
} from '@/types';
import { CONTRACTS, BONDING_ABI, USDC_ABI } from '@/utils/contracts/bondingContract';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default bonding configuration
 */
export const DEFAULT_BONDING_CONFIG = {
  /** Default vesting period in seconds (6 months) */
  VESTING_PERIOD: 6 * 30 * 24 * 60 * 60,
  /** Default epoch cap in USDC */
  EPOCH_CAP: parseUnits('200000000', 6), // 200M USDC
  /** Default wallet cap in USDC */
  WALLET_CAP: parseUnits('1000000', 6), // 1M USDC
  /** Default initial discount percentage */
  INITIAL_DISCOUNT: 20n,
  /** Default final discount percentage */
  FINAL_DISCOUNT: 10n,
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculates FVC tokens to mint based on USDC amount and discount
 * @param usdcAmount - Amount of USDC being bonded (or ETH converted to USDC)
 * @param discount - Current discount percentage (0-100)
 * @param asset - Asset being bonded (for ETH conversion)
 * @returns Amount of FVC tokens to mint
 */
export function calculateFVCAmount(usdcAmount: string, discount: bigint | undefined, asset?: any): string {
  console.log('calculateFVCAmount called with:', { usdcAmount, discount, asset });
  
  if (!usdcAmount || !discount) return '';
  
  let numAmount = parseFloat(usdcAmount);
  
  // If bonding ETH, convert to USDC equivalent (assuming 1 ETH = $3000 for now)
  // In a real implementation, you'd use a price oracle like Chainlink
  if (asset?.symbol === 'ETH') {
    const ETH_TO_USDC_RATE = 3000; // This should come from a price oracle
    numAmount = numAmount * ETH_TO_USDC_RATE;
    console.log('ETH converted to USDC equivalent:', numAmount);
  }
  
  const discountPercent = Number(discount) / 100;
  // Use discount-based pricing: FVC = USDC * (1 + discount/100)
  // This ensures 1 USDC = 1 FVC when discount = 0
  const fvcAmount = numAmount * (1 + discountPercent);
  
  console.log('Calculation:', { numAmount, discountPercent, fvcAmount });
  
  return fvcAmount.toFixed(4);
}

/**
 * Calculates current discount based on progress through epoch
 * @param totalBonded - Total USDC bonded so far
 * @param epochCap - Total USDC that can be bonded in this epoch
 * @param initialDiscount - Starting discount percentage
 * @param finalDiscount - Final discount percentage
 * @returns Current discount percentage
 */
export function calculateCurrentDiscount(
  totalBonded: bigint,
  epochCap: bigint,
  initialDiscount: bigint,
  finalDiscount: bigint
): bigint {
  if (totalBonded === 0n) {
    return initialDiscount;
  }
  
  if (totalBonded >= epochCap) {
    return finalDiscount;
  }
  
  // Use higher precision to avoid integer division loss
  const progress = (totalBonded * 10000n) / epochCap; // 10000 = 100%
  const discountRange = initialDiscount - finalDiscount;
  const currentDiscount = initialDiscount - (progress * discountRange / 10000n);
  
  return currentDiscount > finalDiscount ? currentDiscount : finalDiscount;
}

/**
 * Calculates vesting progress percentage
 * @param schedule - Vesting schedule
 * @returns Progress percentage (0-100)
 */
export function calculateVestingProgress(schedule: VestingSchedule | undefined): number {
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
}

/**
 * Calculates time remaining until vesting completes
 * @param schedule - Vesting schedule
 * @returns Time remaining in days, hours, and minutes
 */
export function calculateTimeRemaining(schedule: VestingSchedule | undefined): {
  days: number;
  hours: number;
  minutes: number;
} {
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
}

/**
 * Calculates complete vesting progress information
 * @param schedule - Vesting schedule
 * @param isLocked - Whether tokens are currently locked
 * @returns Complete vesting progress information
 */
export function calculateVestingProgressInfo(
  schedule: VestingSchedule | undefined,
  isLocked: boolean
): VestingProgress {
  const progress = calculateVestingProgress(schedule);
  const timeRemaining = calculateTimeRemaining(schedule);
  
  return {
    progress,
    timeRemaining,
    isFullyVested: progress >= 100,
    isLocked,
  };
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validates bonding amount and parameters
 * @param amount - Amount to bond
 * @param asset - Asset being bonded
 * @param balance - User's balance
 * @param round - Current bonding round
 * @returns Validation result
 */
export function validateBondingAmount(
  amount: string,
  asset: Asset,
  balance: bigint,
  round: BondingRound
): Result<void, AppError> {
  const numAmount = parseFloat(amount);
  
  if (!amount || numAmount <= 0) {
    return {
      success: false,
      error: {
        type: 'INVALID_AMOUNT',
        message: 'Please enter a valid amount',
      },
    };
  }
  
  const amountBigInt = parseUnits(amount, asset.decimals);
  
  if (amountBigInt > balance) {
    return {
      success: false,
      error: {
        type: 'INSUFFICIENT_BALANCE',
        message: 'Insufficient balance',
      },
    };
  }
  
  if (amountBigInt > round.epochCap - round.totalBonded) {
    return {
      success: false,
      error: {
        type: 'INVALID_AMOUNT',
        message: 'Amount exceeds epoch cap',
      },
    };
  }
  
  if (amountBigInt > round.walletCap) {
    return {
      success: false,
      error: {
        type: 'INVALID_AMOUNT',
        message: 'Amount exceeds wallet cap',
      },
    };
  }
  
  return { success: true, data: undefined };
}

// =============================================================================
// ASSET UTILITIES
// =============================================================================

/**
 * Gets display name for an asset
 * @param asset - Asset configuration
 * @returns Display name
 */
export function getAssetDisplayName(asset: Asset): string {
  return asset.symbol === 'ETH' ? 'ETH' : 'USDC';
}

/**
 * Determines if approve button should be shown
 * @param asset - Asset being bonded
 * @param isApproved - Whether approval is complete
 * @returns Whether to show approve button
 */
export function shouldShowApproveButton(asset: Asset, isApproved: boolean): boolean {
  return asset.symbol === 'USDC' && !isApproved;
}

/**
 * Gets appropriate button text based on bonding state
 * @param asset - Asset being bonded
 * @param isBonding - Whether bonding is in progress
 * @param isApproved - Whether approval is complete
 * @param isApproving - Whether approval is in progress
 * @returns Button text
 */
export function getActionButtonText(
  asset: Asset,
  isBonding: boolean,
  isApproved: boolean,
  isApproving: boolean
): string {
  if (asset.symbol === 'ETH') {
    return isBonding ? 'Bonding...' : 'Bond ETH (Convert to USDC)';
  }
  return isApproved 
    ? (isBonding ? 'Bonding...' : 'Bond USDC') 
    : (isApproving ? 'Approving...' : 'Approve USDC');
}

// =============================================================================
// CONTRACT INTERACTIONS
// =============================================================================

/**
 * Prepares approval transaction parameters
 * @param amount - Amount to approve
 * @param asset - Asset to approve
 * @returns Transaction parameters
 */
export function prepareApprovalTransaction(
  amount: string,
  asset: Asset
): { address: `0x${string}`; abi: any; functionName: string; args: any[] } {
  return {
    address: asset.address,
    abi: asset.symbol === 'USDC' ? USDC_ABI : [],
    functionName: 'approve',
    args: [
      CONTRACTS.BONDING as `0x${string}`,
      parseUnits(amount, asset.decimals)
    ],
  };
}

/**
 * Prepares bonding transaction parameters
 * @param amount - Amount to bond
 * @param asset - Asset to bond
 * @returns Transaction parameters
 */
export function prepareBondingTransaction(
  amount: string,
  asset: Asset
): { 
  address: `0x${string}`; 
  abi: any; 
  functionName: string; 
  args: any[]; 
  value?: bigint;
} {
  if (asset.symbol === 'ETH') {
    // For ETH, we need to convert to USDC first
    // This would require integration with a DEX like Uniswap
    // For now, we'll just return USDC bonding parameters
    const ETH_TO_USDC_RATE = 3000; // This should come from a price oracle
    const usdcEquivalent = parseFloat(amount) * ETH_TO_USDC_RATE;
    
    return {
      address: CONTRACTS.BONDING as `0x${string}`,
      abi: BONDING_ABI,
      functionName: 'bond',
      args: [parseUnits(usdcEquivalent.toString(), 6)], // Convert to USDC equivalent
    };
  } else {
    // Only USDC bonding is supported
    return {
      address: CONTRACTS.BONDING as `0x${string}`,
      abi: BONDING_ABI,
      functionName: 'bond',
      args: [parseUnits(amount, asset.decimals)],
    };
  }
} 