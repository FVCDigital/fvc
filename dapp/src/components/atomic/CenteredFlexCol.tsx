import React from 'react';

export interface CenteredFlexColProps {
  children: React.ReactNode;
  className?: string;
}

export const CenteredFlexCol: React.FC<CenteredFlexColProps> = ({ children, className }) => (
  <div className={`flex flex-col items-center justify-center ${className ?? ''}`}>{children}</div>
); 