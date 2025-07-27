import React from 'react';
import VotingComingSoonCard from '@/components/cards/VotingComingSoonCard';

const VotingScreen: React.FC = () => (
  <div className="min-h-screen flex flex-col bg-gray-50">
    <header className="w-full flex items-center justify-between px-8 py-4 border-b border-gray-200 bg-white">
      <div className="text-xl font-bold tracking-tight text-blue-700">FVC Protocol</div>
    </header>
    <main className="flex-1 flex items-center justify-center">
      <VotingComingSoonCard />
    </main>
  </div>
);

export default VotingScreen; 