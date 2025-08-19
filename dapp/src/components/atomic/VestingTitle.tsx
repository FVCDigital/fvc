import React from 'react';
import { cn } from '@/utils';

interface VestingTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const VestingTitle: React.FC<VestingTitleProps> = ({ 
  children, 
  className 
}) => (
  <h1 className={cn(
    "text-4xl sm:text-5xl lg:text-6xl font-bold text-center",
    "bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600",
    "bg-clip-text text-transparent",
    "mb-8 sm:mb-12",
    "leading-tight",
    className
  )}>
    {children}
  </h1>
);
