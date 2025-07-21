import React from 'react';
import { theme } from '@/constants/theme';

interface CardProps {
  title: string;
  description: string;
  graphic?: React.ReactElement<any>;
  onClick?: () => void;
}

const cardStyle: React.CSSProperties = {
  aspectRatio: '1024 / 336',
  width: '100%',
  maxWidth: 520,
  minHeight: 200, // ensure enough space for icon on desktop
  borderRadius: 20,
  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  background: theme.modalBackground,
  padding: 0,
  margin: '0 auto 12px auto', // add bottom margin for spacing
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  cursor: 'pointer',
  border: 'none',
  outline: `1px solid ${theme.modalButton}`,
  transition: 'box-shadow 0.2s',
};

const contentRowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: 20,
  padding: '32px 40px 32px 40px',
  height: '100%',
};

const titleStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: 22,
  color: theme.primaryText,
  display: 'block',
  margin: 0,
};

const descStyle: React.CSSProperties = {
  fontSize: 16,
  color: theme.secondaryText,
  margin: 0,
  marginTop: 4,
};

// Responsive helper
function useResponsiveFlexDirection() {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

const Card: React.FC<CardProps> = ({ title, description, graphic, onClick }) => {
  return (
    <button type="button" style={{ ...cardStyle, minHeight: 120 }} onClick={onClick}>
      <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          ...contentRowStyle,
          flexDirection: 'row',
          alignItems: 'center',
          padding: '32px 24px',
          gap: 20,
          height: 'auto',
        }}>
          <div style={{ textAlign: 'left' }}>
            <div style={titleStyle}>{title}</div>
            <p style={descStyle}>{description}</p>
          </div>
          {graphic && onClick ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48 }}>
                {React.cloneElement(graphic, { style: { ...((graphic.props as any).style || {}), fontSize: 32 } })}
              </div>
              <div style={{ alignSelf: 'center', zIndex: 1 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="#9c9da1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
                  <path d="M6.47 11.47a.75.75 0 1 0 1.06 1.06l4-4a.75.75 0 0 0 .007-1.054l-3.903-4a.75.75 0 1 0-1.073 1.048l3.385 3.47L6.47 11.47Z"></path>
                </svg>
              </div>
            </div>
          ) : graphic ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48 }}>
              {React.cloneElement(graphic, { style: { ...((graphic.props as any).style || {}), fontSize: 32 } })}
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
};

export default Card;
// For migration: rename this file to BaseCard.tsx and move to components/cards/ 