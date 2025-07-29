/**
 * Coming Soon Card component
 * @module components/cards/ComingSoonCard
 */
import React from 'react';
import { theme } from '@/constants/theme';

/**
 * Props for ComingSoonCard component
 */
interface ComingSoonCardProps {
  /** The title to display */
  title: string;
  /** Optional description text */
  description?: string;
  /** Optional custom styles */
  style?: React.CSSProperties;
}

/**
 * Reusable card component for features that are coming soon
 * Displays a consistent placeholder card with title and description
 * @param props - Component props
 * @returns React.JSX.Element
 */
export default function ComingSoonCard({ 
  title, 
  description = 'Coming soon...',
  style 
}: ComingSoonCardProps): React.JSX.Element {
  const cardStyle: React.CSSProperties = {
    background: theme.modalBackground,
    color: theme.primaryText,
    borderRadius: 16,
    padding: 28,
    fontWeight: 500,
    fontSize: 20,
    boxShadow: '0 4px 24px rgba(56,189,248,0.10)',
    margin: '16px auto',
    maxWidth: 420,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    border: `1px solid ${theme.modalButton}`,
    boxSizing: 'border-box',
    fontFamily: 'Inter, sans-serif',
    ...style,
  };

  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        {title}
      </div>
      <div style={{ fontSize: 16, color: theme.secondaryText, textAlign: 'center' }}>
        {description}
      </div>
    </div>
  );
} 