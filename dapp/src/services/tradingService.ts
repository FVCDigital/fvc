/**
 * Trading service for FVC Protocol
 * Handles all trading-related protocol interactions
 * @module services/tradingService
 */

import { parseUnits, formatUnits } from 'viem';
import { 
  TradingPair, 
  TradeState, 
  Asset, 
  AppError,
  Result 
} from '@/types';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default trading configuration
 */
export const DEFAULT_TRADING_CONFIG = {
  /** Default exchange rate for USDC to FVC */
  USDC_TO_FVC_RATE: 1.0,
  /** Minimum trade amount in USDC */
  MIN_TRADE_AMOUNT: 1.0,
  /** Maximum trade amount in USDC */
  MAX_TRADE_AMOUNT: 1000000.0,
  /** Trading fee percentage (0-100) */
  TRADING_FEE: 0.1,
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculates FVC amount from USDC with exchange rate
 * @param usdcAmount - Amount of USDC to trade
 * @param exchangeRate - Exchange rate (FVC per USDC)
 * @returns Amount of FVC tokens to receive
 */
export function calculateFVCAmountFromUSDC(
  usdcAmount: string, 
  exchangeRate: number = DEFAULT_TRADING_CONFIG.USDC_TO_FVC_RATE
): string {
  if (!usdcAmount) return '';
  
  const numAmount = parseFloat(usdcAmount);
  const fvcAmount = numAmount * exchangeRate;
  
  return fvcAmount.toFixed(4);
}

/**
 * Calculates USDC amount from FVC with exchange rate
 * @param fvcAmount - Amount of FVC to trade
 * @param exchangeRate - Exchange rate (FVC per USDC)
 * @returns Amount of USDC tokens to receive
 */
export function calculateUSDCAmountFromFVC(
  fvcAmount: string, 
  exchangeRate: number = DEFAULT_TRADING_CONFIG.USDC_TO_FVC_RATE
): string {
  if (!fvcAmount) return '';
  
  const numAmount = parseFloat(fvcAmount);
  const usdcAmount = numAmount / exchangeRate;
  
  return usdcAmount.toFixed(6);
}

/**
 * Calculates trading fee
 * @param amount - Trade amount
 * @param feePercentage - Fee percentage (0-100)
 * @returns Fee amount
 */
export function calculateTradingFee(
  amount: string, 
  feePercentage: number = DEFAULT_TRADING_CONFIG.TRADING_FEE
): string {
  if (!amount) return '0';
  
  const numAmount = parseFloat(amount);
  const fee = numAmount * (feePercentage / 100);
  
  return fee.toFixed(6);
}

/**
 * Calculates net amount after fees
 * @param amount - Trade amount
 * @param feePercentage - Fee percentage (0-100)
 * @returns Net amount after fees
 */
export function calculateNetAmount(
  amount: string, 
  feePercentage: number = DEFAULT_TRADING_CONFIG.TRADING_FEE
): string {
  if (!amount) return '0';
  
  const numAmount = parseFloat(amount);
  const fee = numAmount * (feePercentage / 100);
  const netAmount = numAmount - fee;
  
  return netAmount.toFixed(6);
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validates trade amount and parameters
 * @param amount - Amount to trade
 * @param asset - Asset being traded
 * @param balance - User's balance
 * @param tradingPair - Trading pair configuration
 * @returns Validation result
 */
export function validateTradeAmount(
  amount: string,
  asset: Asset,
  balance: bigint,
  tradingPair: TradingPair
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
  
  if (numAmount < DEFAULT_TRADING_CONFIG.MIN_TRADE_AMOUNT) {
    return {
      success: false,
      error: {
        type: 'INVALID_AMOUNT',
        message: `Minimum trade amount is ${DEFAULT_TRADING_CONFIG.MIN_TRADE_AMOUNT} ${asset.symbol}`,
      },
    };
  }
  
  if (numAmount > DEFAULT_TRADING_CONFIG.MAX_TRADE_AMOUNT) {
    return {
      success: false,
      error: {
        type: 'INVALID_AMOUNT',
        message: `Maximum trade amount is ${DEFAULT_TRADING_CONFIG.MAX_TRADE_AMOUNT} ${asset.symbol}`,
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
  
  if (!tradingPair.enabled) {
    return {
      success: false,
      error: {
        type: 'CONTRACT_ERROR',
        message: 'Trading is currently disabled',
      },
    };
  }
  
  return { success: true, data: undefined };
}

// =============================================================================
// TRADING PAIR MANAGEMENT
// =============================================================================

/**
 * Creates a trading pair configuration
 * @param baseAsset - Base asset (what you're selling)
 * @param quoteAsset - Quote asset (what you're buying)
 * @param exchangeRate - Exchange rate (quote per base)
 * @param enabled - Whether trading is enabled
 * @returns Trading pair configuration
 */
export function createTradingPair(
  baseAsset: Asset,
  quoteAsset: Asset,
  exchangeRate: number,
  enabled: boolean = true
): TradingPair {
  return {
    baseAsset,
    quoteAsset,
    exchangeRate,
    enabled,
  };
}

/**
 * Gets trading pair by assets
 * @param baseSymbol - Base asset symbol
 * @param quoteSymbol - Quote asset symbol
 * @param tradingPairs - Available trading pairs
 * @returns Trading pair or undefined if not found
 */
export function getTradingPair(
  baseSymbol: string,
  quoteSymbol: string,
  tradingPairs: TradingPair[]
): TradingPair | undefined {
  return tradingPairs.find(
    pair => 
      pair.baseAsset.symbol === baseSymbol && 
      pair.quoteAsset.symbol === quoteSymbol
  );
}

// =============================================================================
// TRADE STATE MANAGEMENT
// =============================================================================

/**
 * Creates initial trade state
 * @returns Initial trade state
 */
export function createInitialTradeState(): TradeState {
  return {
    baseAmount: '',
    quoteAmount: '',
    isProcessing: false,
    isSuccess: false,
  };
}

/**
 * Updates trade state with new amounts
 * @param state - Current trade state
 * @param baseAmount - New base amount
 * @param tradingPair - Trading pair configuration
 * @returns Updated trade state
 */
export function updateTradeState(
  state: TradeState,
  baseAmount: string,
  tradingPair: TradingPair
): TradeState {
  const quoteAmount = calculateFVCAmountFromUSDC(
    baseAmount, 
    tradingPair.exchangeRate
  );
  
  return {
    ...state,
    baseAmount,
    quoteAmount,
  };
}

/**
 * Validates complete trade state
 * @param state - Trade state to validate
 * @param tradingPair - Trading pair configuration
 * @returns Validation result
 */
export function validateTradeState(
  state: TradeState,
  tradingPair: TradingPair
): Result<void, AppError> {
  if (!state.baseAmount || parseFloat(state.baseAmount) <= 0) {
    return {
      success: false,
      error: {
        type: 'INVALID_AMOUNT',
        message: 'Please enter a valid amount',
      },
    };
  }
  
  if (!tradingPair.enabled) {
    return {
      success: false,
      error: {
        type: 'CONTRACT_ERROR',
        message: 'Trading is currently disabled',
      },
    };
  }
  
  return { success: true, data: undefined };
}

// =============================================================================
// MOCK TRADING FUNCTIONS
// =============================================================================

/**
 * Simulates a trade transaction
 * @param state - Trade state
 * @param tradingPair - Trading pair configuration
 * @returns Promise that resolves when trade is complete
 */
export async function simulateTrade(
  state: TradeState,
  tradingPair: TradingPair
): Promise<Result<TradeState, AppError>> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Simulate 95% success rate
  if (Math.random() < 0.95) {
    return {
      success: true,
      data: {
        ...state,
        isProcessing: false,
        isSuccess: true,
      },
    };
  } else {
    return {
      success: false,
      error: {
        type: 'NETWORK_ERROR',
        message: 'Trade failed due to network error',
      },
    };
  }
} 