import React from 'react';
import { theme } from '@/constants/theme';

interface FVCFeatureCardProps {
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  launchDate: string;
  icon?: string;
  accentColor?: string;
}

export default function FVCFeatureCard({ 
  title, 
  subtitle, 
  description, 
  features, 
  launchDate,
  icon = "🚀",
  accentColor = theme.modalButton
}: FVCFeatureCardProps): React.JSX.Element {
  const cardStyle: React.CSSProperties = {
    background: theme.modalBackground,
    color: theme.primaryText,
    borderRadius: 16,
    padding: 32,
    fontWeight: 500,
    fontSize: 20,
    boxShadow: `0 4px 24px ${theme.accentGlow}`,
    margin: '16px auto',
    maxWidth: 600,
    width: '100%',
    border: `1px solid ${theme.darkBorder}`,
    boxSizing: 'border-box',
    fontFamily: 'Inter, sans-serif',
    transition: 'all 0.2s ease',
  };

  const headerStyle: React.CSSProperties = {
    textAlign: 'center',
    marginBottom: 24,
  };

  const iconStyle: React.CSSProperties = {
    fontSize: 48,
    marginBottom: 16,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 8,
    color: theme.primaryText,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: 18,
    color: accentColor,
    fontWeight: 600,
    marginBottom: 12,
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: 16,
    color: theme.secondaryText,
    textAlign: 'center',
    lineHeight: 1.6,
    marginBottom: 24,
  };

  const featuresContainerStyle: React.CSSProperties = {
    marginBottom: 24,
  };

  const featureItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 12,
    fontSize: 14,
    color: theme.primaryText,
  };

  const featureBulletStyle: React.CSSProperties = {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: accentColor,
    marginRight: 12,
    flexShrink: 0,
  };

  const launchDateStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '16px 24px',
    background: theme.cardHover,
    borderRadius: 12,
    border: `1px solid ${theme.darkBorder}`,
  };

  const launchDateTextStyle: React.CSSProperties = {
    fontSize: 14,
    color: theme.secondaryText,
    marginBottom: 4,
  };

  const launchDateValueStyle: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 600,
    color: accentColor,
  };

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={iconStyle}>{icon}</div>
        <h1 style={titleStyle}>{title}</h1>
        <h2 style={subtitleStyle}>{subtitle}</h2>
        <p style={descriptionStyle}>{description}</p>
      </div>

      {/* Features */}
      <div style={featuresContainerStyle}>
        {features.map((feature, index) => (
          <div key={index} style={featureItemStyle}>
            <div style={featureBulletStyle} />
            <span>{feature}</span>
          </div>
        ))}
      </div>

      {/* Launch Date */}
      <div style={launchDateStyle}>
        <div style={launchDateTextStyle}>Launch Date</div>
        <div style={launchDateValueStyle}>{launchDate}</div>
      </div>
    </div>
  );
}
