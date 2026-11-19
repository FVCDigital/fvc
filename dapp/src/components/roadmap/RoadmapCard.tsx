import React from 'react';
import { RoadmapStage } from './types';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

interface RoadmapCardProps {
  stage: RoadmapStage;
  onClick: () => void;
}

const RoadmapCard: React.FC<RoadmapCardProps> = ({ stage, onClick }) => {
  const isCurrent = stage.status === 'current';
  const isCompleted = stage.status === 'completed';
  const isFuture = stage.status === 'future';

  return (
    <Card 
      onClick={onClick}
      className={cn(
        "relative cursor-pointer transition-all duration-300 min-h-[140px] border w-full overflow-hidden group hover:-translate-y-1",
        isCurrent && "bg-brand/10 border-brand text-brand-soft shadow-[0_8px_25px_-5px_rgba(106,112,228,0.3)] animate-subtle-pulse",
        isCompleted && "bg-emerald-500/5 border-emerald-900/50 text-emerald-100 shadow-md hover:shadow-lg hover:shadow-emerald-900/20",
        isFuture && "bg-muted/40 border-border text-muted-foreground opacity-70 grayscale-[0.3] hover:opacity-100 hover:grayscale-0",
        "flex flex-col justify-between"
      )}
    >
      <CardContent className="p-4 flex-1 flex flex-col justify-center text-center">
        {/* Status Badge */}
        <div className={cn(
          "absolute top-3 right-3 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
          isCurrent && "bg-brand text-white border-brand shadow-sm",
          isCompleted && "bg-emerald-500 text-white border-emerald-500 shadow-sm",
          isFuture && "bg-muted text-muted-foreground border-border"
        )}>
          {isCurrent ? 'Current' : isCompleted ? 'Done' : 'Future'}
        </div>

        {/* Icon */}
        <div className={cn(
          "text-3xl mb-3 transition-transform duration-300 group-hover:scale-110",
          isCurrent && "drop-shadow-md"
        )}>
          {stage.icon}
        </div>

        {/* Title */}
        <h3 className={cn(
          "text-sm font-bold mb-1",
          isCurrent ? "text-white" : isCompleted ? "text-foreground" : "text-muted-foreground"
        )}>
          {stage.title}
        </h3>

        {/* Subtitle */}
        <h4 className={cn(
          "text-xs font-medium mb-3",
          isCurrent ? "text-brand-soft" : "text-muted-foreground"
        )}>
          {stage.subtitle}
        </h4>

        {/* Description Preview */}
        <p className={cn(
          "text-[10px] leading-relaxed line-clamp-2",
          isCurrent ? "text-brand-soft/80" : "text-muted-foreground/80"
        )}>
          {stage.description}
        </p>

        {/* Click indicator */}
        <div className={cn(
          "mt-3 text-[9px] font-medium uppercase tracking-widest opacity-0 transform translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0",
          isCurrent ? "text-brand-soft" : "text-muted-foreground"
        )}>
          View Details
        </div>
      </CardContent>
    </Card>
  );
};

export default RoadmapCard;
