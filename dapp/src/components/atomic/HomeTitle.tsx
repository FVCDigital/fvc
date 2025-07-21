import React from 'react';
import { theme } from '@/constants/theme';

export interface HomeTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

const titleStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: 22,
  color: theme.primaryText,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontFamily: 'Inter, sans-serif',
};

export const HomeTitle: React.FC<HomeTitleProps> = ({ style, ...props }) => (
  <h1
    style={{
      ...titleStyle,
      ...style,
    }}
    {...props}
  />
); 