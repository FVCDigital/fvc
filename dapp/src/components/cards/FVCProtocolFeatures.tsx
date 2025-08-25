import React from 'react';
import { theme } from '@/constants/theme';

export default function FVCProtocolFeatures(): React.JSX.Element {
  const containerStyle: React.CSSProperties = {
    background: theme.modalBackground,
    color: theme.primaryText,
    borderRadius: 16,
    padding: 32,
    fontWeight: 500,
    fontSize: 20,
    boxShadow: `0 4px 24px ${theme.accentGlow}`,
    margin: '16px auto',
    maxWidth: 800,
    width: '100%',
    border: `1px solid ${theme.darkBorder}`,
    boxSizing: 'border-box',
    fontFamily: 'Inter, sans-serif',
    transition: 'all 0.2s ease',
  };

  const headerStyle: React.CSSProperties = {
    textAlign: 'center',
    marginBottom: 32,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 32,
    fontWeight: 700,
    marginBottom: 16,
    color: theme.primaryText,
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: 18,
    color: theme.secondaryText,
    lineHeight: 1.6,
    marginBottom: 24,
  };

  const featuresGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 24,
    marginBottom: 32,
  };

  const featureCardStyle: React.CSSProperties = {
    background: theme.cardHover,
    padding: 24,
    borderRadius: 12,
    border: `1px solid ${theme.darkBorder}`,
    transition: 'all 0.2s ease',
  };

  const featureCardHoverStyle: React.CSSProperties = {
    ...featureCardStyle,
    border: `1px solid ${theme.modalButton}`,
    boxShadow: `0 8px 32px ${theme.accentGlow}`,
  };

  const featureIconStyle: React.CSSProperties = {
    fontSize: 32,
    marginBottom: 16,
  };

  const featureTitleStyle: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 12,
    color: theme.primaryText,
  };

  const featureDescriptionStyle: React.CSSProperties = {
    fontSize: 14,
    color: theme.secondaryText,
    lineHeight: 1.5,
  };

  const uniqueFeatures = [
    {
      icon: "🪙",
      title: "Gold-Backed Tokenomics",
      description: "FVC tokens backed by physical gold reserves with transparent audit reports and gold-to-token redemption mechanisms."
    },
    {
      icon: "🇬🇧",
      title: "UK Regulatory Compliance",
      description: "FCA registered entity with UK-based gold storage facilities, compliant with UK crypto regulations."
    },
    {
      icon: "🔗",
      title: "Hybrid Token Model",
      description: "Dual token ecosystem: $FVCG (fixed supply governance) and $FVC (dynamic supply utility) for maximum flexibility."
    },
    {
      icon: "🏪",
      title: "Real-World Integration",
      description: "Partnerships with gold jewelry businesses, physical gold delivery options, and traditional finance bridge."
    },
    {
      icon: "🔒",
      title: "Secure Gold Storage",
      description: "Professional gold storage facilities with insurance, regular audits, and transparent reporting."
    },
    {
      icon: "📊",
      title: "Transparent Operations",
      description: "Regular gold reserve reports, on-chain proof of reserves, and community governance oversight."
    }
  ];

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>What Makes FVC Unique?</h1>
        <p style={subtitleStyle}>
          FVC Protocol combines the best of DeFi innovation with real-world gold assets, 
          creating a bridge between traditional finance and the crypto ecosystem.
        </p>
      </div>

      {/* Features Grid */}
      <div style={featuresGridStyle}>
        {uniqueFeatures.map((feature, index) => (
          <div 
            key={index} 
            style={featureCardStyle}
            onMouseEnter={(e) => {
              e.currentTarget.style.border = `1px solid ${theme.modalButton}`;
              e.currentTarget.style.boxShadow = `0 8px 32px ${theme.accentGlow}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.border = `1px solid ${theme.darkBorder}`;
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={featureIconStyle}>{feature.icon}</div>
            <h3 style={featureTitleStyle}>{feature.title}</h3>
            <p style={featureDescriptionStyle}>{feature.description}</p>
          </div>
        ))}
      </div>

      {/* Call to Action */}
      <div style={{
        textAlign: 'center',
        padding: '24px',
        background: theme.cardHover,
        borderRadius: 12,
        border: `1px solid ${theme.darkBorder}`,
      }}>
        <div style={{
          fontSize: 18,
          fontWeight: 600,
          color: theme.primaryText,
          marginBottom: 12,
        }}>
          Ready to Join the Gold-Backed Revolution?
        </div>
        <div style={{
          fontSize: 14,
          color: theme.secondaryText,
          lineHeight: 1.5,
        }}>
          Participate in our private sale to get early access to FVC tokens and 
          be part of the future of gold-backed DeFi.
        </div>
      </div>
    </div>
  );
}
