import React from 'react';
import { theme } from '@/constants/theme';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: number;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  width = '100%', 
  height = 20, 
  borderRadius = 8,
  className 
}) => {
  return (
    <div
      className={className}
      style={{
        width,
        height,
        borderRadius,
        background: `linear-gradient(90deg, ${theme.modalButton} 25%, ${theme.darkBorder} 50%, ${theme.modalButton} 75%)`,
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
      }}
    />
  );
};

export const SkeletonCard: React.FC = () => (
  <div style={{
    background: theme.modalBackground,
    borderRadius: 16,
    padding: 24,
    border: `1px solid ${theme.darkBorder}`,
  }}>
    <Skeleton width="60%" height={24} borderRadius={8} />
    <div style={{ marginTop: 16 }}>
      <Skeleton width="100%" height={40} borderRadius={12} />
    </div>
  </div>
);
