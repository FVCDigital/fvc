import React from 'react';
import { RoadmapStage } from './types';
import { theme } from '@/constants/theme';

interface RoadmapCardProps {
  stage: RoadmapStage;
  onClick: () => void;
}

const RoadmapCard: React.FC<RoadmapCardProps> = ({ stage, onClick }) => {
  const isCurrent = stage.status === 'current';
  const isCompleted = stage.status === 'completed';
  const isFuture = stage.status === 'future';

  // Base card styles - more compact with proper overflow handling
  const cardStyle: React.CSSProperties = {
    position: 'relative',
    padding: 'clamp(12px, 3vw, 18px)',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    backdropFilter: 'blur(10px)',
    fontFamily: 'Inter, sans-serif',
    transform: 'translateY(0)',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    border: '1px solid',
    minHeight: '120px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    width: '100%',
    boxSizing: 'border-box',
    overflow: 'hidden',
  };

  // Status-specific styles
  let statusStyles: React.CSSProperties = {};
  
  if (isCurrent) {
    statusStyles = {
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
      borderColor: 'rgba(255, 255, 255, 0.8)',
      color: theme.background,
      boxShadow: '0 8px 25px -5px rgba(255, 255, 255, 0.3), 0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      animation: 'subtle-pulse 3s ease-in-out infinite',
    };
  } else if (isCompleted) {
    statusStyles = {
      background: 'linear-gradient(135deg, rgba(243, 244, 246, 0.95) 0%, rgba(229, 231, 235, 0.9) 100%)',
      borderColor: 'rgba(243, 244, 246, 0.8)',
      color: '#374151',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    };
  } else {
    statusStyles = {
      background: 'linear-gradient(135deg, rgba(107, 114, 128, 0.2) 0%, rgba(75, 85, 99, 0.15) 100%)',
      borderColor: 'rgba(107, 114, 128, 0.3)',
      color: '#9CA3AF',
      opacity: 0.7,
      filter: 'grayscale(0.3)',
    };
  }

  const hoverStyle: React.CSSProperties = {
    transform: 'translateY(-4px)',
    boxShadow: isCurrent 
      ? '0 12px 32px -8px rgba(255, 255, 255, 0.4), 0 15px 25px -5px rgba(0, 0, 0, 0.1)'
      : isCompleted
      ? '0 8px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 15px -3px rgba(0, 0, 0, 0.1)'
      : '0 8px 25px -5px rgba(107, 114, 128, 0.2), 0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  };

  // Icon styles - more compact
  const iconStyle: React.CSSProperties = {
    fontSize: 'clamp(20px, 5vw, 26px)',
    marginBottom: '8px',
    textAlign: 'center',
    filter: isCurrent ? 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))' : 'none',
  };

  // Title styles - more compact
  const titleStyle: React.CSSProperties = {
    fontSize: 'clamp(12px, 2.5vw, 14px)',
    fontWeight: 600,
    margin: '0 0 3px 0',
    textAlign: 'center',
    color: isCurrent ? theme.appBackground : isCompleted ? '#374151' : '#9CA3AF',
  };

  // Subtitle styles - more compact
  const subtitleStyle: React.CSSProperties = {
    fontSize: 'clamp(10px, 2vw, 12px)',
    fontWeight: 500,
    margin: '0 0 8px 0',
    textAlign: 'center',
    color: isCurrent ? theme.appBackground : isCompleted ? '#6B7280' : '#9CA3AF',
    opacity: 0.8,
  };

  // Description styles (shown only as preview) - more compact
  const descriptionStyle: React.CSSProperties = {
    fontSize: 'clamp(9px, 1.8vw, 10px)',
    lineHeight: 1.3,
    textAlign: 'center',
    color: isCurrent ? theme.appBackground : isCompleted ? '#6B7280' : '#9CA3AF',
    opacity: 0.7,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    margin: 0,
  };

  // Status badge - positioned on top of card for full visibility
  const statusBadgeStyle: React.CSSProperties = {
    position: 'absolute',
    top: '12px',
    right: '12px',
    padding: '6px 12px',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    border: '2px solid',
    zIndex: 10,
  };

  let badgeStyles: React.CSSProperties = {};
  if (isCurrent) {
    badgeStyles = {
      background: '#1E40AF', // Dark blue background for contrast against white card
      color: 'white',
      borderColor: '#1E40AF',
      boxShadow: '0 2px 8px rgba(30, 64, 175, 0.3)',
    };
  } else if (isCompleted) {
    badgeStyles = {
      background: '#22C55E',
      color: 'white',
      borderColor: '#22C55E',
      boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
    };
  } else {
    badgeStyles = {
      background: '#6B7280',
      color: 'white',
      borderColor: '#6B7280',
    };
  }

  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div 
      style={{
        ...cardStyle,
        ...statusStyles,
        ...(isHovered ? hoverStyle : {}),
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Status Badge */}
      <div style={{...statusBadgeStyle, ...badgeStyles}}>
        {isCurrent ? 'Current' : isCompleted ? 'Done' : 'Future'}
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {/* Icon */}
        <div style={iconStyle}>
          {stage.icon}
        </div>

        {/* Title */}
        <h3 style={titleStyle}>
          {stage.title}
        </h3>

        {/* Subtitle */}
        <h4 style={subtitleStyle}>
          {stage.subtitle}
        </h4>

        {/* Description Preview */}
        <p style={descriptionStyle}>
          {stage.description}
        </p>
      </div>

      {/* Click indicator - more compact */}
      <div style={{
        textAlign: 'center',
        marginTop: '8px',
        fontSize: '8px',
        color: isCurrent ? theme.appBackground : isCompleted ? '#9CA3AF' : '#6B7280',
        opacity: 0.6,
        fontWeight: 500,
      }}>
        Click for details
      </div>

      {/* Subtle animations - added via style tag */}
      <style jsx>{`
        @keyframes subtle-pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.95;
          }
        }
      `}</style>
    </div>
  );
};

export default RoadmapCard;