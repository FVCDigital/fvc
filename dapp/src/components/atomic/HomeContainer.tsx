import React from 'react';

export interface HomeContainerProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const homeContainer: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  width: '100%',
  fontFamily: 'Inter, sans-serif',
};

export const HomeContainer: React.FC<HomeContainerProps> = ({ children, className, style }) => (
  <div style={{ ...homeContainer, ...style }} className={className}>{children}</div>
); 