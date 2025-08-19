import React from 'react';
import { cn } from '@/utils';

interface VestingContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const VestingContainer: React.FC<VestingContainerProps> = ({ 
  children, 
  className 
}) => (
  <div className={cn(
    "min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50",
    "p-4 sm:p-6 lg:p-8",
    "max-w-7xl mx-auto",
    className
  )}>
    {children}
  </div>
);
