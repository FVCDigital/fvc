/**
 * Main Layout component for the application
 * @module components/layout/MainLayout
 */
import React from 'react';
import { theme } from '@/constants/theme';

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
  const mainStyle: React.CSSProperties = {
    marginLeft: isClient && !isMobile ? 280 : 0,
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: theme.appBackground,
    color: theme.primaryText,
  };

  const contentStyle: React.CSSProperties = {
    paddingBottom: isClient && isMobile ? 80 : 20,
    paddingLeft: isClient && isMobile ? 16 : 32,
    paddingRight: isClient && isMobile ? 16 : 32,
    background: theme.appBackground,
  };

  return (
    <div style={mainStyle}>
      <main className="flex-1 flex flex-col items-center justify-center" style={contentStyle}>
        <br/>
        <div style={{ 
          width: '100%', 
          maxWidth: fullWidth ? '100%' : 520, 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 20 
        }}>
          {children}
        </div>
      </main>
    </div>
  );
} 