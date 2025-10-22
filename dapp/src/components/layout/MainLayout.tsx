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
    marginTop: 64 + 40, // AppBar height + Banner height
    height: 'calc(100vh - 104px)',
    display: 'flex',
    flexDirection: 'column',
    background: theme.appBackground,
    color: theme.primaryText,
    width: isClient && !isMobile ? 'calc(100% - 280px)' : '100%',
    boxSizing: 'border-box',
    overflow: 'hidden',
  };

  const contentStyle: React.CSSProperties = {
    paddingTop: fullWidth ? 20 : 0,
    paddingBottom: isClient && isMobile ? 80 : 20,
    paddingLeft: isClient && isMobile ? 16 : 32,
    paddingRight: isClient && isMobile ? 16 : 32,
    background: theme.appBackground,
    width: '100%',
    maxWidth: '100%',
    overflowY: fullWidth ? 'auto' : 'hidden',
    overflowX: 'hidden',
    height: '100%',
  };

  return (
    <div style={mainStyle}>
      <main className="flex-1 flex flex-col items-center" style={contentStyle}>
        {!fullWidth && <br/>}
        <div style={{ 
          width: '100%', 
          maxWidth: fullWidth ? '100%' : 1200, 
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
