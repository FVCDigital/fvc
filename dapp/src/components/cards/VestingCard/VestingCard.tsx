import React from 'react';
import { cn } from '@/utils';

export interface VestingSchedule {
  id: string;
  totalAmount: string;
  releasedAmount: string;
  startTime: number;
  cliffTime: number;
  endTime: number;
  progress: number;
  isCliffPassed: boolean;
  releasableAmount: string;
}

interface VestingCardProps {
  schedule: VestingSchedule;
  onRelease: (id: string) => void;
  className?: string;
}

export const VestingCard: React.FC<VestingCardProps> = ({
  schedule,
  onRelease,
  className
}) => {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M FVC`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(2)}K FVC`;
    }
    return `${num.toFixed(2)} FVC`;
  };

  return (
    <div className={cn(
      "bg-white rounded-2xl shadow-lg border border-gray-100",
      "p-6 hover:shadow-xl transition-all duration-300",
      "transform hover:-translate-y-1",
      className
    )}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Vesting Schedule #{schedule.id}
          </h3>
          <p className="text-sm text-gray-500">
            Created {formatDate(schedule.startTime)}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">
            {formatAmount(schedule.totalAmount)}
          </div>
          <div className="text-sm text-gray-500">Total Allocation</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>{schedule.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${schedule.progress}%` }}
          />
        </div>
      </div>

      {/* Schedule Details */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <div className="text-sm text-gray-500">Cliff Date</div>
          <div className="font-medium text-gray-900">
            {formatDate(schedule.cliffTime)}
          </div>
          <div className="text-xs text-gray-400">
            {schedule.isCliffPassed ? '✅ Passed' : '⏳ Pending'}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-500">End Date</div>
          <div className="font-medium text-gray-900">
            {formatDate(schedule.endTime)}
          </div>
        </div>
      </div>

      {/* Token Status */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500">Released</div>
            <div className="font-semibold text-green-600">
              {formatAmount(schedule.releasedAmount)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Available Now</div>
            <div className="font-semibold text-blue-600">
              {formatAmount(schedule.releasableAmount)}
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={() => onRelease(schedule.id)}
        disabled={parseFloat(schedule.releasableAmount) === 0}
        className={cn(
          "w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          parseFloat(schedule.releasableAmount) > 0
            ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 transform hover:scale-105"
            : "bg-gray-200 text-gray-500 cursor-not-allowed"
        )}
      >
        {parseFloat(schedule.releasableAmount) > 0 
          ? `Release ${formatAmount(schedule.releasableAmount)}`
          : 'No tokens available'
        }
      </button>
    </div>
  );
};
