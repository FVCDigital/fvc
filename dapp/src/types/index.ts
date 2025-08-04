/**
 * Core protocol types and interfaces for the FVC Protocol
 * @module types
 */
import { TabId } from '@/constants/tabs';

// =============================================================================
// ASSET TYPES
// =============================================================================

/**
 * Supported asset types for bonding and trading
 */
export type AssetSymbol = 'USDC' | 'ETH' | 'FVC';

/**
 * Asset configuration interface
 */
export interface Asset {
  /** Asset symbol (e.g., 'USDC', 'ETH') */
  symbol: AssetSymbol;
  /** Human-readable asset name */
  name: string;
  /** Contract address (0x for native ETH) */
  address: `0x${string}`;
  /** Number of decimal places */
  decimals: number;
  /** Asset logo URL */
  logo: string;
  /** Asset brand color */
  color: string;
}

/**
 * Asset balance information
 */
export interface AssetBalance {
  /** Asset configuration */
  asset: Asset;
  /** Formatted balance string */
  formatted: string;
  /** Raw balance value */
  value: bigint;
  /** Whether balance is currently loading */
  isLoading: boolean;
  /** Error message if balance fetch failed */
  error?: string;
}

// =============================================================================
// BONDING TYPES
// =============================================================================

/**
 * Bonding round configuration
 */
export interface BondingRound {
  /** Unique round identifier */
  roundId: bigint;
  /** Initial discount percentage (0-100) */
  initialDiscount: bigint;
  /** Final discount percentage (0-100) */
  finalDiscount: bigint;
  /** Maximum USDC that can be bonded in this round */
  epochCap: bigint;
  /** Maximum USDC per wallet in this round */
  walletCap: bigint;
  /** Vesting period in seconds */
  vestingPeriod: bigint;
  /** Whether the round is currently active */
  isActive: boolean;
  /** Total USDC bonded in this round */
  totalBonded: bigint;
}

/**
 * Vesting schedule for bonded tokens
 */
export interface VestingSchedule {
  /** Amount of FVC tokens in vesting */
  amount: bigint;
  /** Vesting start timestamp */
  startTime: bigint;
  /** Vesting end timestamp */
  endTime: bigint;
}

/**
 * Vesting progress information
 */
export interface VestingProgress {
  /** Progress percentage (0-100) */
  progress: number;
  /** Time remaining until vesting completes */
  timeRemaining: {
    days: number;
    hours: number;
    minutes: number;
  };
  /** Whether vesting is fully complete */
  isFullyVested: boolean;
  /** Whether tokens are currently locked */
  isLocked: boolean;
}

/**
 * Bonding transaction state
 */
export type BondingStep = 'input' | 'approving' | 'bonding' | 'success' | 'error';

/**
 * Bonding flow state
 */
export interface BondingFlowState {
  /** Current step in the bonding process */
  step: BondingStep;
  /** Amount to bond */
  bondAmount: string;
  /** Error message if any */
  errorMessage: string;
  /** Whether approval is in progress */
  isApproving: boolean;
  /** Whether bonding is in progress */
  isBonding: boolean;
  /** Whether approval is complete */
  isApproved: boolean;
  /** Whether bonding is complete */
  isBonded: boolean;
}

// =============================================================================
// TRADING TYPES
// =============================================================================

/**
 * Trading pair configuration
 */
export interface TradingPair {
  /** Base asset (what you're selling) */
  baseAsset: Asset;
  /** Quote asset (what you're buying) */
  quoteAsset: Asset;
  /** Exchange rate (quote per base) */
  exchangeRate: number;
  /** Whether trading is currently enabled */
  enabled: boolean;
}

/**
 * Trade transaction state
 */
export interface TradeState {
  /** Amount of base asset to trade */
  baseAmount: string;
  /** Amount of quote asset to receive */
  quoteAmount: string;
  /** Whether trade is processing */
  isProcessing: boolean;
  /** Whether trade was successful */
  isSuccess: boolean;
  /** Error message if trade failed */
  error?: string;
}

// =============================================================================
// KYC TYPES
// =============================================================================

/**
 * KYC verification status
 */
export interface KYCStatus {
  /** Whether user is verified */
  isVerified: boolean;
  /** Verification timestamp */
  verifiedAt?: Date;
  /** Verification provider */
  provider?: string;
  /** Verification level */
  level?: 'basic' | 'enhanced' | 'full';
}

// =============================================================================
// UI COMPONENT TYPES
// =============================================================================

/**
 * Base props for card components
 */
export interface BaseCardProps {
  /** Additional CSS class names */
  className?: string;
  /** Custom styles */
  style?: React.CSSProperties;
}

/**
 * Tab configuration interface
 */
export interface TabConfig {
  /** Unique tab identifier */
  id: TabId;
  /** Display label */
  label: string;
  /** Whether tab is currently active */
  active?: boolean;
  /** Whether tab is disabled */
  disabled?: boolean;
}

/**
 * Button configuration
 */
export interface ButtonConfig {
  /** Button text */
  text: string;
  /** Whether button is disabled */
  disabled?: boolean;
  /** Whether button is loading */
  loading?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'danger';
  /** Button size */
  size?: 'small' | 'medium' | 'large';
}

// =============================================================================
// THEME TYPES
// =============================================================================

/**
 * Application theme configuration
 */
export interface Theme {
  /** Modal background color */
  modalBackground: string;
  /** Modal button color */
  modalButton: string;
  /** General button color */
  generalButton: string;
  /** Secondary text color */
  secondaryText: string;
  /** Primary text color */
  primaryText: string;
  /** Button text color */
  buttonText: string;
  /** Application background color */
  appBackground: string;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Application error types
 */
export type AppErrorType = 
  | 'INSUFFICIENT_BALANCE'
  | 'INVALID_AMOUNT'
  | 'NETWORK_ERROR'
  | 'USER_REJECTED'
  | 'CONTRACT_ERROR'
  | 'KYC_REQUIRED'
  | 'UNKNOWN_ERROR';

/**
 * Application error interface
 */
export interface AppError {
  /** Error type */
  type: AppErrorType;
  /** Error message */
  message: string;
  /** Error code */
  code?: string;
  /** Additional error details */
  details?: Record<string, any>;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Result wrapper for operations that can fail
 */
export type Result<T, E = AppError> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Loading state wrapper
 */
export interface LoadingState<T> {
  /** Whether data is loading */
  isLoading: boolean;
  /** Loaded data */
  data?: T;
  /** Error if loading failed */
  error?: AppError;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  /** Page number (1-based) */
  page: number;
  /** Items per page */
  limit: number;
  /** Total number of items */
  total?: number;
}

/**
 * Sort parameters
 */
export interface SortParams {
  /** Field to sort by */
  field: string;
  /** Sort direction */
  direction: 'asc' | 'desc';
} 