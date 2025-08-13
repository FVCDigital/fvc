/**
 * Tab configuration constants for the FVC Protocol
 * @module constants/tabs
 */
import { TabConfig } from '@/types';

/**
 * Valid tab IDs for hash-based routing
 */
export const VALID_TAB_IDS = ['dashboard', 'bonding', 'staking', 'governance', 'roadmap'] as const;

/**
 * Tab ID type for type safety
 */
export type TabId = typeof VALID_TAB_IDS[number];

/**
 * Mobile tab configuration
 */
export const MOBILE_TABS: TabConfig[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'bonding', label: 'Bonding' },
  { id: 'staking', label: 'Staking' },
  { id: 'governance', label: 'Governance' },
  { id: 'roadmap', label: 'Roadmap' },
];

/**
 * Default tab to show when no valid hash is present
 */
export const DEFAULT_TAB: TabId = 'dashboard';

/**
 * Hash prefix for tab routing
 */
export const TAB_HASH_PREFIX = '#/';

/**
 * Validates if a given string is a valid tab ID
 * @param tabId - The tab ID to validate
 * @returns True if the tab ID is valid
 */
export function isValidTabId(tabId: string): tabId is TabId {
  return VALID_TAB_IDS.includes(tabId as TabId);
}

/**
 * Extracts tab ID from hash string
 * @param hash - The hash string (e.g., "#/dashboard")
 * @returns The extracted tab ID or null if invalid
 */
export function extractTabFromHash(hash: string): TabId | null {
  const tabId = hash.replace(TAB_HASH_PREFIX, '');
  return isValidTabId(tabId) ? tabId : null;
}

/**
 * Creates a hash string for a given tab ID
 * @param tabId - The tab ID
 * @returns The hash string for the tab
 */
export function createTabHash(tabId: TabId): string {
  return `${TAB_HASH_PREFIX}${tabId}`;
} 