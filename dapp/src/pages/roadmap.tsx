import React from 'react';
import { RoadmapFlowchart } from '../components/roadmap';

const RoadmapPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <RoadmapFlowchart />
    </div>
  );
};

export default RoadmapPage;
