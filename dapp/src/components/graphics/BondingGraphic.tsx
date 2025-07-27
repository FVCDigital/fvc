import React from 'react';
import { Coins } from 'lucide-react';

const BondingGraphic: React.FC = () => (
  <span className="text-5xl text-sky-400 drop-shadow-[0_0_16px_#38bdf8] drop-shadow-[0_0_32px_#0ea5e9] inline-block">
    <Coins size={48} strokeWidth={2.5} className="text-sky-400" />
  </span>
);

export default BondingGraphic; 