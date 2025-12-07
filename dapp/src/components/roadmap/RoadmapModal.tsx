import React from 'react';
import { RoadmapStage } from './types';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FaXmark } from 'react-icons/fa6';

interface RoadmapModalProps {
  stage: RoadmapStage | null;
  isOpen: boolean;
  onClose: () => void;
}

const RoadmapModal: React.FC<RoadmapModalProps> = ({ stage, isOpen, onClose }) => {
  if (!isOpen || !stage) return null;

  const isCurrent = stage.status === 'current';
  const isCompleted = stage.status === 'completed';

  return (
    <div 
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className={cn(
          "relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl border shadow-2xl animate-in zoom-in-95 duration-200",
          isCurrent && "bg-card border-sky-500/50 shadow-sky-500/20",
          isCompleted && "bg-card border-emerald-500/50 shadow-emerald-500/20",
          !isCurrent && !isCompleted && "bg-card border-border shadow-black/40"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 h-8 w-8 rounded-full opacity-70 hover:opacity-100"
          onClick={onClose}
        >
          <FaXmark className="h-4 w-4" />
        </Button>

        <div className="p-8 text-center">
          <div className={cn(
            "text-5xl mb-6",
            isCurrent && "drop-shadow-lg"
          )}>
            {stage.icon}
          </div>
          
          <h2 className="text-2xl font-bold mb-2 text-foreground">
            {stage.title}
          </h2>
          <h3 className="text-lg text-muted-foreground font-medium mb-6">
            {stage.subtitle}
          </h3>

          <p className="text-base text-muted-foreground leading-relaxed mb-8">
            {stage.description}
          </p>

          <div className="text-left bg-muted/30 rounded-xl p-6 border border-border">
            <h4 className="text-sm font-bold uppercase tracking-wider mb-4 text-foreground">Key Details</h4>
            <ul className="space-y-3">
              {stage.details.map((detail, index) => (
                <li key={index} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className={cn(
                    "mt-1.5 h-1.5 w-1.5 rounded-full shrink-0",
                    isCurrent ? "bg-sky-500" : isCompleted ? "bg-emerald-500" : "bg-muted-foreground"
                  )} />
                  <span className="leading-relaxed">{detail}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={cn(
            "mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border",
            isCurrent && "bg-sky-500/10 text-sky-500 border-sky-500/20",
            isCompleted && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
            !isCurrent && !isCompleted && "bg-muted text-muted-foreground border-border"
          )}>
            <span>⏱️</span>
            Timeline: {stage.timeline}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoadmapModal;
