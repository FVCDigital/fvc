import React from 'react';
import { Gem } from 'lucide-react';

const StakingGraphic: React.FC = () => (
  <span style={{
    fontSize: 48,
    filter: 'drop-shadow(0 0 16px #a21caf) drop-shadow(0 0 32px #38bdf8)',
    color: '#a21caf',
    display: 'inline-block',
  }}>
    <Gem size={48} strokeWidth={2.5} color="#a21caf" />
  </span>
);

export default StakingGraphic; 