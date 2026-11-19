import React from 'react';
import { Coins } from 'lucide-react';

const BondingGraphic: React.FC = () => (
  <span className="text-5xl text-brand-light drop-shadow-[0_0_16px_#6A70E4] drop-shadow-[0_0_32px_#5A60D4] inline-block">
    <Coins size={48} strokeWidth={2.5} className="text-brand-light" />
  </span>
);

export default BondingGraphic; 