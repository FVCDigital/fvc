import React from 'react';
import { FaLock } from 'react-icons/fa6';

const VotingComingSoonCard: React.FC = () => (
  <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center max-w-md w-full border border-gray-100">
    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-6">
      <FaLock className="text-blue-600" size={36} />
    </div>
    <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Governance Voting Coming Soon</h2>
    <p className="text-gray-500 text-center mb-2">Governance access will require KYC verification.</p>
  </div>
);

export default VotingComingSoonCard; 