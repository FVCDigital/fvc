/**
 * Custom hook for hash-based routing
 * @module hooks/useHashRouting
 */
import { useEffect, useState } from 'react';
import { TabId, extractTabFromHash, createTabHash, DEFAULT_TAB, isValidTabId } from '@/constants/tabs';

/**
 * Hook return type for hash routing
 */
interface UseHashRoutingReturn {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  isClient: boolean;
}

/**
 * Custom hook for managing hash-based tab routing
 * Handles client-side hash changes and tab state management
 * @returns Object containing active tab, setter function, and client state
 */
export function useHashRouting(): UseHashRoutingReturn {
  const [activeTab, setActiveTabState] = useState<TabId>(DEFAULT_TAB);
  const [isClient, setIsClient] = useState(false);

  // Initialize client state
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle hash-based routing
  useEffect(() => {
    if (!isClient) return;
    
    const handleHashChange = () => {
      const hash = window.location.hash;
      const extractedTab = extractTabFromHash(hash);
      
      if (extractedTab) {
        setActiveTabState(extractedTab);
      } else {
        // Default to dashboard if no valid hash
        setActiveTabState(DEFAULT_TAB);
        window.location.hash = createTabHash(DEFAULT_TAB);
      }
    };

    // Set initial tab from hash
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isClient]);

  // Update hash when tab changes
  const setActiveTab = (tab: TabId) => {
    setActiveTabState(tab);
    if (isClient) {
      window.location.hash = createTabHash(tab);
    }
  };

  return {
    activeTab,
    setActiveTab,
    isClient,
  };
} 