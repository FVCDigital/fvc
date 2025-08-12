export interface RoadmapStage {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  status: 'completed' | 'current' | 'future';
  details: string[];
  timeline: string;
  icon: string;
}

export interface RoadmapCardProps {
  stage: RoadmapStage;
}
