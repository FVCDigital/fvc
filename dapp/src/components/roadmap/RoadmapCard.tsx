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
      background: 'linear-gradient(135deg, rgba(56,189,248,0.15) 0%, rgba(56,189,248,0.08) 100%)',
      borderColor: '#38BDF8',
      color: '#9CA3AF',
      boxShadow: '0 8px 25px -5px rgba(56,189,248,0.3), 0 10px 15px -3px rgba(0, 0, 0, 0.4)',
      animation: 'subtle-pulse 3s ease-in-out infinite',
    };
  } else if (isCompleted) {
    statusStyles = {
      background: 'linear-gradient(135deg, rgba(56,189,248,0.08) 0%, rgba(56,189,248,0.03) 100%)',
      borderColor: '#2A2A2A',
      color: '#9CA3AF',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
    };
  } else {
    statusStyles = {
      background: 'linear-gradient(135deg, rgba(42,42,42,0.2) 0%, rgba(26,26,26,0.15) 100%)',
      borderColor: '#2A2A2A',
      color: '#9CA3AF',
      opacity: 0.7,
      filter: 'grayscale(0.3)',
    };
  }

  const hoverStyle: React.CSSProperties = {
    transform: 'translateY(-4px)',
    boxShadow: isCurrent 
      ? '0 12px 32px -8px rgba(56,189,248,0.4), 0 15px 25px -5px rgba(0, 0, 0, 0.3)'
      : isCompleted
      ? '0 8px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 15px -3px rgba(0, 0, 0, 0.2)'
      : '0 8px 25px -5px rgba(42,42,42,0.3), 0 10px 15px -3px rgba(0, 0, 0, 0.2)',
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
    color: isCurrent ? '#FFFFFF' : isCompleted ? '#9CA3AF' : '#9CA3AF',
  };

  // Subtitle styles - more compact
  const subtitleStyle: React.CSSProperties = {
    fontSize: 'clamp(10px, 2vw, 12px)',
    fontWeight: 500,
    margin: '0 0 8px 0',
    textAlign: 'center',
    color: isCurrent ? '#E5E7EB' : isCompleted ? '#9CA3AF' : '#9CA3AF',
    opacity: 0.8,
  };

  // Description styles (shown only as preview) - more compact
  const descriptionStyle: React.CSSProperties = {
    fontSize: 'clamp(9px, 1.8vw, 10px)',
    lineHeight: 1.3,
    textAlign: 'center',
    color: isCurrent ? '#D1D5DB' : isCompleted ? '#9CA3AF' : '#9CA3AF',
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
      background: '#38BDF8',
      color: '#FFFFFF',
      borderColor: '#38BDF8',
      boxShadow: '0 2px 8px rgba(56,189,248,0.4)',
    };
  } else if (isCompleted) {
    badgeStyles = {
      background: '#10B981',
      color: '#FFFFFF',
      borderColor: '#10B981',
      boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
    };
  } else {
    badgeStyles = {
      background: '#6B7280',
      color: '#FFFFFF',
      borderColor: '#6B7280',
      boxShadow: '0 2px 8px rgba(107,114,128,0.3)',
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
