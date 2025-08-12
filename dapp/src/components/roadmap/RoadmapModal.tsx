import React from 'react';
import { RoadmapStage } from './types';
import { theme } from '@/constants/theme';

interface RoadmapModalProps {
  stage: RoadmapStage | null;
  isOpen: boolean;
  onClose: () => void;
}

const RoadmapModal: React.FC<RoadmapModalProps> = ({ stage, isOpen, onClose }) => {
  if (!isOpen || !stage) return null;

  const isCurrent = stage.status === 'current';
  const isCompleted = stage.status === 'completed';
  const isFuture = stage.status === 'future';

  // Check screen size for responsive behavior
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const isNarrowScreen = typeof window !== 'undefined' && window.innerWidth < 1024;
  const sidebarWidth = 280;

  const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: isNarrowScreen && !isMobile ? `${sidebarWidth}px` : '0',
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: isMobile ? '16px' : '20px',
    boxSizing: 'border-box',
  };

  // Modal styling to match roadmap cards
  let modalBackground = '';
  let modalBorderColor = '';
  let textColor = '';
  let secondaryTextColor = '';

  if (isCurrent) {
    modalBackground = 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.95) 100%)';
    modalBorderColor = 'rgba(255, 255, 255, 0.8)';
    textColor = theme.background;
    secondaryTextColor = theme.background;
  } else if (isCompleted) {
    modalBackground = 'linear-gradient(135deg, rgba(243, 244, 246, 0.98) 0%, rgba(229, 231, 235, 0.95) 100%)';
    modalBorderColor = 'rgba(243, 244, 246, 0.8)';
    textColor = '#374151';
    secondaryTextColor = '#6B7280';
  } else {
    modalBackground = 'linear-gradient(135deg, rgba(107, 114, 128, 0.25) 0%, rgba(75, 85, 99, 0.2) 100%)';
    modalBorderColor = 'rgba(107, 114, 128, 0.3)';
    textColor = '#9CA3AF';
    secondaryTextColor = '#9CA3AF';
  }

  const modalStyle: React.CSSProperties = {
    background: modalBackground,
    border: `1px solid ${modalBorderColor}`,
    borderRadius: isMobile ? '12px' : '16px',
    padding: isMobile ? '20px' : isNarrowScreen ? '24px' : '32px',
    maxWidth: isMobile ? '90vw' : isNarrowScreen ? '400px' : '500px',
    width: '100%',
    maxHeight: isMobile ? '85vh' : '80vh',
    overflow: 'auto',
    position: 'relative',
    boxShadow: isCurrent 
      ? '0 20px 60px rgba(255, 255, 255, 0.2), 0 8px 25px rgba(0, 0, 0, 0.15)'
      : isCompleted
      ? '0 20px 60px rgba(0, 0, 0, 0.1), 0 8px 25px rgba(0, 0, 0, 0.1)'
      : '0 20px 60px rgba(107, 114, 128, 0.1), 0 8px 25px rgba(0, 0, 0, 0.1)',
    backdropFilter: 'blur(10px)',
    fontFamily: 'Inter, sans-serif',
    boxSizing: 'border-box',
    // Maintain aspect ratio on mobile
    minHeight: isMobile ? '300px' : 'auto',
  };

  const closeButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'none',
    border: 'none',
    color: secondaryTextColor,
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    transition: 'all 0.2s ease',
    opacity: 0.7,
  };



  const headerStyle: React.CSSProperties = {
    textAlign: 'center',
    marginBottom: '28px',
  };

  const iconStyle: React.CSSProperties = {
    fontSize: '48px',
    textAlign: 'center',
    marginBottom: '16px',
    filter: isCurrent ? 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))' : 'none',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: 700,
    color: textColor,
    margin: 0,
    marginBottom: '8px',
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '18px',
    color: secondaryTextColor,
    margin: 0,
    marginBottom: '16px',
    opacity: 0.9,
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: '16px',
    color: secondaryTextColor,
    margin: 0,
    marginBottom: '28px',
    lineHeight: 1.5,
    opacity: 0.8,
  };

  const detailsTitleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 600,
    color: textColor,
    margin: 0,
    marginBottom: '16px',
  };

  const detailsListStyle: React.CSSProperties = {
    margin: 0,
    padding: 0,
    listStyle: 'none',
    marginBottom: '24px',
  };

  const detailItemStyle: React.CSSProperties = {
    fontSize: '14px',
    color: secondaryTextColor,
    margin: 0,
    marginBottom: '12px',
    lineHeight: 1.4,
    display: 'flex',
    alignItems: 'flex-start',
    opacity: 0.9,
  };

  const timelineStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '12px 20px',
    borderRadius: '12px',
    border: '1px solid',
    fontSize: '14px',
    fontWeight: 600,
    marginTop: '24px',
  };

  // Timeline styling based on status
  let timelineStatusStyles: React.CSSProperties = {};
  if (isCurrent) {
    timelineStatusStyles = {
      background: `rgba(59, 130, 246, 0.1)`,
      color: theme.accent,
      borderColor: `rgba(59, 130, 246, 0.3)`,
    };
  } else if (isCompleted) {
    timelineStatusStyles = {
      background: `rgba(34, 197, 94, 0.1)`,
      color: '#22C55E',
      borderColor: `rgba(34, 197, 94, 0.3)`,
    };
  } else {
    timelineStatusStyles = {
      background: `rgba(107, 114, 128, 0.1)`,
      color: '#6B7280',
      borderColor: `rgba(107, 114, 128, 0.3)`,
    };
  }

  const getBulletColor = () => {
    if (isCurrent) return theme.accent;
    if (isCompleted) return '#22C55E';
    return '#6B7280';
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button 
          style={closeButtonStyle} 
          onClick={onClose}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
        >
          ✕
        </button>

        {/* Header */}
        <div style={headerStyle}>
          <div style={iconStyle}>
            {stage.icon}
          </div>
          <h2 style={titleStyle}>
            {stage.title}
          </h2>
          <h3 style={subtitleStyle}>
            {stage.subtitle}
          </h3>
        </div>

        {/* Description */}
        <p style={descriptionStyle}>
          {stage.description}
        </p>

        {/* Details */}
        <div>
          <h4 style={detailsTitleStyle}>Key Details:</h4>
          <ul style={detailsListStyle}>
            {stage.details.map((detail, index) => (
              <li key={index} style={detailItemStyle}>
                <span style={{ 
                  marginRight: '12px', 
                  marginTop: '2px',
                  color: getBulletColor(),
                  fontSize: '16px',
                  fontWeight: 'bold',
                }}>
                  •
                </span>
                {detail}
              </li>
            ))}
          </ul>
        </div>

        {/* Timeline */}
        <div style={{...timelineStyle, ...timelineStatusStyles}}>
          ⏱️ Timeline: {stage.timeline}
        </div>
      </div>
    </div>
  );
};

export default RoadmapModal;