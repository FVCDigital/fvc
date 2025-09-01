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
 * Calculates FVC tokens to mint based on USDC amount and current price
 * @param usdcAmount - Amount of USDC being bonded
 * @param currentPrice - Current FVC price in USDC (6 decimals)
 * @returns Amount of FVC tokens to mint
 */
export function calculateFVCAmountFromUSDC(usdcAmount: string, currentPrice: bigint | undefined): string {
  console.log('calculateFVCAmountFromUSDC called with:', { usdcAmount, currentPrice });
  
  if (!usdcAmount || !currentPrice) return '';
  
  const usdcAmountBigInt = parseUnits(usdcAmount, 6);
  const fvcAmount = (usdcAmountBigInt * BigInt(1e18)) / (currentPrice * BigInt(1000)); // currentPrice is in 3 decimals
  
  return formatUnits(fvcAmount, 18);
}

/**
 * Calculates required ETH amount for FVC tokens using Chainlink price
 * @param fvcAmount - Amount of FVC tokens to purchase
 * @param ethUsdPrice - ETH/USD price from Chainlink (18 decimals)
 * @param fvcUsdPrice - FVC price in USDC (6 decimals)
 * @returns Required ETH amount in wei
 */
export function calculateRequiredETH(fvcAmount: string, ethUsdPrice: bigint, fvcUsdPrice: bigint): string {
  console.log('calculateRequiredETH called with:', { fvcAmount, ethUsdPrice, fvcUsdPrice });
  
  if (!fvcAmount || !ethUsdPrice || !fvcUsdPrice) return '';
  
  const fvcAmountBigInt = parseUnits(fvcAmount, 18);
  const requiredUsdc = (fvcAmountBigInt * fvcUsdPrice * BigInt(1000)) / BigInt(1e18);
  const requiredETH = (requiredUsdc * BigInt(1e18)) / ethUsdPrice;
  
  return requiredETH.toString();
}

/**
 * Calculates FVC tokens from ETH amount using Chainlink price
 * @param ethAmount - Amount of ETH being bonded
 * @param ethUsdPrice - ETH/USD price from Chainlink (18 decimals)
 * @param fvcUsdPrice - FVC price in USDC (6 decimals)
 * @returns Amount of FVC tokens to mint
 */
export function calculateFVCAmountFromETH(ethAmount: string, ethUsdPrice: bigint, fvcUsdPrice: bigint): string {
  console.log('calculateFVCAmountFromETH called with:', { ethAmount, ethUsdPrice, fvcUsdPrice });
  
  if (!ethAmount || !ethUsdPrice || !fvcUsdPrice) {
    console.log('Missing parameters, returning empty string');
    return '';
  }
  
  const ethAmountBigInt = parseUnits(ethAmount, 18);
  console.log('ethAmountBigInt:', ethAmountBigInt.toString());
  
  // Convert ETH to USDC equivalent (6 decimals)
  // ethUsdPrice is in 18 decimals from the contract, so we need to scale it to 6 decimals for USDC
  const ethUsdPriceScaled = ethUsdPrice / BigInt(1e12); // Convert 18 decimals to 6 decimals
  const usdcEquivalent = (ethAmountBigInt * ethUsdPriceScaled) / BigInt(1e18);
  console.log('ethUsdPriceScaled:', ethUsdPriceScaled.toString());
  console.log('usdcEquivalent:', usdcEquivalent.toString());
  
  // Convert USDC to FVC tokens
  // fvcUsdPrice is stored as integer where 25 = $0.025 (3 decimal precision)
  // We need to convert it to 6 decimals for USDC comparison: 25 * 1000 = 25000 (6 decimals)
  const fvcUsdPriceScaled = fvcUsdPrice * BigInt(1000); // Convert 3 decimals to 6 decimals
  console.log('fvcUsdPriceScaled:', fvcUsdPriceScaled.toString());
  
  const fvcAmount = (usdcEquivalent * BigInt(1e18)) / fvcUsdPriceScaled;
  console.log('fvcAmount (raw):', fvcAmount.toString());
  
  const result = formatUnits(fvcAmount, 18);
  console.log('fvcAmount (formatted):', result);
  
  return result;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use calculateFVCAmountFromUSDC instead
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
    return isBonding ? 'Bonding with ETH...' : 'Bond with ETH';
  }
  return isApproved 
    ? (isBonding ? 'Bonding with USDC...' : 'Bond with USDC') 
    : (isApproving ? 'Approving USDC...' : 'Approve USDC');
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
 * @param fvcAmount - Amount of FVC tokens to purchase (for ETH bonding)
 * @returns Transaction parameters
 */
export function prepareBondingTransaction(
  amount: string,
  asset: Asset,
  fvcAmount?: string
): { 
  address: `0x${string}`; 
  abi: any; 
  functionName: string; 
  args: any[]; 
  value?: bigint;
} {
  if (asset.symbol === 'ETH') {
    // For ETH bonding, use the new bondWithETH function
    if (!fvcAmount) {
      throw new Error('FVC amount is required for ETH bonding');
    }
    
    return {
      address: CONTRACTS.BONDING as `0x${string}`,
      abi: BONDING_ABI,
      functionName: 'bondWithETH',
      args: [parseUnits(fvcAmount, 18)], // FVC amount in 18 decimals
      value: parseUnits(amount, 18), // ETH amount in wei
    };
  } else {
    // USDC bonding
    return {
      address: CONTRACTS.BONDING as `0x${string}`,
      abi: BONDING_ABI,
      functionName: 'bond',
      args: [parseUnits(amount, asset.decimals)],
    };
  }
} 