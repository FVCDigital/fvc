import React, { useState, useRef } from 'react';
import RoadmapCard from './RoadmapCard';
import RoadmapModal from './RoadmapModal';
import { RoadmapStage } from './types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa6';

const RoadmapFlowchart: React.FC = () => {
  const [selectedStage, setSelectedStage] = useState<RoadmapStage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleCardClick = (stage: RoadmapStage) => {
    setSelectedStage(stage);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedStage(null);
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < roadmapStages.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
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
        'Testnet deployment on Polygon completed'
      ],
      timeline: 'Q3 2025',
      status: 'completed',
      icon: '🏗️',
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
      icon: '💰',
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
      icon: '🔓',
    },
  ];


  return (
    <div className="w-full h-full flex flex-col font-sans overflow-hidden">
      {/* Title */}
      <div className="text-center py-6 px-4 shrink-0">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 tracking-tight">Roadmap</h1>
        <p className="text-sm text-muted-foreground">Swipe to explore our journey</p>
      </div>

      {/* Card container with navigation */}
      <div className="relative flex-1 flex items-center justify-center w-full px-4 min-h-0">
        {/* Left button */}
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className={cn(
            "rounded-full h-10 w-10 mr-4 shrink-0 transition-all shadow-lg hidden md:flex",
            currentIndex === 0 ? "opacity-0 pointer-events-none" : "hover:scale-110 border-primary/20"
          )}
        >
          <FaChevronLeft className="h-4 w-4" />
        </Button>

        {/* Current card */}
        <div className="flex-1 max-w-[380px] w-full transform transition-all duration-300">
          <RoadmapCard 
            stage={roadmapStages[currentIndex]} 
            onClick={() => handleCardClick(roadmapStages[currentIndex])} 
          />
        </div>

        {/* Right button */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          disabled={currentIndex === roadmapStages.length - 1}
          className={cn(
            "rounded-full h-10 w-10 ml-4 shrink-0 transition-all shadow-lg hidden md:flex",
            currentIndex === roadmapStages.length - 1 ? "opacity-0 pointer-events-none" : "hover:scale-110 border-primary/20"
          )}
        >
          <FaChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Dots indicator */}
      <div className="flex justify-center gap-2 py-4 shrink-0">
        {roadmapStages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              currentIndex === index ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
            aria-label={`Go to stage ${index}`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="mx-4 mb-4 p-4 bg-card/50 backdrop-blur-sm rounded-xl border border-border max-w-xl md:mx-auto w-full shrink-0">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground text-center mb-3">Legend</h3>
        <div className="flex justify-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
            <span className="text-xs font-bold text-foreground">DONE</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-sm shadow-sky-500/50" />
            <span className="text-xs font-bold text-foreground">CURRENT</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground" />
            <span className="text-xs font-bold text-muted-foreground">FUTURE</span>
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
