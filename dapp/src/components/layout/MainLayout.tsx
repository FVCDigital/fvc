/**
 * Main Layout component for the application
 * @module components/layout/MainLayout
 */
import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Props for MainLayout component
 */
interface MainLayoutProps {
  /** The content to render in the main area */
  children: React.ReactNode;
  /** Whether the layout is for mobile */
  isMobile: boolean;
  /** Whether the client has loaded */
  isClient: boolean;
  /** Whether to use full width (for roadmap) */
  fullWidth?: boolean;
}

/**
 * Main layout component that handles the content area structure
 * Provides consistent spacing and responsive behavior
 * @param props - Component props
 * @returns React.JSX.Element
 */
export default function MainLayout({ children, isMobile, isClient, fullWidth = false }: MainLayoutProps): React.JSX.Element {
  return (
    <div 
      className={cn(
        "flex flex-col min-h-screen bg-background text-foreground transition-[margin] duration-300",
        isClient && !isMobile ? "ml-[280px] w-[calc(100%-280px)]" : "ml-0 w-full"
      )}
      style={{
        marginTop: 64 + 40, // AppBar height + Banner height
        height: 'calc(100vh - 104px)',
      }}
    >
      <main 
        className={cn(
          "flex-1 flex flex-col items-center overflow-x-hidden w-full max-w-full h-full bg-background",
          fullWidth ? "overflow-y-auto pt-5" : "overflow-hidden",
          isClient && isMobile ? "px-4 pb-20" : "px-8 pb-5"
        )}
      >
        {!fullWidth && <br/>}
        <div 
          className={cn(
            "w-full flex flex-col gap-5",
            fullWidth ? "max-w-full" : "max-w-[1200px]"
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
