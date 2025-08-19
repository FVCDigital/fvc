/**
 * Centralized utilities for the FVC Protocol
 * Re-exports functions from services for backward compatibility
 * @module utils
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to combine class names with Tailwind CSS optimization
 * @param inputs - Class names to combine
 * @returns Optimized class string
 */
export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

// Re-export bonding service functions
export {
  calculateFVCAmount,
  calculateCurrentDiscount,
  calculateVestingProgress,
  calculateTimeRemaining,
  calculateVestingProgressInfo,
  validateBondingAmount,
  getAssetDisplayName,
  shouldShowApproveButton,
  getActionButtonText,
  prepareApprovalTransaction,
  prepareBondingTransaction,
  DEFAULT_BONDING_CONFIG,
} from '@/services/bondingService';

// Re-export trading service functions
export {
  calculateFVCAmountFromUSDC,
  calculateUSDCAmountFromFVC,
  calculateTradingFee,
  calculateNetAmount,
  validateTradeAmount,
  createTradingPair,
  getTradingPair,
  createInitialTradeState,
  updateTradeState,
  validateTradeState,
  simulateTrade,
  DEFAULT_TRADING_CONFIG,
} from '@/services/tradingService';

// =============================================================================
// LEGACY UTILITIES (for backward compatibility)
// =============================================================================

import React from 'react';
import { theme } from '@/constants/theme';

/**
 * Calculates percentage amount from balance
 * @param balance - User's balance
 * @param percentage - Percentage to calculate (0-100)
 * @param decimals - Asset decimals
 * @returns Calculated amount as string
 */
export const calculatePercentageAmount = (balance: string, percentage: number, decimals: number): string => {
  return (Number(balance) * percentage / 100).toFixed(decimals === 18 ? 6 : 6);
};

/**
 * Hook for responsive flex direction
 * @returns Whether the current viewport is mobile
 */
export const useResponsiveFlexDirection = () => {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
};

/**
 * Gets tab button styling based on active state
 * @param active - Whether the tab is currently active
 * @returns CSS properties for the tab button
 */
export const getTabButtonStyle = (active: boolean): React.CSSProperties => ({
  background: active ? 'rgba(56,189,248,0.1)' : 'transparent',
  color: active ? theme.primaryText : theme.secondaryText,
  border: 'none',
  borderRadius: 8,
  padding: '8px 16px',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: active ? 600 : 500,
  transition: 'all 0.2s ease',
  fontFamily: 'Inter, sans-serif',
}); 