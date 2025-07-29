/**
 * Custom hook for responsive layout management
 * @module hooks/useResponsiveLayout
 */
import { useEffect, useState } from 'react';

/**
 * Hook return type for responsive layout
 */
interface UseResponsiveLayoutReturn {
  isMobile: boolean;
  isClient: boolean;
}

/**
 * Mobile breakpoint in pixels
 */
const MOBILE_BREAKPOINT = 768;

/**
 * Custom hook for managing responsive layout state
 * Handles mobile detection and client-side rendering
 * @returns Object containing mobile state and client state
 */
export function useResponsiveLayout(): UseResponsiveLayoutReturn {
  const [isMobile, setIsMobile] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return {
    isMobile,
    isClient,
  };
} 