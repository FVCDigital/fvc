import React, { useState } from 'react';
import RoadmapCard from './RoadmapCard';
import RoadmapModal from './RoadmapModal';
import { RoadmapStage } from './types';
import { theme } from '@/constants/theme';

const RoadmapFlowchart: React.FC = () => {
  const [selectedStage, setSelectedStage] = useState<RoadmapStage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCardClick = (stage: RoadmapStage) => {
    setSelectedStage(stage);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedStage(null);
  };

  const roadmapStages: RoadmapStage[] = [
    {
      id: 0,
      title: 'Stage 0',
      subtitle: 'Smart Contract Foundation',
      description: 'Core smart contract architecture, bonding system, and frontend foundation have been completed and deployed to testnet.',
      details: [
        'FVC token contract deployed with vesting integration',
        'Bonding contract with multi-round system operational',
        'Frontend application with atomic components built',
        'Testnet deployment on Polygon Amoy completed'
      ],
      timeline: 'Q3 2025',
      status: 'completed',
      icon: '🏗️'
    },
    {
      id: 1,
      title: 'Stage 1',
      subtitle: 'Fundraising & Audit',
      description: 'Initial fundraising round to secure professional audit and establish protocol foundation. This stage focuses on building trust and ensuring security through comprehensive auditing.',
      details: [
        'Raise funds for professional smart contract audit',
        'Deploy contracts to Polygon mainnet',
        'Complete security verification and testing',
        'Establish initial community and partnerships'
      ],
      timeline: 'Q4 2025',
      status: 'current',
      icon: '💰'
    },
    {
      id: 2,
      title: 'Stage 2',
      subtitle: 'Vesting Unlock & Liquidity',
      description: 'FVC tokens from Round 0 bonding become unlocked and tradeable. Users can now participate in governance and trade on both DEXs and CEXs.',
      details: [
        'FVC vesting periods complete for Round 0 participants',
        'Liquidity pools established on major DEXs',
        'FVC becomes tradeable on centralised exchanges (CEXs)',
        'Initial market price discovery and trading begins on both DEXs and CEXs'
      ],
      timeline: 'Q1 2026',
      status: 'future',
      icon: '🔓'
    },
    {
      id: 3,
      title: 'Stage 3',
      subtitle: 'Governance & Community',
      description: 'Launch of decentralised governance system allowing FVC holders to participate in protocol decisions and community building.',
      details: [
        'Deploy governance contracts and voting system',
        'Establish community governance framework',
        'First governance proposals and voting rounds',
        'Community treasury and funding mechanisms'
      ],
      timeline: 'Q2 2026',
      status: 'future',
      icon: '🗳️'
    },
    {
      id: 4,
      title: 'Stage 4',
      subtitle: 'SME Launch & Operations',
      description: 'Launch of the first Small and Medium Enterprise (SME) partnerships and operational protocols for real-world business integration.',
      details: [
        'Partner with first SME businesses',
        'Implement operational protocols and workflows',
        'Establish revenue sharing mechanisms',
        'Scale operations and business development'
      ],
      timeline: 'Q3 2026',
      status: 'future',
      icon: '🏢'
    },
    {
      id: 5,
      title: 'Stage 5',
      subtitle: 'Staking & Rewards',
      description: 'Implementation of staking mechanisms allowing FVC holders to earn rewards and participate in protocol growth.',
      details: [
        'Deploy staking contracts and reward systems',
        'Establish staking pools and APY mechanisms',
        'Launch liquidity mining programs',
        'Implement reward distribution algorithms'
      ],
      timeline: 'Q4 2026',
      status: 'future',
      icon: '🎯'
    },
    {
      id: 6,
      title: 'Stage 6',
      subtitle: 'Scaling & Expansion',
      description: 'Protocol expansion to multiple chains, additional business partnerships, and advanced features for enterprise adoption.',
      details: [
        'Multi-chain deployment and cross-chain bridges',
        'Advanced enterprise features and APIs',
        'International expansion and partnerships',
        'Protocol optimization and performance improvements'
      ],
      timeline: 'Q1 2027',
      status: 'future',
      icon: '🚀'
    }
  ];

  // Responsive container styles - prevent overflow like dashboard
  const containerStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '16px',
    fontFamily: 'Inter, sans-serif',
    boxSizing: 'border-box',
    overflow: 'hidden', // Prevent horizontal overflow
  };

  const titleStyle: React.CSSProperties = {
    textAlign: 'center',
    marginBottom: '32px',
  };

  const mainTitleStyle: React.CSSProperties = {
    fontSize: 'clamp(20px, 4vw, 28px)',
    fontWeight: 700,
    color: theme.primaryText,
    margin: 0,
    marginBottom: '12px',
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: 'clamp(12px, 2.5vw, 16px)',
    color: theme.secondaryText,
    margin: 0,
  };

  // Timeline container - more compact
  const timelineStyle: React.CSSProperties = {
    position: 'relative',
    padding: '24px 0',
  };

  // Clean timeline line - subtle and minimal
  const timelineLineStyle: React.CSSProperties = {
    position: 'absolute',
    left: '50%',
    top: '60px',
    bottom: '60px',
    width: '1px',
    background: `linear-gradient(to bottom, transparent, ${theme.modalButton}, transparent)`,
    transform: 'translateX(-50%)',
    zIndex: 1,
    opacity: 0.3,
  };

  const cardsContainerStyle: React.CSSProperties = {
    position: 'relative',
    zIndex: 2,
  };

  // Simple card wrapper - single column for all screen sizes
  const getCardWrapperStyle = (): React.CSSProperties => {
    return {
      position: 'relative',
      marginBottom: '32px',
      display: 'flex',
      justifyContent: 'center',
      width: '100%',
      boxSizing: 'border-box',
      overflow: 'hidden',
    };
  };



  return (
    <div style={containerStyle}>
      {/* Title */}
      <div style={titleStyle}>
        <h1 style={mainTitleStyle}>Roadmap</h1>
        <p style={subtitleStyle}>Our journey to build the future of decentralised finance</p>
      </div>

      {/* Timeline */}
      <div style={timelineStyle}>
        {/* Clean timeline line */}
        <div style={timelineLineStyle} />
        
        <div style={cardsContainerStyle}>
          {roadmapStages.map((stage, index) => (
            <div key={stage.id} style={getCardWrapperStyle()}>
              {/* Card */}
              <div style={{ 
                width: '100%',
                maxWidth: '400px',
                boxSizing: 'border-box',
              }}>
                <RoadmapCard 
                  stage={stage} 
                  onClick={() => handleCardClick(stage)} 
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{
        marginTop: '40px',
        padding: '20px',
        background: theme.modalBackground,
        borderRadius: '12px',
        border: `1px solid ${theme.darkBorder}`,
        textAlign: 'center',
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: 600,
          color: theme.primaryText,
          margin: '0 0 16px 0',
        }}>Legend</h3>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 'clamp(16px, 4vw, 32px)',
          flexWrap: 'wrap',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#10B981',
            }} />
            <span style={{
              fontSize: 'clamp(12px, 2.5vw, 14px)',
              color: theme.primaryText,
              fontWeight: 500,
            }}>DONE</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#38BDF8',
            }} />
            <span style={{
              fontSize: 'clamp(12px, 2.5vw, 14px)',
              color: theme.primaryText,
              fontWeight: 500,
            }}>CURRENT</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#6B7280',
            }} />
            <span style={{
              fontSize: 'clamp(12px, 2.5vw, 14px)',
              color: theme.primaryText,
              fontWeight: 500,
            }}>FUTURE</span>
          </div>
        </div>
      </div>

      {/* Modal */}
      {selectedStage && (
        <RoadmapModal
          stage={selectedStage}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}


    </div>
  );
};

export default RoadmapFlowchart;